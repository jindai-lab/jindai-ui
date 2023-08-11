import Vue from "vue";
import api from "../api";
import dialogs from "../dialogs";
import i18n from "../locales";
import { customAlphabet } from 'nanoid'

const tempgroup = customAlphabet('1234567890abcdef', 10)
const shortcut_choices = []
const plugin_pages = []
const languages = {}
const pipelines = {}

const apicalls = {

  plugin_pages,
  languages,
  pipelines,

  // data helpers
  match_shortcuts(search, vm) {
    let value = vm.new_value;
    return new Promise((accept) => {
      if (!search) accept([]);
      var matched = shortcut_choices.filter((x) =>
        x.text.startsWith(search)
      );
      if (matched.length > 0 && matched[0].text.startsWith(search + " ")) {
        if (!value.includes(matched[0])) value.push(matched[0]);
        if (matched.length == 1) vm.typing = "";
        else vm.typing = search;
      }
      accept(matched);
    });
  },

  get_choices(lang_or_dataset) {
    return api.call(lang_or_dataset.toLowerCase() + "s/").then(
      (data) => data.results.map((x) => ({
        text: x.display_name || x.name,
        value: lang_or_dataset == "TASK" ? x._id : x.name,
      }))
    );
  },

  get_task_shortcuts() {
    return api
      .call("tasks/shortcuts")
      .then((data) => data.results);
  },

  // paragraph/mediaitem operations
  tag(options) {
    const { selection, val: tags, append } = options
    var existing_tags = new Set(
      selection.paragraphs.reduce((a, tags) => a.concat(tags.keywords), [])
    );
    var push = append ? tags : tags.filter((x) => !existing_tags.has(x)),
      pull = append
        ? []
        : Array.from(existing_tags).filter((x) => !tags.includes(x));
    var updates = {
      ids: selection.ids,
      keywords: { $push: push, $pull: pull },
    };
    var new_author = push.filter((x) => x.startsWith("@"))[0];
    if (new_author)
      updates.author = new_author;
    else if (pull.filter((x) => x.startsWith("@"))) updates.author = "";
    if (updates.author === '') delete updates.author;

    return api
      .call(
        `collections/`,
        { ...updates, mongocollection: selection.first.mongocollection || "paragraph" }
      )
      .then((data) => {
        selection.all.forEach((p) => {
          data[p._id] &&
            Object.assign(p, data[p._id], { images: p.images });
        });
      });
  },

  delete(options) {
    const { selection } = options
    var objs = selection.to_objects();
    return api
      .call("collections/remove_image", objs.para_items)
      .then(() => {
        selection.all.forEach((paragraph) => {
          if (objs.visible_para_items[paragraph._id]) {
            paragraph.images = paragraph.images.filter(i => !objs.visible_para_items[paragraph._id].includes(i._id))
            paragraph.src = api.get_paragraph_image(paragraph)
          }
        });
      });
  },

  rating(options) {
    const { selection, ...rating } = options
    rating.ids = selection.items.map((x) => x._id);
    if (api.config.view_mode == "gallery") {
      return api.call("mediaitems/rating", rating).then((data) => {
        selection.all.forEach((p) =>
          p.images && p.images.forEach(
            (i) =>
              typeof data[i._id] !== "undefined" && (i.rating = data[i._id].rating)
          )
        );
      });
    } else {
      return Promise.all(selection.paragraphs.map((x) => api.fav(x)));
    }
  },

  group(options) {
    const { selection, del, advanced } = options
    var bundle = {
      ids: selection.ids,
      ungroup: del,
      mongocollection: selection.first.mongocollection || "paragraph"
    };

    const _call = () => {
      return api
        .call(
          `collections/group`,
          bundle
        )
        .then((data) => {
          selection.all.forEach(
            (p) =>
              data[p._id] ?
                (p.keywords = data[p._id].keywords) : void (0)
          );
        });
    };

    const existing_groups = new Set(selection.paragraphs.map(
      p => p.keywords.filter(x => x.startsWith('#'))).reduce(
        (prev, current) => prev.concat(current)))

    if (
      !del && (advanced || existing_groups.length > 1)
    ) {
      var choices = Array.from(new Set([
        ...api.guess_groups(api.current_q()),
        ...api.guess_groups(selection.paragraphs),
      ])).sort();
      return dialogs
        .prompt({
          title: i18n.t("group"),
          choices,
          initial: choices[0] || "",
        })
        .then((group) => {
          bundle.group = (group || []).map((x) => x.replace(/^#/, ""));
          return _call();
        })
        .catch(() => {
          bundle.group = '';
          return _call();
        });
    } else {
      bundle.group = (Array.from(existing_groups)[0] || '').replace(/^#/, '')
      return _call();
    }
  },

  merge({ selection }) {

    var objs = selection.to_objects()
    if (!selection || !selection.length) return;
    return api
      .call(`collections/merge`, {
        ... objs.para_items,
        mongocollection: selection.first.mongocollection || "paragraph"
      })
  },

  split({ selection }) {
    var objs = selection.to_objects()
    return api
      .call(`collections/split`, {
        ... objs.para_items,
        mongocollection: selection.first.mongocollection || "paragraph"
      })
  },

  reset_storage({ selection }) {
    return api
      .call("mediaitems/reset_storage", {
        ids: selection.items.map((x) => x._id),
      })
  },

  interactive_tagging({ selection }) {
    var existing_tags = new Set(
      selection.paragraphs.reduce((a, tags) => a.concat(tags.keywords), [])
    );
    return dialogs
      .prompt({
        title: i18n.t("tagging"),
        value: Array.from(existing_tags),
        matcher: (search, vm) => { // search tag
          let value = vm.new_value;
          return new Promise((accept) => {
            if (vm.cancel) vm.cancel.cancel();
            if (search.length == 0 || search == "#" || search == "@") return [];
            vm.cancel = api.cancel_source();
            api
              .call(
                "term/keywords",
                {
                  pattern: api.escape_regex(search),
                  regex: true,
                },
                vm.cancel
              )
              .then((data) => {
                vm.cancel = null;
                data = data.results || [];
                var choices = value
                  .map((x) => ({
                    text: x,
                    value: x,
                  }))
                  .concat(
                    data.map((x) => ({
                      text: x.term,
                      value: x.term,
                    }))
                  );
                accept(choices);
              })
              .catch((err) => {
                vm.cancel = null;
                console.log(err);
              });
          });
        } // end of search tag
      })
      .then((tags) => {
        this.tag({ selection, val: tags, append: false });
      });
  },

  author({ selection }) {
    var authors = new Set(
      selection.paragraphs
        .reduce((a, tags) => a.concat(tags.keywords), [])
    ),
      author = selection.first.author;
    return dialogs
      .prompt({
        title: i18n.t("author"),
        value: author ? [author] : [],
        choices: Array.from(authors).sort(),
        limit: 1,
        allow_custom: true,
        initial: authors[0] || author || "",
      })
      .then((authors) => {
        const author = authors[0]

        return api
          .call(`collections/`, {
            ids: selection.ids,
            author,
            mongocollection: selection.first.mongocollection || "paragraph",
            keywords: { $push: [author] }
          })
          .then((data) => {
            selection.all.forEach((p) => {
              data[p._id] && (p.author = data[p._id].author);
            });
            return data
          });
      });
  },

  short_tagging(options) {
    const { selection, initial } = options
    return dialogs
      .prompt({
        title: i18n.t("tagging"),
        choices: shortcut_choices,
        matcher: this.match_shortcuts,
        allow_custom: false,
        initial,
      })
      .then((tags) => this.tag({ val: tags, append: true, selection }));
  },

  batch_tagging(options) {
    const { selection } = options
    return dialogs
      .batch_tagging(api.config.tagging || {})
      .then((tags) => this.tag({ selection, val: tags, append: true }));
  },

  edit_paragraph(target) {
    return api
      .call(
        `collections/${target.mongocollection || "paragraph"}:${target._id}`,
        target
      )
  },

  edit_paragraph_pagenum(mongocollection, paragraph_id, pagenum_bundle) {
    return api.call(`collections/pagenum`, { ...pagenum_bundle, id: `${mongocollection || "paragraph"}:${paragraph_id}` })
  },

  send_task(options) {
    return dialogs.send_task(options);
  },

  open_window({ selection, formatter }) {
    let url = formatter({ selection })
    api.open_window(url, '_blank')
    return new Promise(accept => accept())
  },

  info_dialog({ selection }) {
    return dialogs.info({ target: selection.first })
  },

  search(params, count, cancel_source) {
    if (count)
      params = Object.assign({ count: true }, params, cancel_source)
    return api.call('search', params)
  },

  // quicktask
  quicktask(task_obj) {
    return api.call('quicktask', task_obj).then(data => {
      if (
        typeof data === "object" &&
        data !== null &&
        data.__file_ext__
      ) {
        const b64toBlob = (b64Data, contentType = "", sliceSize = 512) => {
          const byteCharacters = atob(b64Data);
          const byteArrays = [];

          for (
            let offset = 0;
            offset < byteCharacters.length;
            offset += sliceSize
          ) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }

          const blob = new Blob(byteArrays, { type: contentType });
          return blob;
        };
        api.blob_download(
          b64toBlob(data.data),
          `${tempgroup()}.${data.__file_ext__}`
        );
        data = null;
      }
      return data
    })
  },

  qx(query) {
    const _replaceHook = {
      addFields(params) {
        var [field, value] = Object.entries(params)[0]
        return [
          'FieldAssignment', {
            field, value: api.querify(value).replace(/^\((.*)\)$/, '$1')
          }
        ]
      }
    };

    function _replaceFC(pipeline) {
      return pipeline.map(x => {
        var [stage, params] = Object.entries(x)[0]
        if (stage.startsWith('$_FC')) {
          switch (stage.substring(4)) {
            case "Conditional":
              return ['Condition', {
                cond: api.querify(params.cond).replace(/^\((.*)\)$/, '$1'),
                iffalse: _replaceFC(params.if_false),
                iftrue: _replaceFC(params.if_true)
              }]
            case "Repeat":
              var repeat_cond = api.querify(params.cond).replace(/^\((.*)\)$/, '$1'), repeat_times = 0;
              if (params.cond.$lt && params.cond.$lt[0] == '$$itercounter') {
                repeat_times = params.cond.$lt[1]
                repeat_cond = ''
              }
              return ['RepeatWhile', {
                cond: repeat_cond,
                times: repeat_times,
                pipeline: _replaceFC(params.pipeline)
              }]
            case "ForEach":
              return ['ForEach', {
                as_name: params.as,
                input_value: api.querify(params.input).replace(/^\((.*)\)$/, '$1'),
                pipeline: _replaceFC(params.pipeline)
              }]
            case "Break":
            case "Continue":
            case "Halt":
            case "Return":
              throw new Error(`Cannot use "${stage.substring(4).toLowerCase()}" here.`)
            default:
              throw new Error(`Unknown flow control: "${stage.substring(4)}".`)
          }
        } else if (_replaceHook[stage.substring(1)]) {
          return _replaceHook[stage.substring(1)](params)
        } else if (params.pipeline) {
          params.pipeline = _replaceFC(params.pipeline)
        } else {
          return [stage.substring(1), params]
        }
      })
    }
    return api.call('qx', { query }).then(data => {
      return _replaceFC(data)
    })
  },

  // crud opertaions
  _crud_handlers(namespace, options = {}) {
    namespace = namespace.replace(/\/$/, '') + '/'
    const key = Object.keys(options)[0]
    if (!key)
      return api.call(namespace).then(data => data.results)
    const val = options[key]
    switch (key) {
      case 'deletion':
        return api.delete(`${namespace}${val._id || val}`)
      case 'creation':
        return api.put(namespace, val)
      case 'update':
        if (val._id) // update single object
          return api.call(`${namespace}${val._id}`, val)
        else // update batch objects
          return api.call(namespace, val)
      case 'id':
        return api.call(`${namespace}${val}`)
      default:
        return api.call(`${namespace}${key}`, val)
    }
  },

  history(options) {
    return this._crud_handlers('history', options)
  },

  autotags(options) {
    return this._crud_handlers('plugins/autotags', options)
  },

  tasks(options = {}) {
    return this._crud_handlers('tasks', options)
  },

  datasets(options = {}) {
    return this._crud_handlers('datasets', options)
  },

  get_datasets() {
    function _segs(x) {
      var r = [],
        s = "";
      for (var seg of x.name.split("--")) {
        s += seg;
        r.push(s);
        s += "--";
      }
      return r;
    }

    return this.datasets().then((data) => {
      var weights = {},
        colls = data.sort((x) => x.order_weight);
      for (var c of colls) {
        for (var s of _segs(c))
          if (!weights[s]) weights[s] = c.order_weight;
      }

      function _comp(x, y) {
        var s1 = _segs(x),
          s2 = _segs(y);
        for (var si = 0; si < s1.length && si < s2.length; ++si) {
          let xx = s1[si],
            yy = s2[si];
          if (weights[xx] !== weights[yy]) return weights[xx] - weights[yy];
        }
        return x.name.localeCompare(y.name);
      }

      return colls.sort(_comp);
    });
  },

  get_datasets_hierarchy() {
    return this.get_datasets().then((data) => {
      var bundles = {};

      function Node(id, label, tags) {
        this.id = id
        this.label = label
        this.tags = Array.isArray(tags) ? tags.join(', ') : (tags || '')
        this.children = []

        this.append = function (node, bundle) {
          this.children.push(node)
          bundles[node.id] = bundle
        }

        this.get = function (id, label, bundle) {
          for (var child of this.children)
            if (child.id == id)
              return child
          const created = new Node(id, label || '')
          this.append(created, bundle)
          return created
        }
      }

      const hierarchy = new Node("ROOT", "")
      const tagsNode = new Node("Tags", "Tags");

      data.map((x) => {
        x.segments = (x.display_name || x.name).split("--");
        x.level = x.segments.length;

        for (var tag of (x.tags || [])) {
          var tagNode = tagsNode.get(`Tags--${tag}`, tag, {
            name: tag,
            tags: [],
            mongocollection: new Set(),
            dataset_name: new Set()
          })
          bundles[tagNode.id].mongocollection.add(x.mongocollection)
          bundles[tagNode.id].dataset_name.add(x.name)
          tagNode.append(new Node(`Tags--${tag}--${x.name}`, x.name, []), {
            name: x.name,
            tags: [],
            mongocollection: x.mongocollection,
            dataset_name: x.name
          })
        }

        var parent_obj = hierarchy;
        for (
          var i = 0, segs = x.segments[0]; i < x.level; i++, segs += "--" + x.segments[i]
        ) {
          var cand = parent_obj.get(segs, x.segments[i], {
            name: segs,
            tags: [],
            dataset_name: x.name,
            mongocollection: x.mongocollection
          })
          cand.tags = ((i == x.level - 1 ? x.tags : []) || []).join(', ')
          parent_obj = cand;
        }
      });

      return {
        hierarchy: hierarchy.children,
        tags: tagsNode.children,
        bundles: bundles,
      };
    });
  },

  // queue logic
  queue_logs(id) {
    return api.call(`queue/logs/${encodeURIComponent(id)}`).then(data => data.map(x => ({ text: x })))
  },

  queue_results({ offset, limit, id } = {}) {
    return api.call(`queue/${encodeURIComponent(id)}?offset=${offset}&limit=${limit}`)
  },

  enqueue(task_id) {
    return api.put('queue/', { id: task_id })
  },

  dequeue(key) {
    return api.delete(`queue/${encodeURIComponent(key)}`)
  },

  // storage
  storage(selected_dir, operation) {
    return api.call(`storage/${selected_dir}`, operation)
  },

  install_plugin(url) {
    return api.call("plugins", { url })
  },

  // misc handlers
  remote_json(json_path) {
    return api.call(`image?file=${json_path}`)
  },

  plugin_shortcuts({ key, value, apply } = {}) {
    if (key) return api.call('plugins/shortcuts', { key, value })
    else if (apply) return api.call('plugins/shortcuts', { apply })
    else return api.call('plugins/shortctus').then(data => data.results)
  },

  // settings and preferences
  account({ password, old_password, otp } = {}) {
    if (otp) {
      return api.call('account/', { otp })
    } else {
      return api.call('account/', { password, old_password })
    }
  },

  admin_db(command) {
    if (command.collections) {
      return api.call('admin/db/collections').then(data => data.results)
    }
    return api.call('admin/db', command)
  },

  admin_users(options) {
    return this._crud_handlers('users', options)
  },

  admin_scheduler(options) {
    return this._crud_handlers('plugins/scheduler', options)
  }
}

export default Promise.all([
  api.call("plugins/shortcuts").then((data) => {
    shortcut_choices.push(...data.results.map((k) => ({
      text: `${k.name} ${k.expr}`,
      value: k.expr,
    })));
  }),
  api
    .call("plugins/filters")
    .then((data) => (plugin_pages.push(...data.results))),
  api.call("help/pipelines").then(data => {
    Object.assign(pipelines, data);
  }),
  api.call("help/langs").then(data => {
    Object.assign(languages, data);
  })]).then(() => {
    Vue.prototype.business = apicalls
    return Vue.prototype.business
  })