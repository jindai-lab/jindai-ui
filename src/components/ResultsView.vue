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
    <SelectableList :items="visible_data" ref="selectable" :view_mode="config.view_mode"
    :selection="selection"
    @start-view="view_page"></SelectableList>
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
      v-model="page_dialog.visible"
      class="page-view"
      ref="page_view"
      :paragraphs="visible_data"
      :view_mode="config.view_mode"
      :start_index="page_dialog.start_index"
      @browse="update_selection"
      @next="turn_page(page + 1)"
      @prev="turn_page(page - 1)"
      @info="show_info_dialog($event)"
      @rating="call_business('rating', { val: $event })"
    />

    <QuickActionButtons
      :selection_count="selection.length"
      @call="call_business"
      @play="play"
      @close="
        close_dialogs();
        selection.clear();
      "
      @toggle-selection="selection.toggle(visible_data)"
    />
  </v-sheet>
</template>

<script>
import PageView from "../views/PageView.vue";
import QuickActionButtons from "./QuickActionButtons";
import SelectableList from "./SelectableList";
import api from "../api";
import business from "../business";

export default {
  name: "ResultsView",
  props: {
    load: {},
  },
  components: {
    PageView,
    QuickActionButtons,
    SelectableList,
  },
  data() {
    return {
      total: 0,
      page: 1,
      value: [],
      token: null,
      page_range: [0, 0],
      sticky: [],
      browsing: {},
      browsing_item: {},
      config: new Proxy(api.config, {
        get(target, name) {
          return target[name];
        },
        set(target, name, val) {
          target[name] = val;
        },
      }),
      // page_view
      page_dialog: {
        visible: false,
        start_index: 0,
        item: {},
      },
      page_view: null,
      selection: new business.Selection([])
    };
  },
  watch: {
    page(val) {
      this.turn_page(val);
    },
    "page.visible": function (val) {
      if (!val && this.browsing._id) {
        var ele = document.querySelector(`[data-id="${this.browsing._id}"]`);
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
  },
  mounted() {
    this.start();
    this.page_view = this.$refs.page_view;
  },
  created() {
    window.addEventListener("keyup", this.page_hotkeys);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this.page_hotkeys);
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
    preload(items) {
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
    },
    loader(options) {
      var offset = options.offset,
        limit = options.limit;
      if (Array.isArray(this.load))
        return new Promise((accept) => accept(this.load.slice(offset, limit)));
      return this.load(options);
    },
    turn_page(p) {
      if (p === 0) return;

      history.pushState(
        "",
        "",
        api.querystring_stringify({
          page: this.page,
          ...api.querystring_parse(location.search),
        })
      );

      if (this.page !== p) this.page = p;

      window.scroll({
        top: (this.$refs.selectable || { offsetTop: 64 }).offsetTop - 64,
      });
      if (this._fetched()) {
        this._preload(this.visible_data);
        return;
      }

      this.total = null;
      this.loader({
        offset: this.offset,
        limit: api.config.page_size * 5,
      }).then((data) => {
        if (this.token > data.token) return;
        this.token = data.token;

        if (typeof data.result !== "undefined") {
          if (Array.isArray(data.result) && !data.result.length) {
            if (this.page > 1) this.page = 1;
            return;
          }

          this.selection.clear()
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

          this._preload(this.visible_data);
        }

        if (typeof data.total !== "undefined") this.total = data.total;

        this.$forceUpdate();
      });
    },
    _preload(items) {
      
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
    },
    update_selection(e) {
      this.browsing = e.paragraph; this.browsing_item = e.item;
      this.selection.clear(); this.selection.add(e.paragraph); this.selection.choose_item(e.item)
    },
    update_view_mode() {
      this.start();
    },
    show_info_dialog(target) {
      api.dialogs.info({ target });
    },
    show_edit_dialog(target) {
      api.dialogs.edit({ target }).then((target) => {
        api
          .call(
            `collections/${target.mongocollection || "paragraph"}/${
              target._id
            }`,
            target
          )
          .then(() => {
            api.notify(this.$t("saved"));
          });
      });
    },
    view_page(index) {
      this.page_dialog.visible = true;
      this.page_dialog.start_index = index;
      this.selection.clear();
    },
    play() {
      if (api.config.view_mode != "gallery") return;
      this.view_page(0);
      this.page_view.playing(api.config.playing_interval);
    },
    page_hotkeys(tags) {
      if (tags.target.tagName == "INPUT" || tags.target.tagName == "TEXTAREA")
        return;

      switch (tags.key.toLowerCase()) {
        // bind for turning page
        case "arrowleft":
          if (!this.page_dialog.visible) this.turn_page(this.page - 1);
          return;
        case "arrowright":
          if (!this.page_dialog.visible) this.turn_page(this.page + 1);
          return;

        default:
          return;
      }
    },
    close_dialogs() {
      this.page_dialog.visible = false;
      api.dialogs.close()
    },
    call_business(name, options) {
      if (typeof name == 'object') {
        options = name
        name = name.name
        delete options.name
      }
      if (!this.selection.length) return;
      var selection = new business.Selection(this.selection.paragraphs)
      business[name.replace("-", "_")]({
        selection,
        ...options,
      }).then(() => selection.paragraphs.forEach(x => this.selection.remove(x)));
    },
    search_tag(search, vm) {
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
            data = data || { result: [] };
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
  },
};
</script>

<style scoped>
.v-btn {
  margin-right: 12px;
}
</style>

<style>
.page .paragraph p,
.list .paragraph p {
  max-width: 960px;
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
