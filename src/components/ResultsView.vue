<template>
  <v-sheet ref="results" :class="config.view_mode">
    <div class="tools">
      <v-btn-toggle
        mandatory
        class="view-mode-toggler"
        dense
        v-model="config.view_mode"
        @change="update_view_mode"
      >
        <v-btn value="list">
          <v-icon>mdi-view-list</v-icon>
        </v-btn>
        <v-btn value="page">
          <v-icon>mdi-text-long</v-icon>
        </v-btn>
        <v-btn value="gallery">
          <v-icon>mdi-view-module</v-icon>
        </v-btn>
      </v-btn-toggle>
    </div>
    <!-- total results count -->
    <div class="count" v-show="total !== null">
      {{ $t("found-results", { total }) }}
    </div>
    <!-- divider -->
    <v-divider class="mt-5 mb-5"></v-divider>
    <!-- show content -->
    <div
      class="wrapper-container"
      ref="all_items"
      v-if="columns.includes('content')"
    >
      <template v-for="(r, index) in visible_data">
        <div class="spacer" v-if="r.spacer" :key="'spacer' + index"></div>
        <div class="paragraph" :data-id="r._id" v-else :key="index">
          <div class="meta">
            <v-checkbox
              v-model="r.selected"
              dense
              hide-details
              class="d-inline-block"
              @change="update_selection(r, null, index)"
            ></v-checkbox>
            {{ $t("dataset") }}:
            <a
              :href="
                '/' +
                querystring_stringify({
                  q: current_q(),
                  selected_datasets: [r.dataset],
                  groups: 'none',
                })
              "
              target="_blank"
              >{{ r.dataset }}</a
            >
            {{ $t("outline") }}: {{ r.outline }} {{ $t("source") }}:
            <a
              :href="
                '/' +
                querystring_stringify({
                  q: `auto(${JSON.stringify(current_q())}),source.file=${quote(
                    r.source.file
                  )}`,
                  selected_datasets: [r.dataset],
                  groups: 'none',
                })
              "
              target="_blank"
              >{{ r.source.file }}</a
            >
            <a :href="r.source.url" target="_blank">{{ r.source.url }}</a>
            {{ $t("pagenum") }}: {{ r.pagenum }} {{ $t("date") }}:
            {{ r.pdate | dateSafe }}
            <v-divider class="mt-5"></v-divider>
          </div>
          <v-img
            v-if="config.view_mode == 'gallery'"
            :class="{ selected: r.selected }"
            @click="update_selection(r, $event, index)"
            @dblclick="view_page(index)"
            :contain="config.contain"
            :height="240"
            :src="get_paragraph_image(r)"
          ></v-img>
          <ContentView
            :key="r._id"
            :view_mode="config.view_mode"
            :paragraph="r"
            :item_width="200"
            :item_height="200"
          />
          <div class="mt-10 operations">
            <v-btn @click="view_page(index)">
              <v-icon>mdi-eye</v-icon> {{ $t("view") }}
            </v-btn>
            <v-btn
              :href="`/view/${r.mongocollection}/${
                r.source.file ? r.source.file + '/' + r.source.page : r._id
              }`"
              target="_blank"
            >
              <v-icon>mdi-dock-window</v-icon> {{ $t("browse") }}
            </v-btn>
            <v-btn @click="show_info_dialog(r)">
              <v-icon>mdi-information</v-icon>
              {{ $t("metadata") }}
            </v-btn>
            <v-btn @click="show_edit_dialog(r)">
              <v-icon>mdi-file-edit-outline</v-icon>
              {{ $t("edit") }}
            </v-btn>
            <v-divider class="mt-5 mb-5"></v-divider>
          </div>
        </div>
      </template>
    </div>
    <!-- show array info -->
    <v-sheet v-else>
      <table>
        <thead>
          <tr>
            <th v-for="col in columns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, index) in visible_data" :key="index">
            <td v-for="col in columns" :key="col + index">
              <div v-if="Array.isArray(r[col])">
                <v-btn @click="show_embedded(r, col)">
                  <v-icon>mdi-file</v-icon>
                </v-btn>
              </div>
              <div v-else>
                {{ r[col] }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </v-sheet>
    <!-- pagination -->
    <v-row class="mt-5">
      <v-pagination v-model="page" :length="pages.length"></v-pagination>
      <div>
        <label> {{ $t("pagenum") }}</label>
        <v-text-field
          class="d-inline-block ml-1"
          style="max-width: 40px"
          type="number"
          dense
          @change="page = parseInt($event) || page"
        ></v-text-field>
      </div>
      <div>
        <label>{{ $t("page-size") }}</label>
        <v-select
          :items="[20, 50, 100, 200]"
          dense
          class="d-inline-block ml-1"
          style="max-width: 60px"
          v-model="config.page_size"
        ></v-select>
      </div>
    </v-row>

    <PageView
      v-model="dialogs.paragraph.visible"
      class="page-view"
      ref="page_view"
      :paragraphs="visible_data"
      :view_mode="config.view_mode"
      :start_index="dialogs.paragraph.start_index"
      :plugin_pages="plugin_pages"
      @next="turn_page(page + 1)"
      @prev="turn_page(page - 1)"
      @browse="browsing = $event"
      @info="show_info_dialog($event)"
      @rating="rating"
    />

    <QuickActionButtons
      :vm="this"
      :selection_count="selection.length"
      @toggle-selection="toggle_selection"
      @clear-selection="clear_selection"
      @delete="delete_items"
      @rating="rating"
      @group="group"
      @tag="show_tagging_dialog"
      @merge="merge"
      @split="split"
      @task="show_send_task_dialog"
      @play="playing"
      @reset-storage="reset_storage"
      @close="close_dialogs"
    />
  </v-sheet>
</template>

<script>
import PageView from "../views/PageView.vue";
import ContentView from "./ContentView.vue";
import QuickActionButtons from "./QuickActionButtons";
import api from "../api";
export default {
  name: "ResultsView",
  props: {
    load: {},
  },
  components: {
    PageView,
    ContentView,
    QuickActionButtons,
  },
  data() {
    return {
      total: 0,
      page: 1,
      value: [],
      token: null,
      page_range: [0, 0],
      plugin_pages: [],
      sticky: [],
      config: new Proxy(api.config, {
        get(target, name) {
          return target[name];
        },
        set(target, name, val) {
          target[name] = val;
          this.$forceUpdate();
        },
      }),
      // dialog bools
      dialogs: {
        paragraph: {
          visible: false,
          start_index: 0,
          item: {},
        },
      },
      // selection
      selection: [],
      browsing_item: {},
      select_index: -1,
    };
  },
  watch: {
    page(val) {
      this.turn_page(val);
    },
    "dialogs.paragraph.visible": function (val) {
      if (!val && this.$refs.page_view.active_paragraph) {
        var ele = document.querySelector(
          `[data-id="${this.$refs.page_view.active_paragraph._id}"]`
        );
        window.scrollTo(0, ele.offsetTop);
      }
    },
  },
  computed: {
    pages() {
      var p = [];
      var total = this.total || this.value.length;
      if (this.total == -1) total = 1000 * 200;
      for (
        let index = 0, i = 1;
        index < total && i <= 1000;
        index += api.config.page_size, i++
      ) {
        p.push(i);
      }
      return p;
    },
    visible_data() {
      return [
        ...this.sticky,
        ...this.value
          .slice(this.offset - this.page_range[0])
          .slice(0, api.config.page_size),
      ];
    },
    offset() {
      return (this.page - 1) * api.config.page_size;
    },
    columns() {
      var cols = new Set();
      for (var r of this.visible_data) {
        for (var k in r) cols.add(k);
      }
      return Array.from(cols).sort();
    },
    selected_paragraphs() {
      if (this.dialogs.paragraph.visible) {
        return this.visible_data.filter(
          (x) => x._id == this.$refs.page_view.active_paragraph._id
        );
      } else {
        return [...this.selection];
      }
    },
    selected_items() {
      if (this.dialogs.paragraph.visible) {
        return [
          Object.assign({}, this.$refs.page_view.active_item, {
            paragraph_id: this.selected_paragraphs[0]._id,
          }),
        ];
      } else {
        return this.selected_paragraphs.reduce(
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
    },
    selected_ids() {
      return this.selected_paragraphs.map((x) => x._id);
    },
  },
  mounted() {
    this.start();

    api.call("plugins/shortcuts").then((data) => {
      this.shortcut_choices = data.result.map((k) => ({
        text: `${k.name} ${k.expr}`,
        value: k.expr,
      }));
    });

    api
      .call("plugins/filters")
      .then((data) => (this.plugin_pages = data.result));
  
  },
  created() {
    window.addEventListener("keyup", this.select_shortcut_keys);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this.select_shortcut_keys);
  },
  methods: {
    _fetched() {
      return (
        this.page_range[0] <= this.offset && this.page_range[1] > this.offset
      );
    },
    current_q() {
      return api.querystring_parse(location.search).q || "";
    },
    start(page) {
      this.page_range = [0, 0];
      let params = api.querystring_parse(location.search);
      if (!page) {
        if (params.page) page = params.page | 0;
        else page = 1;
      } else {
        this.page_range = [0, 0];
        this.value = [];
        this.sticky = [];
        this.total = null;
      }
      this.turn_page(page);
    },
    querify: api.querify,
    turn_page(p, cb) {
      if (p === 0) return;

      function _preload(items) {
        // preload images for every item
        items.map((x) => {
          if (x.images) {
            [...x.images.slice(0, 5), ...x.images.slice(-1)].map((i) => {
              if (i.item_type == "image") {
                let image = new Image();
                image.src = api.get_item_image(i);
              }
            });
          }
        });
      }

      history.pushState(
        "",
        "",
        api.querystring_stringify(
          Object.assign(api.querystring_parse(location.search), {
            page: this.page,
          })
        )
      );
      if (this.page !== p) this.page = p;
      window.scroll({ top: this.$refs.results.offsetTop - 64 });
      if (!this._fetched()) {
        this.total = null;
        this.$emit("load", {
          offset: this.offset,
          limit: api.config.page_size * 5,
          callback: (data) => {
            if (this.token > data.token) return;
            this.token = data.token;

            if (typeof data.result !== "undefined") {
              if (Array.isArray(data.result) && !data.result.length) {
                if (this.page > 1) this.page = 1;
                return;
              }

              this.selection.splice(0, this.selection.length);
              this.page_range = [data.offset, data.offset + data.result.length];
              var items = data.result.map((x) =>
                Object.assign(x, { selected: false })
              );

              var has_sticky = items.filter((x) => x.spacer).length > 0;
              if (has_sticky) {
                var sticky_flag = true;
                this.sticky = [];
                this.value = [];
                for (var item of items) {
                  (sticky_flag ? this.sticky : this.value).push(item);
                  if (item.spacer) sticky_flag = false;
                }
              } else {
                this.sticky = [];
                this.value = items;
              }

              _preload(this.visible_data);
              if (typeof cb == "function") cb();
            }

            if (typeof data.total !== "undefined") this.total = data.total;

            this.$forceUpdate();
          },
        });
      } else {
        _preload(this.visible_data);
        if (typeof cb == "function") cb();
      }
    },
    update_view_mode() {
      this.start();
    },
    show_embedded(r, col) {
      var source = Object.assign({}, r);
      delete source[col];
      var target = { arr: r[col], source };
      api.dialogs.embedded(target);
    },
    show_info_dialog(target) {
      api.dialogs.info({ target });
    },
    show_edit_dialog(target) {
      api.dialogs.edit({ target }).then((target) => {
        api
          .call(
            `collections/${target.mongocollection || "paragraph"}/${target._id
            }`,
            target
          )
          .then(() => {
            api.notify(this.$t("saved"));
          });
      });
    },
    view_page(index) {
      this.dialogs.paragraph.visible = true;
      this.dialogs.paragraph.start_index = index;
      this.clear_selection();
    },
    playing() {
      if (api.config.view_mode != "gallery") return;
      this.view_page(0);
      this.$refs.page_view.playing(api.config.playing_interval);
    },
    
    fav(r) {
      api.fav(r);
    },
    favored(r) {
      return api.favored(r);
    },
    quote: api.quote,
    // selection
    update_selection(r, e, index) {
      var s = [];
      if (e && e.shiftKey && this.select_index >= 0) {
        document.getSelection().removeAllRanges();
        let sel_start = Math.min(this.select_index, index),
          sel_end = Math.max(this.select_index, index);
        for (var i = sel_start; i <= sel_end; ++i) {
          if (i == this.select_index || this.visible_data[i].spacer) continue;
          s.push(this.visible_data[i]);
        }
      } else {
        s = [r];
      }

      this.select_index = index;
      for (var it of s) {
        if (e) it.selected = !it.selected;
        if (it._id && it.selected) this.selection.push(it);
        else this.selection.splice(this.selection.indexOf(it), 1);
      }
    },
    set_selection(sel) {
      this.clear_selection();
      sel.forEach((x) => (x.selected = true));
      this.selection.splice(0, 0, ...sel);
    },
    toggle_selection() {
      this.visible_data.forEach((x) => (x.selected = !x.selected));
      this.selection.splice(0, this.selection.length, ...this.visible_data.filter((x) => x._id && x.selected));
    },
    clear_selection(s) {
      if (typeof s === "undefined") s = this.visible_data;
      s.forEach((x) => {
        x.selected = false;
        this.selection.splice(this.selection.indexOf(x), 1);
      });
    },
    select_shortcut_keys(e) {      
      if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA") return;

      var selection_inc = 0,
        ele;
      var selection_line_number;

      // move selection in vim favor
      switch (e.key.toLowerCase()) {
        case "h":
          selection_inc = -1;
          break;
        case "j":
          selection_inc = selection_line_number;
          break;
        case "k":
          selection_inc = -selection_line_number;
          break;
        case "l":
          selection_inc = 1;
          break;
        case ";":
          selection_inc = 0;
          break;
        // bind for turning page
        case "arrowleft":
          if (!this.dialogs.paragraph.visible) this.turn_page(this.page - 1);
          return
        case "arrowright":
          if (!this.dialogs.paragraph.visible) this.turn_page(this.page + 1);
          return

        default:
          return;
      }
      
      if (this.select_index < 0) selection_inc = 0;
      else
        selection_inc = Math.min(
          Math.max(0, this.select_index + selection_inc),
          this.visible_data.length
        );
      if (!e.ctrlKey && !e.shiftKey) {
        this.clear_selection();
      }
      this.update_selection(
        this.visible_data[selection_inc],
        e,
        selection_inc
      );
      ele = document.querySelector(
        `[data-id="${this.visible_data[selection_inc]._id}"]`
      );
      window.scrollTo(0, ele.offsetTop - ele.clientHeight);
      this.select_index = selection_inc;
      
      if (this.$refs.all_items && document.querySelector(".paragraph"))
        selection_line_number = parseInt(
          this.$refs.all_items.clientWidth /
            document.querySelector(".paragraph").clientWidth
        );

    },
    // dialogs
    show_tagging_dialog() {
      if (this.selected_paragraphs.length == 0) return;
      var existing_tags = new Set(
        this.selected_paragraphs.reduce((a, e) => a.concat(e.keywords), [])
      );
      api.dialogs
        .prompt({
          title: this.$t("tagging"),
          value: Array.from(existing_tags),
          choices: this.search_tag,
        })
        .then((tags) => {
          this.tag(tags, false);
        });
    },
    show_batch_tagging_dialog() {
      api.dialogs
        .batch_tagging(api.config.tagging || {})
        .then((tags) => this.tag(tags, true));
    },
    show_author_dialog() {
      var authors = new Set(
        this.selected_paragraphs
          .reduce((a, e) => a.concat(e.keywords), [])
          .filter((x) => x.startsWith("@"))
      ),
        author = this.selected_paragraphs[0].author;
      api.dialogs
        .prompt({
          title: this.$t("author"),
          value: author ? [author] : [],
          choices: Array.from(authors),
          limit: 1,
          initial: authors[0] || author || ''
        })
        .then((authors) => {
          this.set_author(authors[0]);
        });
    },
    show_send_task_dialog() {
      api.dialogs.send_task({ selection: this.selected_paragraphs });
    },
    close_dialogs() {
      this.dialogs.paragraph.visible = false
    },
    search_tag(search, vm) {
      let value = vm.new_value
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
            data = data || {result: []}
            var choices = value
              .map((x) => ({
                text: x,
                value: x,
              }))
              .concat(
                data.result.map((x) => ({
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
    },
    match_shortcuts(search, vm) {
      let value = vm.new_value
      return new Promise(accept => {
        if (!search) accept([]);
        var matched = this.shortcut_choices.filter((x) => x.text.startsWith(search));
        if (matched.length > 0 && matched[0].text.startsWith(search + " ")) {
          if (!value.includes(matched[0]))
            value.push(matched[0])
          if (matched.length == 1) vm.typing = ''
          else vm.typing = search
        }
        accept(matched);
      });
    },
    set_author(author) {
      var s = this.selected_paragraphs;
      if (!s || !s.length) return;
      api
        .call(`collections/${s[0].mongocollection || "paragraph"}/batch`, {
          ids: this.selected_ids,
          author,
          $push: { keywords: author },
        })
        .then((data) => {
          this.clear_selection(s);
          s.forEach((p) => {
            data.result[p._id] && (p.author = data.result[p._id].author);
          });
        });
    },
    tag(e, append = true) {
      var s = this.selected_paragraphs;
      if (!s || !s.length) return;

      var existing_tags = new Set(
        this.selected_paragraphs.reduce((a, e) => a.concat(e.keywords), [])
      );
      var push = append ? e : e.filter((x) => !existing_tags.has(x)),
        pull = append
          ? []
          : Array.from(existing_tags).filter((x) => !e.includes(x));
      var updates = {
        ids: this.selected_ids,
        $push: { keywords: push },
        $pull: { keywords: pull },
      };
      if (push.filter((x) => x.startsWith("@")))
        updates.author = push.filter((x) => x.startsWith("@"))[0];
      else if (pull.filter((x) => x.startsWith("@"))) updates.author = "";

      api
        .call(
          `collections/${s[0].mongocollection || "paragraph"}/batch`,
          updates
        )
        .then((data) => {
          this.clear_selection(s);
          s.forEach((p) => {
            data.result[p._id] &&
              Object.assign(p, data.result[p._id], { images: p.images });
          });
        });
    },
    delete_items() {
      var s = this.selected_paragraphs;
      var items = this.selected_items
      var objs = api.get_paragraph_item_objects(s, items);
      api
        .call("mediaitem/delete", {
          para_items: objs.para_items,
        })
        .then(() => {
          s.forEach((x) => {
            x.images = x.images.filter(
              (i) => !objs.visible_para_items[x._id].includes(i._id)
            );
          });
          this.clear_selection(s);
        });
    },
    rating(val) {
      var s = this.selected_paragraphs;
      if (typeof val === "number") {
        val = {
          inc: val,
          least: val > 0 ? 1 : -1,
        };
      }
      val.ids = (val.item ? [val.item] : this.selected_items).map(
        (x) => x._id
      );
      if (val.item) delete val.item;
      if (api.config.view_mode == "gallery") {
        api.call("mediaitem/rating", val).then((data) => {
          data = data.result || {};
          this.clear_selection(s);
          s.forEach((p) =>
            p.images.forEach(
              (i) =>
                typeof data[i._id] !== "undefined" && (i.rating = data[i._id])
            )
          );
        });
      } else {
        // fav paragraphs
        s.forEach((x) => this.fav(x));
        this.clear_selection(s);
      }
    },
    group(del) {
      var s = this.selected_paragraphs;
      if (!s || !s.length) return;
      var bundle = {
        ids: this.selected_ids,
        ungroup: del,
      };

      const _call = () => {
        api
          .call(
            `collections/${s[0].mongocollection || "paragraph"}/group`,
            bundle
          )
          .then((data) => {
            this.clear_selection(s);
            s.forEach(
              (p) =>
              (p.keywords = p.keywords
                .filter(
                  (x) => !x.match(del ? /^#/ : /^#0/) && !data.result.includes(x)
                )
                .concat(data.result))
            );
          });
      }

      if (
        !del &&
        s
          .map((x) => x.keywords.filter((x) => x.match(/^#[^0]/)))
          .reduce((p, c) => p.concat(c)).length == 0
      ) {
        var choices = [...api.guess_groups(this.current_q()), ...api.guess_groups(s)];
        api.dialogs
          .prompt({
            title: this.$t("group"),
            choices,
            initial: choices[0] || ''
          })
          .then((group) => {
            bundle.group = (group || []).map(x => x.replace(/^#/, ""));
            _call();
          });
      } else {
        _call();
      }
    },
    merge() {
      var s = this.selected_paragraphs;
      var items = this.selected_items;
      var objs = api.get_paragraph_item_objects(s, items);
      if (!s || !s.length) return;
      api
        .call(`collections/${s[0].mongocollection || "paragraph"}/merge`, {
          paragraphs: objs.para_items,
        })
        .then(() => this.clear_selection(s));
    },
    split() {
      var s = this.selected_paragraphs;
      var items = this.selected_items;
      var objs = api.get_paragraph_item_objects(s, items);
      if (!s || !s.length) return;
      api
        .call(`collections/${s[0].mongocollection || "paragraph"}/split`, {
          paragraphs: objs.para_items,
        })
        .then(() => this.clear_selection(s));
    },
    reset_storage() {
      var s = this.selected_paragraphs;
      api
        .call("mediaitem/reset_storage", {
          ids: this.selected_items.map((x) => x._id),
        })
        .then(() => this.clear_selection(s));
    },
    get_paragraph_image(i) {
      return api.get_paragraph_image(i);
    },
    querystring_stringify: api.querystring_stringify,
  },
};
</script>

<style>
.page .paragraph p,
.list .paragraph p {
  max-width: 960px;
}
</style>

<style scoped>
.v-btn {
  margin-right: 12px;
}

.page-view {
  overflow-y: auto;
  max-height: 100%;
}

.v-dialog .v-card__title .v-btn {
  margin-right: 50px;
  position: fixed;
  z-index: 200;
  right: 20px;
}

.meta a {
  text-decoration: none;
}

.count {
  margin-bottom: 5px;
}

.page .operations,
.page .meta,
.gallery .operations,
.gallery .meta {
  display: none;
}

.wrapper-container {
  clear: both;
  margin: 0;
  padding: 0;
  width: 100%;
}

.gallery .wrapper-container {
  display: flex;
  flex-wrap: wrap;
}

.gallery .wrapper-container .paragraph {
  padding: 5px;
  width: 250px;
}

.spacer {
  margin-right: 100%;
}

.tools > .v-btn {
  margin-right: 12px;
}

.tools {
  padding-right: 12px;
  padding-bottom: 12px;
  text-align: right;
}

.view-mode-toggler {
  vertical-align: middle;
}

.view-mode-toggler > * {
  margin: 0;
}

.v-image.selected::before {
  content: "\F012C";
  color: green;
  font-family: "Material Design Icons";
  display: block;
  z-index: 4;
  position: absolute;
  margin: 0;
  font-size: 40px;
  opacity: 1;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
}

.dialog-limit {
  max-width: 800px !important;
  width: 75% !important;
  margin: auto;
}

.v-select__selections {
  overflow-x: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.v-chip {
  overflow: initial;
}
</style>
