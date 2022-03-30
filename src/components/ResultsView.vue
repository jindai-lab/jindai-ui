<template>
  <v-sheet v-if="total !== 0" ref="results" :class="view_mode">
    <!-- gallery toolbar -->
    <div v-if="view_mode == 'gallery'" class="gallery-toolbar">
      <v-checkbox
        flat
        v-model="config.contain"
        label="全图显示"
        @change="_save_config"
      ></v-checkbox>
      <v-checkbox
        flat
        v-model="config.force_thumbnail"
        label="缩略图"
        @change="_save_config"
      ></v-checkbox>
      <v-checkbox
        flat
        v-model="config.enhance"
        label="增强图像"
        @change="_save_config"
      ></v-checkbox>
      <v-btn text @click="dialogs.auto_tagging.visible = true">自动标签</v-btn>
    </div>
    <!-- total results count -->
    <div class="count" v-show="total !== null">共找到 {{ total }} 个结果。</div>
    <!-- divider -->
    <v-divider class="mt-5 mb-5"></v-divider>
    <!-- show content -->
    <div class="wrapper-container" v-if="columns.includes('content')">
      <template v-for="(r, index) in visible_data">
        <div class="spacer" v-if="r.spacer" :key="index"></div>
        <div class="paragraph" v-else :key="index">
          <div class="meta">
            数据集:
            <a :href="`/?q=dataset=${quote(r.dataset)}`" target="_blank">{{
              r.dataset
            }}</a>
            大纲: {{ r.outline }} 来源:
            <a
              :href="`/?q=dataset=${quote(r.dataset)},source.file=${quote(
                r.source.file
              )}`"
              target="_blank"
              >{{ r.source.file }}</a
            >
            <a :href="r.source.url" target="_blank">{{ r.source.url }}</a> 页码:
            {{ r.pagenum }} 日期: {{ r.pdate | dateSafe }}
            <div style="float: right">
              <v-checkbox
                v-model="r.selected"
                dense
                style="vertical-align: middle"
                @change="update_selection(r, null, index)"
              ></v-checkbox>
            </div>
            <v-divider class="mt-5"></v-divider>
          </div>
          <ContentView
            :view_mode="view_mode"
            :paragraph="r"
            :item_width="200"
            :item_height="200"
            :first_item_only="view_mode === 'gallery'"
            :contain="config.contain"
            @toggle-select="update_selection($event.paragraph, $event.e, index)"
            @browse="view_page(index)"
          />
          <div class="mt-10 operations">
            <v-btn @click="view_page(index)">
              <v-icon>mdi-eye</v-icon> 查看
            </v-btn>
            <v-btn
              :href="`/view/${r.mongocollection}/${
                r.source.file ? r.source.file + '/' + r.source.page : r._id
              }`"
              target="_blank"
            >
              <v-icon>mdi-dock-window</v-icon> 浏览
            </v-btn>
            <v-btn
              @click="
                dialogs.info.target = r;
                dialogs.info.visible = true;
              "
            >
              <v-icon>mdi-information</v-icon>
              元数据
            </v-btn>
            <v-btn
              @click="
                dialogs.edit.target = r;
                dialogs.edit.visible = true;
              "
            >
              <v-icon>mdi-file-edit-outline</v-icon>
              编辑
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
        <label> 页码</label>
        <v-text-field
          class="d-inline-block ml-1"
          style="max-width: 30px"
          @change="page = parseInt($event) || page"
        ></v-text-field>
      </div>
    </v-row>
    <!-- dialogs -->
    <PageView
      v-model="dialogs.paragraph.visible"
      class="page-view"
      ref="page_view"
      :paragraphs="visible_data"
      :view_mode="view_mode"
      :start_index="dialogs.paragraph.start_index"
      @next="turn_page(page + 1)"
      @prev="turn_page(page - 1)"
      @browse="browsing = $event"
      @info="
        dialogs.info.visible = true;
        dialogs.info.target = $event;
      "
      @rating="rating"
    />
    <v-dialog v-model="dialogs.info.visible">
      <v-card>
        <v-card-title>
          <v-btn
            icon
            @click="dialogs.info.visible = false"
            style="margin-right: 12px"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
          元数据</v-card-title
        >
        <v-card-text>
          <v-row v-for="(v, k) in dialogs.info.target" :key="k">
            <v-col cols="4">{{ k }}</v-col>
            <v-col cols="8">{{ v }}</v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogs.info.visible = false"> OK </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogs.auto_tagging.visible" fullscreen>
      <auto-tags @close="dialogs.auto_tagging.visible = false"></auto-tags>
    </v-dialog>

    <v-dialog v-model="dialogs.edit.visible">
      <v-card>
        <v-card-title
          >编辑语段 {{ dialogs.edit.target._id }}
          <v-spacer></v-spacer>
          <v-btn icon @click="dialogs.edit.visible = false"
            ><v-icon>mdi-close</v-icon></v-btn
          ></v-card-title
        >
        <v-card-text>
          <v-list>
            <v-list-item v-for="(field, key) in dialogs.edit.target" :key="key">
              <v-list-item-content>
                <ParamInput
                  v-model="dialogs.edit.target[key]"
                  :arg="{ type: typeof field, name: key, default: '\'\'' }"
                  v-if="
                    !(
                      ['_id', 'matched_content'].includes(key) ||
                      typeof field == 'object'
                    )
                  "
                />
              </v-list-item-content>
            </v-list-item>
            <v-list-item>
              <v-list-item-content>
                <ParamInput
                  v-model="dialogs.edit.new_field"
                  :arg="{ type: 'string', name: '新字段', default: '' }"
                />
                <v-btn
                  @click="
                    dialogs.edit.target[dialogs.edit.new_field] = '';
                    $forceUpdate();
                  "
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="save()">保存</v-btn>
          <v-btn @click="dialogs.edit.visible = false">取消</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogs.embedded.visible">
      <v-card>
        <v-card-title>
          查看 {{ querify(dialogs.embedded.target.source) }}
          <v-spacer></v-spacer>
          <v-btn icon @click="dialogs.embedded.visible = false"
            ><v-icon>mdi-close</v-icon></v-btn
          >
        </v-card-title>
        <v-card-text>
          <ResultsView
            @load="
              (a) =>
                a.callback({ offset: 0, result: dialogs.embedded.target.arr })
            "
            :total="(dialogs.embedded.target.arr || []).length"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogs.auto_tagging.visible" fullscreen>
      <auto-tags @close="dialogs.auto_tagging.visible = false"></auto-tags>
    </v-dialog>

    <tagging-shortcuts-dialog
      v-model="dialogs.tagging_shortcuts.visible"
      :choices="dialogs.tagging_shortcuts.list"
      :initial="dialogs.tagging_shortcuts.initial"
      :multiple="false"
      :match_initials="true"
      @submit="tag($event, true)"
    ></tagging-shortcuts-dialog>

    <tagging-dialog
      ref="tagging_dialog"
      :choices="dialogs.tagging.choices"
      @submit="tag($event, false)"
    ></tagging-dialog>

    <QuickActionButtons
      :selection_count="selection_count"
      @toggle-selection="toggle_selection"
      @clear-selection="clear_selection"
      @delete="delete_items"
      @rating="rating(1)"
      @group="group"
      @tag="show_tagging_dialog"
      @merge="merge"
      @split="split"
      @play="playing"
      @playing-interval="config.playing_interval = +$event; _save_config()"
      :playing_interval="config.playing_interval"
    />
  </v-sheet>
  <v-sheet v-else ref="results">未找到匹配的结果。</v-sheet>
</template>

<script>
import ParamInput from "./ParamInput";
import PageView from "./PageView.vue";
import ContentView from "./ContentView.vue";
import QuickActionButtons from "./QuickActionButtons";
import TaggingDialog from "./TaggingDialog.vue";
import TaggingShortcutsDialog from "./TaggingShortcutsDialog.vue";
import AutoTags from "./AutoTags.vue";
import api from "../api";
export default {
  name: "ResultsView",
  props: {
    load: {},
    page_size: { default: 20 },
    view_mode: { default: "list" },
  },
  components: {
    ParamInput,
    PageView,
    ContentView,
    QuickActionButtons,
    TaggingDialog,
    TaggingShortcutsDialog,
    AutoTags,
  },
  data() {
    return {
      total: 0,
      page: 1,
      value: [],
      token: null,
      page_range: [0, 0],
      plugin_pages: [],
      // local config
      config: {
        fit: "both",
        contain: false,
        enhance: false,
        force_thumbnail: false,
        limit: 50,
        playing_interval: 1000
      },
      // dialog bools
      dialogs: {
        embedded: {
          visible: false,
          target: {},
        },
        edit: {
          visible: false,
          target: {},
          new_field: "",
        },
        paragraph: {
          visible: false,
          start_index: 0,
          item: {},
        },
        info: {
          visible: false,
          target: {},
        },
        auto_tagging: {
          visible: false,
        },
        tagging_shortcuts: {
          visible: false,
          list: [],
          initial: "",
        },
        tagging: {
          visible: false,
          choices: [],
        },
      },
      // selection
      selection: [],
      browsing_item: {},
      selection_count: 0,
      select_index: -1,
      last_key: "",
    };
  },
  watch: {
    page(val) {
      this.turn_page(val);
    },
  },
  computed: {
    pages() {
      var p = [];
      for (
        let index = 0, i = 1;
        index < (this.total || this.value.length) && i <= 1000;
        index += this.page_size, i++
      ) {
        p.push(i);
      }
      return p;
    },
    visible_data() {
      return this.value
        .slice(this.offset - this.page_range[0])
        .slice(0, this.page_size);
    },
    offset() {
      return (this.page - 1) * this.page_size;
    },
    columns() {
      var cols = new Set();
      for (var r of this.visible_data) {
        for (var k in r) cols.add(k);
      }
      return Array.from(cols).sort();
    },
  },
  mounted() {
    this.config = api.load_config("results", this.config);
    this.start();

    api.call("plugins/shortcuts").then((data) => {
      data = data.result;
      for (var k in data)
        this.dialogs.tagging_shortcuts.list.push({
          text: `${k} ${data[k]}`,
          value: data[k],
        });
    });
  },
  created() {
    window.addEventListener("keyup", this._keyup_handler);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this._keyup_handler);
  },
  methods: {
    _fetched() {
      return (
        this.page_range[0] <= this.offset && this.page_range[1] > this.offset
      );
    },
    start(page) {
      this.page_range = [0, 0];
      let params = api.querystring_parse(location.search);
      if (!page)
        if (params.page) page = params.page | 0;
        else page = 1;
      this.turn_page(page);
    },
    querify: api.querify,
    turn_page(p, cb) {
      if (p == 0) return;
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
        this.$emit("load", {
          offset: this.offset,
          limit: this.page_size * 5,
          callback: (data) => {
            if (this.token < data.token) {
              this.token = data.token;
              this.total = null;
              this.selection = [];
            }
            if (typeof data.result !== "undefined") {
              this.page_range = [data.offset, data.offset + data.result.length];
              data.result.forEach((x) => (x.selected = false));
              this.value = data.result;
              if (typeof cb == "function") cb();
            }
            if (typeof data.total !== "undefined") this.total = data.total;
            this.$forceUpdate();
          },
        });
      } else {
        if (typeof cb == "function") cb();
      }
    },
    show_embedded(r, col) {
      var source = Object.assign({}, r);
      delete source[col];
      this.embedded = { arr: r[col], source };
    },
    view_page(index) {
      this.dialogs.paragraph.visible = true;
      this.dialogs.paragraph.start_index = index;
      this.clear_selection();
    },
    playing() {
      if (this.view_mode != 'gallery') return
      this.view_page(0)
      this.$refs.page_view.playing(this.config.playing_interval)
      this._save_config()
    },
    _keyup_handler(e) {
      if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA") return;
      switch (e.key.toLowerCase()) {
        case "arrowleft":
          if (!this.dialogs.paragraph.visible) this.turn_page(this.page - 1);
          break;
        case "arrowright":
          if (!this.dialogs.paragraph.visible) this.turn_page(this.page + 1);
          break;
        case "f":
          this.toggle_selection();
          break;
        case "g":
          this.group(e.altKey || e.ctrlKey);
          break;
        case "p":
          e.altKey || e.ctrlKey ? this.split() : this.merge();
          break;
        case "t":
        case "@":
          this.show_tagging_dialog();
          break;
        case "n":
          this.tag([`noted:${new Date().toISOString()}`]);
          break;
        case "d":
          if (this.last_key == e.key && this.selected_paragraphs().length > 0) {
            this.delete_items();
            this.last_key = null;
          }
          break;
        case "q":
        case "`":
        case "escape":
          this.dialogs.paragraph.visible = false;
          this.clear_selection();
          break;
        case "a":
        case "arrowup":
        case "arrowdown":
          if (this.selected_items().length)
            this.rating(e.key != "ArrowDown" ? 1 : -1);
          break;
        case "r":
          if (this.last_key == e.key && this.selected_paragraphs().length > 0) {
            this.reset_storage();
            this.last_key = null;
          }
          break;
        case "c":
        case "z":
        case "o":
        case "i":
          if (e.ctrlKey || e.metaKey) return;
          if (this.selected_paragraphs().length > 0) {
            var _album = this.selected_paragraphs()[0];
            switch (e.key.toLowerCase()) {
              case "o":
                this._open_window(_album.source.url);
                break;
              case "c":
                this._open_window(
                  `?q=author%3D${this.quote(_album.author) || ""}`
                );
                break;
              case "z":
                this._open_window(
                  e.shiftKey
                    ? `?q=id%3D${_album._id},images.source=exists(1)`
                    : `?q=source.url%25%27${api
                        .escape_regex(_album.source.url)
                        .replace(/\/\d+\//, "/.*/")}'`
                );
                break;
              case "i":
                this.dialogs.info.visible = !this.dialogs.info.visible;
                this.dialogs.info.target = this.selected_paragraphs()[0];
                break;
            }
          }
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          this.dialogs.tagging_shortcuts.visible =
            this.selected_paragraphs().length > 0;
          this.dialogs.tagging_shortcuts.initial = e.key;
          break;
        default:
          var pages = Object.values(this.plugin_pages).filter(
            (x) => x.shortcut == e.key
          );
          if (pages.length) {
            this._open_window(
              `?archive=true&q=author%3D${
                this.quote(this.selected_paragraphs()[0].author) || ""
              };page('${this.format(pages[0].format, {
                imageitem: this.selected_items()[0],
                paragraph: this.selected_paragraphs()[0],
              })}')`
            );
          }
          break;
      }

      this.last_key = this.last_key === null ? "" : e.key;
    },
    save() {
      api
        .call(
          `edit/${this.dialogs.edit.target.mongocollection}/${this.dialogs.edit.target._id}`,
          this.dialogs.edit.target
        )
        .then(() => {
          this.dialogs.edit.target = null;
          api.notify({ title: "保存成功" });
        });
    },
    _open_window(url) {
      window.open(url);
    },
    _show_dialog(dialog) {
      this.drawer = false;
      this.dialogs[dialog] = true;
    },
    _save_config() {
      api.save_config("results", this.config);
    },
    fav(r) {
      api.fav(r);
    },
    favored(r) {
      return api.favored(r);
    },
    quote(x) {
      return encodeURIComponent(api.quote(x));
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
            paragraph_id: this.selected_paragraphs()[0]._id,
          }),
        ];
      } else {
        return this.selected_paragraphs().reduce(
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
      return this.selected_paragraphs().map((x) => x._id);
    },
    // api calls
    update_selection(r, e, index) {
      var s = [];
      if (e && e.shiftKey && this.select_index >= 0) {
        document.getSelection().removeAllRanges();
        let sel_start = Math.min(this.select_index, index),
          sel_end = Math.max(this.select_index, index);
        for (var i = sel_start; i <= sel_end; ++i) {
          if (i == this.select_index) continue;
          s.push(this.visible_data[i]);
        }
      } else {
        s = [r];
      }

      this.select_index = index;
      for (var it of s) {
        if (e) it.selected = !it.selected;
        if (it.selected) this.selection.push(it);
        else this.selection.splice(this.selection.indexOf(it), 1);
      }

      this.selection_count = this.selection.length;
    },
    toggle_selection() {
      this.visible_data.forEach((x) => (x.selected = !x.selected));
      this.selection = this.visible_data.filter((x) => x.selected);
      this.selection_count = this.selection.length;
    },
    clear_selection(s) {
      if (typeof s === "undefined") s = this.visible_data;
      s.forEach((x) => {
        x.selected = false;
        this.selection.splice(this.selection.indexOf(x), 1);
      });
      this.selection_count = this.selection.length;
    },
    show_tagging_dialog() {
      if (this.selected_paragraphs().length > 0) {
        var existing_tags = new Set(
          this.selected_paragraphs().reduce((a, e) => a.concat(e.keywords), [])
        );
        this.$refs.tagging_dialog.show(Array.from(existing_tags));
      }
    },
    tag(e, append = true) {
      var s = this.selected_paragraphs();
      var existing_tags = new Set(
        this.selected_paragraphs().reduce((a, e) => a.concat(e.keywords), [])
      );
      var push = append ? e : e.filter((x) => !existing_tags.has(x)),
        pull = append
          ? []
          : Array.from(existing_tags).filter((x) => !e.includes(x));
      var updates = {
        ids: this.selected_ids(),
        $push: { keywords: push },
        $pull: { keywords: pull },
      };
      if (push.filter((x) => x.startsWith("@")))
        updates.author = push.filter((x) => x.startsWith("@"))[0];
      else if (pull.filter((x) => x.startsWith("@"))) updates.author = "";

      api.call("edit/paragraph/batch", updates).then((data) => {
        this.clear_selection(s);
        s.forEach((p) => {
          data.result[p._id] && (p.keywords = data.result[p._id].keywords);
        });
      });
    },
    delete_items() {
      var s = this.selected_paragraphs();
      var album_items = {},
        visible_album_items = {};

      this.selected_items().forEach((item) => {
        if (!album_items[item.paragraph_id])
          album_items[item.paragraph_id] = [];
        album_items[item.paragraph_id].push(item._id);
      });

      s.forEach((p) => {
        if (!visible_album_items[p._id]) visible_album_items[p._id] = [];
        visible_album_items[p._id].splice(
          0,
          0,
          ...(this.dialogs.paragraph.visible
            ? this.selected_items().map((i) => i._id)
            : p.images.map((i) => i._id))
        );
      });

      api
        .call("imageitem/delete", {
          album_items,
        })
        .then(() => {
          s.forEach((x) => {
            x.images = x.images.filter(
              (i) => !visible_album_items[x._id].includes(i._id)
            );
          });
          this.clear_selection(s);
        });
    },
    rating(val) {
      var s = this.selected_paragraphs();
      if (typeof val === "number") {
        val = {
          inc: val,
        };
      }
      val.ids = (val.item ? [val.item] : this.selected_items()).map(
        (x) => x._id
      );
      if (val.item) delete val.item;
      if (this.view_mode == "gallery") {
        api.call("imageitem/rating", val).then((data) => {
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
        var s = this.selected_paragraphs();
        s.forEach((x) => this.fav(x));
        this.clear_selection(s);
      }
    },
    group(del) {
      var s = this.selected_paragraphs();
      api
        .call("gallery/grouping", {
          ids: this.selected_ids(),
          delete: del,
        })
        .then((data) => {
          this.clear_selection(s);
          s.forEach(
            (p) =>
              (p.keywords = p.keywords
                .filter((x) => !x.startsWith("*0") && x !== data.result)
                .concat(data.result ? [data.result] : []))
          );
        });
    },
    merge() {
      var s = this.selected_paragraphs();
      api
        .call("paragraph/merge", {
          ids: this.selected_ids(),
        })
        .then(() => this.clear_selection(s));
    },
    split() {
      var s = this.selected_paragraphs();
      api
        .call("paragraph/split", {
          ids: this.selected_ids(),
        })
        .then(() => this.clear_selection(s));
    },
    reset_storage() {
      var s = this.selected_paragraphs();
      api
        .call("imageitem/reset_storage", {
          ids: this.selected_items().map((x) => x._id),
        })
        .then(() => this.clear_selection(s));
    },
  },
};
</script>

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

.gallery-toolbar > * {
  margin: 5px;
}

.gallery-toolbar {
  display: flex;
  clear: both;
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
  min-width: 250px;
  width: 25%;
}

.spacer {
  clear: right;
}
</style>