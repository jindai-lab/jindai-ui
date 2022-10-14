<template>
  <v-sheet v-if="total !== 0" ref="results" :class="config.view_mode">
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
    <div class="wrapper-container" ref="all_items" v-if="columns.includes('content')">
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
                  groups: 'none'
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
                  q: `(${current_q()}),source.file=${quote(
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
            <v-btn
              @click="
                dialogs.info.target = r;
                dialogs.info.visible = true;
              "
            >
              <v-icon>mdi-information</v-icon>
              {{ $t("metadata") }}
            </v-btn>
            <v-btn
              @click="
                dialogs.edit.target = r;
                dialogs.edit.visible = true;
              "
            >
              <v-icon>mdi-file-edit-outline</v-icon>
              {{ $t("edit") }}
            </v-btn>
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn class="d-inline-block" v-on="on" v-bind="attrs">
                  <v-icon>mdi-send</v-icon>
                  {{ $t("send-task") }}
                </v-btn>
              </template>
              <v-list>
                <v-list-item
                  class="pointer"
                  v-for="(item, index) in dialogs.send_task.quicktasks"
                  :key="index"
                >
                  <v-list-item-title
                    @click="
                      set_selection([r]);
                      send_task(item.value);
                    "
                    >{{ item.text }}</v-list-item-title
                  >
                </v-list-item>
              </v-list>
            </v-menu>
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
          style="max-width: 50px"
          v-model="config.page_size"
        ></v-select>
      </div>
    </v-row>
    <!-- dialogs -->
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
          {{ $t("metadata") }}</v-card-title
        >
        <v-card-text>
          <v-row v-for="(v, k) in dialogs.info.target" :key="k">
            <v-col cols="4">{{ k }}</v-col>
            <v-col cols="8">{{ v }}</v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogs.info.visible = false"> {{ $t("ok") }} </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogs.edit.visible">
      <v-card>
        <v-card-title
          >{{ $t("edit-paragraph") }} {{ dialogs.edit.target._id }}
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
          <v-btn color="primary" @click="save()">{{ $t("save") }}</v-btn>
          <v-btn @click="dialogs.edit.visible = false">{{
            $t("cancel")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogs.embedded.visible">
      <v-card>
        <v-card-title>
          {{ $t("view") }} {{ querify(dialogs.embedded.target.source) }}
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

    <v-dialog v-model="dialogs.send_task.visible">
      <v-card>
        <v-card-title>
          {{ $t("send-task") }}
          <v-spacer></v-spacer>
          <v-btn icon @click="dialogs.send_task.visible = false"
            ><v-icon>mdi-close</v-icon></v-btn
          >
        </v-card-title>
        <v-card-text class="mt-5">
          <v-row>
            <v-col>
              <v-autocomplete
                dense
                :label="$t('send-to')"
                :items="dialogs.send_task.quicktasks"
                v-model="dialogs.send_task.pipeline"
              ></v-autocomplete>
              <v-btn
                color="primary"
                dense
                @click="$refs.quicktask_results.start(1)"
                ><v-icon>mdi-fast-forward</v-icon> {{ $t("run-now") }}</v-btn
              >
            </v-col>
          </v-row>
          <v-sheet>
            <ResultsView
              @load="quicktask"
              ref="quicktask_results"
              :total="dialogs.send_task.results_count"
            />
          </v-sheet>
        </v-card-text>
      </v-card>
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
      :scope="scope(selected_paragraphs())"
      @submit="tag($event, false)"
      @author="set_author"
    ></tagging-dialog>

    <QuickActionButtons
      :selection_count="selection_count"
      @toggle-selection="toggle_selection"
      @clear-selection="clear_selection"
      @delete="delete_items"
      @rating="rating(0.5)"
      @group="group"
      @tag="show_tagging_dialog"
      @merge="merge"
      @split="split"
      @task="send_task"
      @play="playing"
      :playing_interval="config.playing_interval"
      @reset-storage="reset_storage"
    />
  </v-sheet>
  <v-sheet v-else ref="results">未找到匹配的结果。</v-sheet>
</template>

<script>
import ParamInput from "./ParamInput";
import PageView from "../views/PageView.vue";
import ContentView from "./ContentView.vue";
import QuickActionButtons from "./QuickActionButtons";
import TaggingDialog from "./TaggingDialog.vue";
import TaggingShortcutsDialog from "./TaggingShortcutsDialog.vue";
import api from "../api";
export default {
  name: "ResultsView",
  props: {
    load: {},
  },
  components: {
    ParamInput,
    PageView,
    ContentView,
    QuickActionButtons,
    TaggingDialog,
    TaggingShortcutsDialog,
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
        send_task: {
          visible: false,
          quicktasks: [],
          pipeline: [],
          results_count: null,
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
    'dialogs.paragraph.visible': function (val) {
      if (!val && this.$refs.page_view.active_paragraph) {
        var ele = document.querySelector(`[data-id="${this.$refs.page_view.active_paragraph._id}"]`)
        window.scrollTo(0, ele.offsetTop)
      }
    }
  },
  computed: {
    pages() {
      var p = [];
      var total = (this.total || this.value.length);
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
  },
  mounted() {
    this.start();

    api.call("plugins/shortcuts").then((data) => {
      data = data.result;
      for (var k in data)
        this.dialogs.tagging_shortcuts.list.push({
          text: `${k} ${data[k]}`,
          value: data[k],
        });
    });

    api.call("tasks/shortcuts").then(
      (data) =>
        (this.dialogs.send_task.quicktasks = data.result.map((task) => ({
          text: task.name,
          value: task.pipeline,
        })))
    );

    api
      .call("plugins/filters")
      .then((data) => (this.plugin_pages = data.result));
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
    current_q() {
      return api.querystring_parse(location.search).q || '';
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
      if (p === 0) return;
      
      function _preload(items) {
      // preload images for every item
        items.map((x) => {
          if (x.images) {
            [... x.images.slice(0, 5), ... x.images.slice(-1)].map((i) => {
              if (i.item_type == 'image') {
                let image = new Image()
                image.src = api.get_item_image(i)
              }
            })
          }
        })
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
                return
              }

              this.selection = [];
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

              _preload(this.visible_data)
              if (typeof cb == "function") cb();
            }

            if (typeof data.total !== "undefined") this.total = data.total;

            this.$forceUpdate();
          },
        });
      } else {
        _preload(this.visible_data)
        if (typeof cb == "function") cb();
      }
    },
    update_view_mode() {
      this.start()
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
      if (api.config.view_mode != "gallery") return;
      this.view_page(0);
      this.$refs.page_view.playing(api.config.playing_interval);
    },
    _keyup_handler(e) {
      if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA") return;
      
      var selection_inc = 0, ele;
      var selection_line_number;
      if(this.$refs.all_items && document.querySelector('.paragraph'))
        selection_line_number = parseInt( this.$refs.all_items.clientWidth / document.querySelector('.paragraph').clientWidth)
          
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
        case "-":
        case "delete":
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
            this.rating(e.key != "ArrowDown" ? 0.5 : -0.5);
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
                if (e.ctrlKey) return;
                this._open_window({
                  q: `author=${
                    api.quote(_album.author) ||
                    _album.keywords.filter((x) => x.startsWith("@"))[0] ||
                    ""
                  }`,
                  groups: 'none'
                });
                break;
              case "z":
                this._open_window(
                  !e.shiftKey
                    ? `/?q=id%3D${_album._id}=>expand()&groups=none`
                    : `/?q=source.url%25%27${api
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
        case "h":
        case "j":
        case "k":
        case "l":
        case ";":
          // move selection in vim favor
          switch (e.key.toLowerCase()) {
            case "h":
              selection_inc = -1;
              break
            case "j":
              selection_inc = selection_line_number;
              break
            case "k":
              selection_inc = -selection_line_number;
              break
            case "l":
              selection_inc = 1;
              break;
            case ";":
              selection_inc = 0;
              break;
          }
          if (this.select_index < 0) selection_inc = 0;
          else selection_inc = Math.min(Math.max(0, this.select_index + selection_inc), this.visible_data.length);
          if (!e.ctrlKey && !e.shiftKey) {
            this.clear_selection();
          }
          this.update_selection(this.visible_data[selection_inc], e, selection_inc);
          ele = document.querySelector(`[data-id="${this.visible_data[selection_inc]._id}"]`);
          window.scrollTo(0, ele.offsetTop - ele.clientHeight)
          this.select_index = selection_inc;
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
            (x) => x.keybind == e.key
          );
          if (pages.length) {
            this._open_window({
              archive: true,
              q: `${this.scope(this.selected_paragraphs()[0])};plugin('${this.format(pages[0].format, {
                mediaitem: this.selected_items()[0],
                paragraph: this.selected_paragraphs()[0],
              })}')`,
            });
          }
          break;
      }

      this.last_key = this.last_key === null ? "" : e.key;
    },
    save() {
      api
        .call(
          `collections/${
            this.dialogs.edit.target.mongocollection || "paragraph"
          }/${this.dialogs.edit.target._id}`,
          this.dialogs.edit.target
        )
        .then(() => {
          this.dialogs.edit.target = null;
          api.notify({ title: this.$t("saved") });
        });
    },
    send_task(target) {
      this.dialogs.send_task.visible = true;
      if (target) {
        this.dialogs.send_task.pipeline = target;
        this.$refs.quicktask_results.start(1);
      }
    },
    format(str, bundle) {
      function _replace(_, i) {
        var b = bundle;
        for (var k of i.split(".")) b = b[k] || "";
        return b;
      }
      return (
        (typeof str == "string" && str.replace(/\{([\w\d._]+)\}/g, _replace)) ||
        ""
      );
    },
    quicktask(e) {
      api
        .call("quicktask", {
          pipeline: [
            [
              "JSONDataSource",
              {
                content: JSON.stringify(
                  this.selected_paragraphs().map((x) =>
                    Object.assign({}, x, { matched_content: null })
                  )
                ),
              },
            ],
            ...this.dialogs.send_task.pipeline.slice(1),
          ],
        })
        .then((data) => {
          e.callback({
            result: data.result,
            offset: 0,
            total: data.result.length,
            token: new Date().getTime(),
          });
        });
    },
    _open_window(url) {
      if (typeof url === "object") url = "/" + api.querystring_stringify(url);
      window.open(url);
    },
    _show_dialog(dialog) {
      this.drawer = false;
      this.dialogs[dialog] = true;
    },
    fav(r) {
      api.fav(r);
    },
    favored(r) {
      return api.favored(r);
    },
    quote: api.quote,
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

      this.selection_count = this.selection.length;
    },
    set_selection(sel) {
      this.clear_selection();
      sel.forEach((x) => (x.selected = true));
      this.selection = sel;
      this.selection_count = this.selection.length;
    },
    toggle_selection() {
      this.visible_data.forEach((x) => (x.selected = !x.selected));
      this.selection = this.visible_data.filter((x) => x._id && x.selected);
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
    set_author(author) {
      var s = this.selected_paragraphs();
      if (!s || !s.length) return;
      api
        .call(
          `collections/${s[0].mongocollection || "paragraph"}/batch`,
          {
            ids: this.selected_ids(),
            author,
            $push: {keywords: author}
          }
        )
        .then((data) => {
          this.clear_selection(s);
          s.forEach((p) => {
            data.result[p._id] && (p.author = data.result[p._id].author);
          });
        });
    },
    tag(e, append = true) {
      var s = this.selected_paragraphs();
      if (!s || !s.length) return;

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

      api
        .call(
          `collections/${s[0].mongocollection || "paragraph"}/batch`,
          updates
        )
        .then((data) => {
          this.clear_selection(s);
          s.forEach((p) => {
            data.result[p._id] && (Object.assign(p, data.result[p._id], {images: p.images}));
          });
        });
    },
    select_paragraph_item_objects(s) {

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

      return {
        album_items, visible_album_items
      }

    },
    delete_items() {
      var s = this.selected_paragraphs();
      var objs = this.select_paragraph_item_objects(s);
      api
        .call("mediaitem/delete", {
          album_items: objs.album_items,
        })
        .then(() => {
          s.forEach((x) => {
            x.images = x.images.filter(
              (i) => !objs.visible_album_items[x._id].includes(i._id)
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
          least: val > 0 ? 1 : -1,
        };
      }
      val.ids = (val.item ? [val.item] : this.selected_items()).map(
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
      var s = this.selected_paragraphs();
      if (!s || !s.length) return;
      var bundle = {
          ids: this.selected_ids(),
          ungroup: del,
        }
      if (!del && s.length == this.visible_data.length && s.map(x => x.keywords.filter(x => x.match(/^\*[^0]/))).reduce((p, c) => p.concat(c)).length == 0) {
        var cond = this.current_q().replace(/[()"`'%^@\\]/g, '').split(/[,|]/)[0]
        bundle.group = (prompt(this.$t('group'), cond) || '').replace(/^\*/, '')
      }
      api
        .call(`collections/${s[0].mongocollection || "paragraph"}/group`, bundle)
        .then((data) => {
          this.clear_selection(s);
          s.forEach(
            (p) =>
              (p.keywords = p.keywords
                .filter((x) => !x.startsWith("*") && x !== data.result)
                .concat(data.result ? [data.result] : []))
          );
        });
    },
    merge() {
      var s = this.selected_paragraphs();
      var objs = this.select_paragraph_item_objects(s);
      if (!s || !s.length) return;
      api
        .call(`collections/${s[0].mongocollection || "paragraph"}/merge`, {
          paragraphs: objs.album_items,
        })
        .then(() => this.clear_selection(s));
    },
    split() {
      var s = this.selected_paragraphs();
      var objs = this.select_paragraph_item_objects(s);
      if (!s || !s.length) return;
      api
        .call(`collections/${s[0].mongocollection || "paragraph"}/split`, {
          paragraphs: objs.album_items,
        })
        .then(() => this.clear_selection(s));
    },
    reset_storage() {
      var s = this.selected_paragraphs();
      api
        .call("mediaitem/reset_storage", {
          ids: this.selected_items().map((x) => x._id),
        })
        .then(() => this.clear_selection(s));
    },
    get_paragraph_image(i) {
      return api.get_paragraph_image(i);
    },
    querystring_stringify: api.querystring_stringify,
    scope: api.scope
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
</style>