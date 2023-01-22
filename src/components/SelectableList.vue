<template>
  <div
    class="wrapper-container"
    ref="all_items"
    v-if="columns.includes('content')"
  >
    <template v-for="(r, index) in items">
      <div class="spacer" v-if="r.spacer" :key="'spacer' + index"></div>
      <div class="paragraph" :data-id="r._id" v-else :key="index">
        <div class="meta">
          <v-checkbox
            v-model="r.selected"
            dense
            hide-details
            class="d-inline-block"
            @change="update_selection(r, false, index)"
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
          v-if="view_mode == 'gallery'"
          :class="{ selected: r.selected }"
          @click="update_selection(r, $event.shiftKey, index)"
          @dblclick="$emit('start-view', index)"
          :contain="config.contain"
          :height="240"
          :src="get_paragraph_image(r)"
        ></v-img>
        <ContentView
          :key="r._id"
          :view_mode="view_mode"
          :paragraph="r"
          :item_width="200"
          :item_height="200"
          v-if="view_mode != 'gallery'"
        />
        <GalleryContentView
          :key="'g' + r._id"
          :view_mode="view_mode"
          :paragraph="r"
          :item_width="200"
          :item_height="200"
          v-else
        />
        <div class="mt-10 operations">
          <v-btn @click="$emit('start-view', index)">
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
        <tr v-for="(r, index) in items" :key="index">
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
</template>

<script>
import ContentView from "./ContentView.vue";
import GalleryContentView from "./GalleryContentView.vue";
import api from "../api";
import business from "../business"

export default {
  name: "SelectableList",
  components: {
    ContentView,
    GalleryContentView
  },
  data: () => ({
    browsing_item: {},
    select_index: -1,
    config: new Proxy(api.config, {
      get(target, name) {
        return target[name];
      },
      set(target, name, val) {
        target[name] = val;
      },
    }),
  }),
  props: ["items", "active_item", "view_mode", "selection"],
  computed: {
    selected_paragraphs() {
      return Array.from(this.selection.paragraphs);
    },
    selected_ids() {
      return this.selection.paragraphs.map((x) => x._id);
    },
    columns() {
      var cols = new Set();
      for (var r of this.items) {
        for (var k in r) cols.add(k);
      }
      return Array.from(cols).sort();
    },
  },
  created() {
    window.addEventListener("keyup", this.select_shortcut_keys);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this.select_shortcut_keys);
  },
  methods: {
    querystring_stringify: api.querystring_stringify,
    show_embedded(r, col) {
      var source = Object.assign({}, r);
      delete source[col];
      var target = { arr: r[col], source };
      api.dialogs.embedded(target);
    },
    select_shortcut_keys(e) {
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

        default:
          return;
      }

      if (this.select_index < 0) selection_inc = 0;
      else
        selection_inc = Math.min(
          Math.max(0, this.select_index + selection_inc),
          this.items.length
        );
      if (!e.ctrlKey && !e.shiftKey) {
        this.selection.clear()
      }
      this.update_selection(this.items[selection_inc], e.shiftKey, selection_inc);
      ele = document.querySelector(
        `[data-id="${this.items[selection_inc]._id}"]`
      );
      window.scrollTo(0, ele.offsetTop - ele.clientHeight);
      this.select_index = selection_inc;

      if (this.$refs.all_items && document.querySelector(".paragraph"))
        selection_line_number = parseInt(
          this.$refs.all_items.clientWidth /
            document.querySelector(".paragraph").clientWidth
        );
    },
    // selection
    update_selection(r, continuous, index) {
      var s = [];
      if (continuous && this.select_index >= 0) {
        document.getSelection().removeAllRanges();
        let sel_start = Math.min(this.select_index, index),
          sel_end = Math.max(this.select_index, index);
        for (var i = sel_start; i <= sel_end; ++i) {
          if (i == this.select_index || this.items[i].spacer) continue;
          s.push(this.items[i]);
        }
      } else {
        s = [r];
      }

      this.select_index = index;
      for (var it of s) {
        if (!it.selected) this.selection.add(it);
        else this.selection.remove(it);
      }
    },
    current_q() { return  api.current_q},
    quote: api.quote,
    get_paragraph_image(i) {
      return api.get_paragraph_image(i);
    },
  },
};
</script>