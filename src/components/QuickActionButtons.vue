<template>
  <div class="fabs">
    <v-badge
      bordered
      color="green darken-2"
      :content="'' + selection_count"
      :value="selection_count > 0"
      overlap
    >
      <v-btn fab small @click="$emit('toggle-selection')" @dblclick="$emit('close')">
        <v-icon>mdi-select-all</v-icon>
      </v-btn>
    </v-badge>

    <v-btn fab small @click="_emit('interactive-tagging')">
      <v-icon>mdi-tag</v-icon>
    </v-btn>

    <v-btn fab small @click="_emit('rating', { inc: 0.5 })">
      <v-icon>mdi-heart</v-icon>
    </v-btn>

    <v-btn fab small @click="_emit('group', { advanced: true, del: false })">
      <v-icon>mdi-group</v-icon>
    </v-btn>

    <v-menu top>
      <template v-slot:activator="{ on, attrs }">
        <v-btn fab small v-bind="attrs" v-on="on">
          <v-icon>mdi-dots-horizontal</v-icon>
        </v-btn>
      </template>

      <v-list class="pointer">
        <v-list-item>
          <v-list-item-title @click="$emit('toggle-fits')">
            {{ $t("fit-" + api.next_fit()) }}</v-list-item-title
          ></v-list-item
        >
        <v-list-item
          v-for="item in [
            { name: 'play', event: 'play' },
            'merge',
            'split',
            'reset-storage',
            'task',
            { name: 'delete', icon: 'mdi-delete', call: 'delete' },
          ].map((x) => (typeof x === 'object' ? x : { name: x, call: x }))"
          :key="item.name"
        >
          <v-list-item-title @click="item.call ? _emit(item.call) : $emit(item.event)">
            <v-icon v-if="item.icon">{{ item.icon }}</v-icon>
            {{ $t(item.name) }}</v-list-item-title
          >
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
import Vue from "vue";
export default {
  name: "QuickActionButtons",
  props: {
    selection_count: {
      type: Number,
      default: 0,
    },
    vm: {
      type: Vue,
    },
  },
  data: () => ({
    last_key: "",
  }),
  created() {
    window.addEventListener("keyup", this._keyup_handler);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this._keyup_handler);
  },
  methods: {
    _keyup_handler(e) {
      if (e.target.tagName == "INPUT" || e.target.tagName == "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "f":
          this.$emit("toggle-selection");
          break;
        case "g":
          this._emit("group", { del: e.altKey || e.ctrlKey, advanced: e.shiftKey });
          break;
        case "p":
          this._emit(e.altKey || e.ctrlKey ? "split" : "merge");
          break;
        case "t":
          this._emit(e.shiftKey ? "batch-tagging" : "interactive-tagging");
          break;
        case "@":
          this._emit("author");
          break;
        case "n":
          this._emit("tag", { val: [`noted:${new Date().toISOString()}`] });
          break;
        case "d":
        case "-":
        case "delete":
          if (this.last_key == e.key) {
            this._emit("delete");
            this.last_key = null;
          }
          break;
        case "q":
        case "`":
        case "escape":
          this.$emit("close");
          break;
        case "a":
        case "arrowup":
        case "arrowdown":
          this._emit("rating", { inc: e.key != "ArrowDown" ? 0.5 : -0.5 });
          break;
        case "r":
          if (this.last_key == e.key) {
            this._emit("reset-storage");
            this.last_key = null;
          }
          break;
        case "c":
        case "z":
        case "o":
          if (e.ctrlKey || e.metaKey) return;
          var sel_formatter = () => "";
          switch (e.key.toLowerCase()) {
            case "o":
              sel_formatter = (options) => options.selection.first.source.url;
              break;
            case "c":
              sel_formatter = (options) => ({
                q: `author=${
                  this.api.quote(options.selection.first.author) ||
                  options.selection.first.keywords.filter((x) => x.startsWith("@"))[0] ||
                  ""
                }`,
                groups: "none",
                sort: "-pdate",
              });
              break;
            case "z":
              sel_formatter = (options) => ({
                q: e.shiftKey
                  ? `source.url%\`${this.api
                      .escape_regex(options.selection.first.source.url)
                      .replace(/\/\d+\//, "/.*/")}\``
                  : `${
                      options.selection.first.gid ||
                      'id=o"' + options.selection.first._id + '"'
                    }=>expand()`,
                groups: "none",
              });
              break;
          }
          this._emit("open-window", { formatter: sel_formatter });
          break;
        case "i":
          this._emit("info-dialog");
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
          this._emit("short-tagging", {
            initial: e.key,
          });
          break;
        default:
          var pages = Object.values(this.business.plugin_pages).filter(
            (x) => x.keybind == e.key
          );
          if (pages.length) {
            this._emit("open-window", {
              formatter: (options) => {
                const { selection } = options;
                return {
                  archive: true,
                  q: `${this.api.scope(selection.first)};plugin('${this.format(
                    pages[0].format,
                    {
                      mediaitem: selection.first.images[0],
                      paragraph: selection.first,
                    }
                  )}');`,
                };
              },
            });
          }
          break;
      }

      this.last_key = this.last_key === null ? "" : e.key;
    },
    format(str, bundle) {
      function _replace(_, i) {
        var b = bundle;
        for (var k of i.split(".")) b = b[k] || "";
        return b;
      }
      return (typeof str == "string" && str.replace(/\{([\w\d._]+)\}/g, _replace)) || "";
    },
    _emit(name, bundle) {
      this.$emit("call", { name, ...bundle });
    },
  },
};
</script>

<style scoped>
.fabs {
  position: fixed;
  z-index: 300;
  bottom: 50px;
  right: 10px;
}
.fabs > * {
  margin: 5px;
  clear: both;
  display: block;
}
</style>
