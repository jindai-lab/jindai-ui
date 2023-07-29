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

  plugin_pages,
  languages,
  pipelines,

  get_choices(lang_or_dataset) {
    return api.call(lang_or_dataset.toLowerCase() + "s").then(
      (data) => data.results.map((x) => ({
        text: x.display_name || x.name,
        value: this.arg.type == "TASK" ? x._id : x.name,
      }))
    );
  },

  get_task_shortcuts() {
    return api
      .call("tasks/shortcuts")
      .then((data) => data.results);
  },

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
      $push: { keywords: push },
      $pull: { keywords: pull },
    };
    if (push.filter((x) => x.startsWith("@")))
      updates.author = push.filter((x) => x.startsWith("@"))[0];
    else if (pull.filter((x) => x.startsWith("@"))) updates.author = "";

    return api
      .call(
        `collections/${selection.first.mongocollection || "paragraph"}/batch`,
        updates
      )
      .then((data) => {
        selection.all.forEach((p) => {
          data.paragraphs[p._id] &&
            Object.assign(p, data.paragraphs[p._id], { images: p.images });
        });
      });
  },
  delete(options) {
    const { selection } = options
    var objs = selection.to_objects();
    return api
      .call("mediaitem/delete", {
        para_items: objs.para_items,
      })
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
      return api.call("mediaitem/rating", rating).then((data) => {
        data = data.items || {};
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
    };

    const _call = () => {
      return api
        .call(
          `collections/${selection.first.mongocollection || "paragraph"}/group`,
          bundle
        )
        .then((data) => {
          const { paragraphs } = data
          selection.all.forEach(
            (p) =>
              paragraphs.includes(p._id) ?
                (p.keywords = paragraphs[p._id].keywords) : void (0)
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
      bundle.group = (Array.from(existing_groups)[0] || ('0' + tempgroup())).replace(/^#/, '')
      return _call();
    }
  },
  merge({ selection }) {

    var objs = selection.to_objects()
    if (!selection || !selection.length) return;
    return api
      .call(`collections/${selection.first.mongocollection || "paragraph"}/merge`, {
        paragraphs: objs.para_items,
      })
  },
  split({ selection }) {
    var objs = selection.to_objects()
    return api
      .call(`collections/${selection.first.mongocollection || "paragraph"}/split`, {
        paragraphs: objs.para_items,
      })
  },
  reset_storage({ selection }) {
    return api
      .call("mediaitem/reset_storage", {
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
        `collections/${target.mongocollection || "paragraph"}/${target._id}`,
        target
      )
  },

  edit_paragraph_pagenum({ mongocollection, paragraph_id, pagenum_bundle }) {
    return api.call(`collections/${mongocollection || "paragraph"}/${paragraph_id
      }/pagenum`, pagenum_bundle)
  },

  task_shortcuts() {
    return api.call("tasks/shortcuts").then(
      (data) =>
      (data.results.map((task) => ({
        text: task.name,
        value: task.pipeline,
      })))
    );
  },

  history() {
    return api.call("history").then((data) => data.results)
  },

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
        } else {
          return [stage.substring(1), params]
        }
      })
    }
    return api.call('qx', { query }).then(data => {
      return _replaceFC(data)
    })
  },

  autotags({ deletion, apply, creation } = {}) {
    if (creation) {
      return api.put("plugins/autotags", creation)
    } else if (deletion) {
      return api.call("plugins/autotags", { delete: true, ids: deletion })
    } else if (apply) {
      return api.call("plugins/autotags", { apply })
    } else {
      return api.call("plugins/autotags").then((data) => data.results);
    }
  },

  tasks({ id, update, pipeline, name } = {}) {
    if (id) {
      return api.call(`tasks/${id}`)
    } else if (update) {
      return api.call(`tasks/${update._id}`, update)
    } else if (pipeline) {
      return api.put('tasks/', { pipeline, name })
    } else {
      return api.call('tasks/').then(data => data.results)
    }
  },

  datasets({ edit, batch, rename, sources } = {}) {
    if (edit) {
      return api.call('datasets/edit', edit)
    } else if (batch) {
      return api.call('datasets/batch', batch)
    } else if (rename) {
      return api.call('datasets/rename', rename)
    } else if (sources) {
      return api.call('datasets/sources', sources)
    } else {
      return api.call('datasets').then(data => data.results)
    }
  },

  scheduler() {
    return api.call('scheduler').then(data => data.results)
  },

  author({selection}) {
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
          .call(`collections/${selection.first.mongocollection || "paragraph"}/batch`, {
            ids: selection.ids,
            author,
            $push: { keywords: author },
          })
          .then((data) => {
            selection.all.forEach((p) => {
              data.paragraphs[p._id] && (p.author = data.paragraphs[p._id].author);
            });
            return data.paragraphs
          });
      });
  },

  task(options) {
    return dialogs.send_task(options);
  },

  open_window({ selection, formatter }) {
    let url = formatter({ selection })
    api.open_window(url, '_blank')
    return new Promise(accept => accept())
  },

  info_dialog({selection}) {
    return dialogs.info({ target: selection.first })
  },

  search(params, count, cancel_source) {
    if (count)
      params = Object.assign({ count: true }, params, cancel_source)
    return api.call('search', params)
  },

  queue_logs(id) {
    return api.call(`queue/logs/${encodeURIComponent(id)}`).then(data => data.results.map(x => ({ text: x })))
  },

  queue_results({ offset, limit, id } = {}) {
    return api.call(`queue/${encodeURIComponent(id)}?offset=${offset}&limit=${limit}`)
  },

  remote_json(json_path) {
    return api.call(`image?file=${json_path}`)
  },

  account({ password, old_password, otp } = {}) {
    if (otp) {
      return api.call('account/', { otp })
    } else {
      return api.call('account/', { password, old_password })
    }
  },

  storage(selected_dir, operation) {
    return api.call(`storage/${selected_dir}`, operation)
  },

  install_plugin(url) {
    return api.call("plugins", { url })
  },

  plugin_shortcuts({ key = null, value = null, apply = null }) {
    if (key) return api.call('plugins/shortcuts', { key, value })
    else if (apply) return api.call('plugins/shortcuts', { apply })
    else return api.call('plugins/shortctus').then(data => data.results)
  },

  admin_users(new_user) {
    if (new_user) return api.call(`users/${new_user.username}`, new_user)
    return api.call('users/')
  },

  admin_db(command) {
    if (command.collections) {
      return api.call('admin/db/collections').then(data => data.results)
    }
    return api.call('admin/db', command).then(data => data.bundle)
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
    Object.assign(Vue.prototype.business, apicalls)
    return Vue.prototype.business
  })