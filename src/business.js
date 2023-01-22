import api from "./api"
import i18n from "./locales";

const shortcut_choices = []
const plugin_pages = []


api.call("plugins/shortcuts").then((data) => {
  shortcut_choices.push(...data.result.map((k) => ({
    text: `${k.name} ${k.expr}`,
    value: k.expr,
  })));
});

api
  .call("plugins/filters")
  .then((data) => (plugin_pages.push(...data.result)));


class Selection {

  constructor(paragraphs) {
    this.paragraphs = paragraphs
  }

  get['length'] () {
    return this.paragraphs.length
  }

  get['ids'] () {
    return this.paragraphs.map(x => x._id)
  }

  clear() {
    this.paragraphs.forEach(x => x.selected = false)
    this.paragraphs.splice(0, this.paragraphs.length)
  }

  set(to) {
    this.clear()
    to.forEach(x => this.add(x))
  }

  toggle(all) {
    all.forEach((x) => {
      if (x.selected) this.remove(x)
      else this.add(x)
    });
  }

  remove(p) {
    var index = this.paragraphs.findIndex(x => x._id == p._id)
    if (index >= 0) {
      this.paragraphs[index].selected = false
      this.paragraphs.splice(index, 1)
    }
  }

  add(p) {
    if (this.paragraphs.includes(p)) return
    p.selected = true
    this.paragraphs.push(p)
  }

  choose_item(item) {
    this.paragraphs = [
      Object.assign({}, this.paragraphs[0],
        { images: Array.isArray(item) ? item : [item] })
    ]
  }

  get['items']() {
    return this.paragraphs.reduce(
      (y, e) =>
        y.concat(
          e.images.map((i) => {
            if (!i.paragraph_id) i.paragraph_id = e._id;
            return i;
          })
        ),
      []
    );
  }

  to_objects() {

    var para_items = {},
      visible_para_items = {};

    this.items.forEach((item) => {
      if (!para_items[item.paragraph_id])
        para_items[item.paragraph_id] = [];
      para_items[item.paragraph_id].push(item._id);
    });

    this.paragraphs.forEach((p) => {
      if (!visible_para_items[p._id]) visible_para_items[p._id] = [];
      visible_para_items[p._id].splice(
        0,
        0,
        ...this.items.map((i) => i._id)
      );
    });

    return {
      para_items,
      visible_para_items,
    };
  }

}


export default {
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

  Selection,

  tag(options) {
    const { selection, tags: val, append } = options
    var existing_tags = new Set(
      selection.paragraphs.reduce((a, tags) => a.concat(tags.keywords), [])
    );
    var push = append ? val : val.filter((x) => !existing_tags.has(x)),
      pull = append
        ? []
        : Array.from(existing_tags).filter((x) => !val.includes(x));
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
        `collections/${selection[0].mongocollection || "paragraph"}/batch`,
        updates
      )
      .then((data) => {
        selection.paragraphs.forEach((p) => {
          data.result[p._id] &&
            Object.assign(p, data.result[p._id], { images: p.images });
        });
      });
  },
  delete_items(options) {
    const { selection } = options
    var objs = selection.to_objects();
    return api
      .call("mediaitem/delete", {
        para_items: objs.para_items,
      })
      .then(() => {
        selection.paragraphs.forEach((x) => {
          x.images = x.images.filter(
            (i) => !objs.visible_para_items[x._id].includes(i._id)
          );
        });
      });
  },
  rating(options) {
    const { selection, ...rating } = options

    rating.ids = selection.items.map((x) => x._id);
    if (api.config.view_mode == "gallery") {
      return api.call("mediaitem/rating", rating).then((data) => {
        data = data.result || {};
        selection.paragraphs.forEach((p) =>
          p.images.forEach(
            (i) =>
              typeof data[i._id] !== "undefined" && (i.rating = data[i._id])
          )
        );
      });
    } else {
      return Promise.all(selection.map((x) => api.fav(x)));
    }
  },
  group(options) {
    const { selection, del } = options
    var bundle = {
      ids: selection.ids,
      ungroup: del,
    };

    const _call = () => {
      return api
        .call(
          `collections/${selection.paragraphs[0].mongocollection || "paragraph"}/group`,
          bundle
        )
        .then((data) => {
          selection.paragraphs.forEach(
            (p) =>
            (p.keywords = p.keywords
              .filter(
                (x) =>
                  !x.match(del ? /^#/ : /^#0/) && !data.result.includes(x)
              )
              .concat(data.result))
          );
        });
    };

    if (
      !del &&
      selection
        .map((x) => x.keywords.filter((x) => x.match(/^#[^0]/)))
        .reduce((p, c) => p.concat(c)).length == 0
    ) {
      var choices = [
        ...api.guess_groups(api.current_q()),
        ...api.guess_groups(selection.paragraphs),
      ];
      return api.dialogs
        .prompt({
          title: i18n.t("group"),
          choices,
          initial: choices[0] || "",
        })
        .then((group) => {
          bundle.group = (group || []).map((x) => x.replace(/^#/, ""));
          return _call();
        });
    } else {
      return _call();
    }
  },
  merge(options) {
    const { selection } = options

    var objs = selection.to_objects()
    if (!selection || !selection.length) return;
    return api
      .call(`collections/${selection.paragraphs[0].mongocollection || "paragraph"}/merge`, {
        paragraphs: objs.para_items,
      })
  },
  split(options) {
    const { selection } = options
    var objs = selection.to_objects()
    return api
      .call(`collections/${selection[0].mongocollection || "paragraph"}/split`, {
        paragraphs: objs.para_items,
      })
  },
  reset_storage(options) {
    const { items } = options
    return api
      .call("mediaitem/reset_storage", {
        ids: items.map((x) => x._id),
      })
  },

  interactive_tagging(options) {
    const { selection } = options
    var existing_tags = new Set(
      selection.paragraphs.reduce((a, tags) => a.concat(tags.keywords), [])
    );
    return api.dialogs
      .prompt({
        title: i18n.t("tagging"),
        value: Array.from(existing_tags),
        choices: this.search_tag,
      })
      .then((tags) => {
        this.tag({ selection, val: tags, append: false });
      });
  },

  short_tagging(options) {
    const { selection, initial } = options
    return api.dialogs
      .prompt({
        title: this.$t("tagging"),
        choices: this.match_shortcuts,
        initial,
      })
      .then((tags) => this.tag({ val: tags, append: true, selection }));
  },

  batch_tagging(options) {
    const { selection } = options
    return api.dialogs
      .batch_tagging(api.config.tagging || {})
      .then((tags) => this.tag({ selection, val: tags, append: true }));
  },

  author(options) {
    const { selection } = options
    var authors = new Set(
      selection.paragraphs
        .reduce((a, tags) => a.concat(tags.keywords), [])
        .filter((x) => x.startsWith("@"))
    ),
      author = selection.paragraphs[0].author;
    return api.dialogs
      .prompt({
        title: i18n.t("author"),
        value: author ? [author] : [],
        choices: Array.from(authors),
        limit: 1,
        initial: authors[0] || author || "",
      })
      .then((authors) => {
        const author = authors[0]

        return api
          .call(`collections/${selection.paragraphs[0].mongocollection || "paragraph"}/batch`, {
            ids: this.selected_ids,
            author,
            $push: { keywords: author },
          })
          .then((data) => {
            selection.paragraphs.forEach((p) => {
              data.result[p._id] && (p.author = data.result[p._id].author);
            });
            return data.result
          });
      });
  },

  task(options) {
    return api.dialogs.send_task(options);
  },

  open_window(options) {
    const { selection, formatter } = options
    let url = formatter({ selection })
    api.open_window(url, '_blank')
    return new Promise(accept=>accept())
  },
  info_dialog(options) {
    const { selection } = options
    return api.dialogs.info({ target: selection.paragraphs[0] })
  }
}