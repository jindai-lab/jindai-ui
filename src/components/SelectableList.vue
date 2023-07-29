<template>
  <div class="wrapper-container" ref="all_items" v-if="columns.includes('content')">
    <template v-for="(r, index) in items">
      <div class="spacer" v-if="r.spacer" :key="'spacer' + index"></div>
      <div class="paragraph" :data-id="r._id" v-else :key="'paragraph' + index">
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
              api.querystring_stringify({
                q: api.current_q(),
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
              api.querystring_stringify({
                q: `auto(${JSON.stringify(api.current_q())}),source.file=${api.quote(
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
        <div
          v-if="view_mode == 'gallery'"
          @dblclick="start_view(index)"
          @click="update_selection(r, $event.shiftKey, index)"
        >
          <div
            :class="{ selected: r.selected, 'before-image': true }"
            :v-key="`selector-${index}-${selection.length}`"
          ></div>
          <v-img
            v-if="view_mode == 'gallery'"
            :contain="api.config.contain"
            :height="240"
            :src="r.src"
          ></v-img>
        </div>
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

export default {
  name: "SelectableList",
  components: {
    ContentView,
    GalleryContentView,
  },
  data: () => ({
    select_index: -1,
  }),
  props: ["items", "active_item", "view_mode", "selection"],
  computed: {
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
    show_embedded(r, col) {
      var source = Object.assign({}, r);
      delete source[col];
      var target = { arr: r[col], source };
      this.api.dialogs.embedded(target);
    },
    show_info_dialog(target) {
      this.api.dialogs.info({ target });
    },
    show_edit_dialog(target) {
      this.api.dialogs.edit({ target }).then((target) => {
        this.business.edit_paragraph(target);
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
        this.selection.clear();
      }
      this.update_selection(this.items[selection_inc], e.shiftKey, selection_inc);
      ele = document.querySelector(`[data-id="${this.items[selection_inc]._id}"]`);
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
    start_view(index) {
      this.$emit("start-view", index);
    },
  },
};
</script>

<style scoped>
.page .paragraph p,
.list .paragraph p {
  max-width: 960px;
}

.page-view {
  overflow-y: auto;
  max-height: 100%;
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

.before-image.selected::before {
  content: "\f012c";
  color: green;
  font-family: "Material Design Icons";
  display: block;
  z-index: 4;
  position: absolute;
  margin: 0;
  font-size: 40px;
  width: 240px;
  height: 240px;
  background: rgba(255, 255, 255, 0.5);
}

.spacer {
  margin-right: 100%;
}
</style>
