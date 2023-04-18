<template>
  <v-sheet ref="results" :class="localConfig.view_mode">
    <div class="tools">
      <v-btn-toggle
        mandatory
        class="view-mode-toggler"
        dense
        v-model="localConfig.view_mode"
        @change="start(0)"
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
    <div class="count" v-show="count !== null">
      {{ $t("found-results", { count }) }}
    </div>
    <!-- divider -->
    <v-divider class="mt-5 mb-5"></v-divider>
    <!-- show content -->
    <SelectableList
      :items="value"
      class="selectable-list"
      ref="selectable"
      :view_mode="localConfig.view_mode"
      :selection="selection"
      @start-view="view_page"
    ></SelectableList>
    <!-- pagination -->
    <v-row class="mt-5">
      <v-pagination
        v-model="page"
        :length="pages.length"
        @change="turn_page"
      ></v-pagination>
      <div>
        <label> {{ $t("pagenum") }}</label>
        <v-text-field
          class="d-inline-block ml-1"
          style="max-width: 40px"
          type="number"
          dense
          :value="page"
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
          v-model="page_size"
        ></v-select>
      </div>
    </v-row>

    <PageView
      v-model="page_dialog.visible"
      class="page-view"
      ref="page_view"
      :paragraphs="value"
      :view_mode="localConfig.view_mode"
      :start_index="page_dialog.start_index"
      @browse="update_selection"
      @next="page++"
      @prev="page--"
      @info="show_info_dialog($event)"
      @rating="
        call_business('rating', typeof $event == 'object' ? $event : { val: $event })
      "
    />

    <QuickActionButtons
      :selection_count="selection.length"
      @call="call_business"
      @play="play"
      @close="
        close_dialogs();
        selection.clear();
      "
      @toggle-selection="selection.toggle()"
      @toggle-fits="toggle_fits"
    />
  </v-sheet>
</template>

<script lang="ts" setup>
import * as api from "@/api";
import { UIMediaItem, UIParagraph } from "@/api";
import { Paragraph } from "@/api/dbo";
import localConfig from "@/api/localConfig";
import { call } from "@/api/net";
import {
  Paging,
  ParagraphSelection,
  qsparse,
  qstringify,
  UpdaterFunction,
  UpdaterOptions,
} from "@/api/ui";
import { create_dialog, notify } from "@/dialogs";
import { computed, onBeforeUnmount, onMounted, PropType, ref, watch } from "vue";
import PageView from "../views/PageView.vue";
import QuickActionButtons from "./QuickActionButtons.vue";
import SelectableList from "./SelectableList.vue";

const props = defineProps({
  data: {
    type: Array as PropType<Paragraph[]>,
  },
  load: {
    type: Function as PropType<UpdaterFunction>,
  },
});

let count = 0,
  page = ref(1),
  page_size = ref(localConfig.page_size);
let value: UIParagraph[] = [],
  sticky: UIParagraph[] = [];
let page_dialog = {
  visible: ref(false),
  start_index: 0,
  item: {},
};
let browsing = new UIParagraph({}),
  browsing_item = new UIMediaItem({});

let selection = new ParagraphSelection<UIParagraph>([], UIParagraph);

const pages = computed(() => {
  var p = [];
  var total = count || value.length;
  if (total == -1) total = 1000 * 200;
  for (
    let index = 0, i = 1;
    index < total && i <= 1000;
    index += localConfig.page_size, i++
  ) {
    p.push(i);
  }
  return p;
});

const offset = computed(() => {
  page_size.value * page.value;
});

let paging = new Paging(localConfig.page_size, localConfig.page_size * 5, loader);

watch(page, (val: number) => {
  if (val > 0) turn_page(val);
  else page.value = 1;
});

watch(page_dialog.visible, (val: boolean) => {
  selection.clear();
  if (!val && browsing._id) {
    var ele = document.querySelector(`[data-id="${browsing._id}"]`);
    if (ele) window.scrollTo(0, (ele as HTMLElement).offsetTop);
  }
});

watch(page_size, (val) => {
  paging.page_size = val;
  paging.prefetch_size = val * 5;
  localConfig.page_size = 5;
  start(1);
});

function start(pagenum: number) {
  if (!pagenum) pagenum = +qsparse()["page"] || 1;
  count = 0;
  paging.reset();
  value = [];
  sticky = [];
  page.value = pagenum;
  turn_page(page.value);
}

page_size.value = localConfig.page_size;

onMounted(() => {
  window.addEventListener("keyup", page_hotkeys);
});

onBeforeUnmount(() => {
  window.removeEventListener("keyup", page_hotkeys);
});

function loader(options: UpdaterOptions) {
  const _mapper = (x: Partial<Paragraph>) => new UIParagraph(x);
  if (Array.isArray(props.data)) {
    count = props.data?.length || 0;
    return props.data?.slice(options.offset, options.offset + options.limit).map(_mapper);
  } else if (props.load) {
    let data = props.load(options);
    if (data) {
      if (typeof data.total !== "undefined") count = data.total;
      return data.result.map(_mapper);
    }
  }
  return [];
}

async function turn_page(p: number) {
  if (p === 0) return;

  history.pushState(
    "",
    "",
    qstringify({
      ...qsparse(location.search),
      page: p,
    })
  );

  window.scroll({
    top:
      ((document.querySelector(".selectable-list") as HTMLElement)?.offsetTop || 64) - 64,
  });

  let data = await (await paging.turn_page(p)).map((x) => new UIParagraph(x));
  selection.clear();

  if (data.length == 0 && p != 1) {
    page.value = 1;
    return;
  }

  var has_sticky = data.findIndex((x: object) => "spacer" in x) + 1;
  if (has_sticky > 0) {
    sticky = data.slice(0, has_sticky);
    data = data.slice(has_sticky + 1);
  }
  value = [...sticky, ...data];
}

function update_selection(e: { paragraph: UIParagraph; item: UIMediaItem }) {
  if (page_dialog.visible) {
    if (e.paragraph) browsing = e.paragraph;
    if (e.item) {
      browsing_item = e.item;
      selection.clear();
      selection.select(browsing);
      selection.chooseItem(browsing_item);
    }
  }
}

function show_info_dialog(bundle: object) {
  create_dialog("info", { bundle });
}

function show_edit_dialog(bundle: object) {
  create_dialog("edit", { bundle }).then((target: Partial<Paragraph>) => {
    call(
      `collections/${target.mongocollection || "paragraph"}/${target._id}`,
      "post",
      target
    ).then(() => {
      notify("saved");
    });
  });
}
function view_page(index: number) {
  page_dialog.visible.value = true;
  page_dialog.start_index = index;
  selection.clear();
}
function play() {
  if (localConfig.view_mode != "gallery") return;
  view_page(0);
  page_view.playing(localConfig.playing_interval);
}
function page_hotkeys(e: KeyboardEvent) {
  let el = e.target as HTMLElement;
  if (el?.tagName == "INPUT" || el?.tagName == "TEXTAREA") return;

  switch (e.key.toLowerCase()) {
    // bind for turning page
    case "arrowleft":
      if (!page_dialog.visible.value) page.value--;
      return;
    case "arrowright":
      if (!page_dialog.visible.value) page.value++;
      return;

    default:
      return;
  }
}

function close_dialogs() {
  page_dialog.visible.value = false;
  selection.clear();
  close_dialogs();
}

function toggle_fits(f: string) {
  localConfig.fit = f;
  page_view.apply_fit();
}

function call_business(
  name: string | { name: string; [attr: string]: any },
  options: { [attr: string]: any }
) {
  if (typeof name == "object") {
    options = name;
    name = name.name;
    delete options.name;
  }
  if (!selection.length) return;
  var sel = selection.paragraphs;
  name = name.replace("-", "_");
  if (name in api)
    api[name as keyof api]({
      selection,
      ...options,
    }).then(() => {
      if (!page_dialog.visible) sel.forEach((x: any) => selection.deselect(x));
    });
}
</script>

<style scoped>
.v-btn {
  margin-right: 12px;
}

.tools > .v-btn {
  margin-right: 12px;
}

.tools {
  padding-right: 12px;
  padding-bottom: 12px;
  text-align: right;
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

.view-mode-toggler {
  vertical-align: middle;
}

.view-mode-toggler > * {
  margin: 0;
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
