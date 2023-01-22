<template>
  <div class="fabs">
    <v-badge
      bordered
      color="green darken-2"
      :content="'' + selection_count"
      :value="selection_count > 0"
      overlap
    >
      <v-btn
        fab
        small
        @click="$emit('toggle-selection')"
        @dblclick="$emit('clear-selection')"
      >
        <v-icon>mdi-select-all</v-icon>
      </v-btn>
    </v-badge>

    <v-btn fab small @click="$emit('tag')">
      <v-icon>mdi-tag</v-icon>
    </v-btn>

    <v-btn fab small @click="$emit('rating',{inc: 0.5})">
      <v-icon>mdi-heart</v-icon>
    </v-btn>

    <v-btn fab small @click="$emit('group')">
      <v-icon>mdi-group</v-icon>
    </v-btn>

    <v-menu top>
      <template v-slot:activator="{ on, attrs }">
        <v-btn fab small v-bind="attrs" v-on="on">
          <v-icon>mdi-dots-horizontal</v-icon>
        </v-btn>
      </template>

      <v-list class="pointer">
        <v-list-item
          v-for="item in ['play', 'merge', 'split', 'reset-storage', 'task']"
          :key="item"
        >
          <v-list-item-title @click="$emit(item)">{{
            $t(item)
          }}</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-title @click="$emit('delete')">
            <v-icon>mdi-delete</v-icon>
            {{ $t("delete") }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
import Vue from 'vue';
import api from '../api'
export default {
  name: "QuickActionButtons",
  props: {
    selection_count: {
      type: Number,
      default: 0,
    },
    vm: {
      type: Vue
    }
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
          this.$emit('toggle-selection');
          break;
        case "g":
          this.vm.group(e.altKey || e.ctrlKey);
          break;
        case "p":
          e.altKey || e.ctrlKey ? this.vm.split() : this.vm.merge();
          break;
        case "t":
          if (e.shiftKey) this.vm.show_batch_tagging_dialog();
          else this.vm.show_tagging_dialog();
          break;
        case "@":
          this.vm.show_author_dialog();
          break;
        case "n":
          this.vm.tag([`noted:${new Date().toISOString()}`]);
          break;
        case "d":
        case "-":
        case "delete":
          if (this.last_key == e.key) {
            this.$emit('delete')
            this.last_key = null;
          }
          break;
        case "q":
        case "`":
        case "escape":
          this.$emit('clear-selection')
          this.$emit('close')
          break;
        case "a":
        case "arrowup":
        case "arrowdown":
          this.$emit('rating', {inc: e.key != "ArrowDown" ? 0.5 : -0.5})
          break;
        case "r":
          if (this.last_key == e.key) {
            this.$emit('reset-storage');
            this.last_key = null;
          }
          break;
        case "c":
        case "z":
        case "o":
        case "i":
          if (e.ctrlKey || e.metaKey) return;
          var paragraph = this.vm.selected_paragraphs[0];
          if (paragraph) {
            switch (e.key.toLowerCase()) {
              case "o":
                api.open_window(paragraph.source.url);
                break;
              case "c":
                if (e.ctrlKey) return;
                api.open_window({
                  q: `author=${
                    api.quote(paragraph.author) ||
                    paragraph.keywords.filter((x) => x.startsWith("@"))[0] ||
                    ""
                  }`,
                  groups: "none",
                  sort: "-pdate",
                });
                break;
              case "z":
                api.open_window(
                  "/" +
                    api.querystring_stringify({
                      q: e.shiftKey
                        ? `source.url%\`${api
                            .escape_regex(paragraph.source.url)
                            .replace(/\/\d+\//, "/.*/")}\``
                        : `${
                            paragraph.gid || 'id=o"' + paragraph._id + '"'
                          }=>expand()`,
                      groups: "none",
                    })
                );
                break;
              case "i":
                this.vm.show_info_dialog(paragraph);
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
          if (this.vm.selected_paragraphs.length > 0) {
            api.dialogs
              .prompt({
                title: this.$t("tagging"),
                choices: this.vm.match_shortcuts,
                initial: e.key,
              })
              .then((tags) => this.vm.tag(tags, true));
          }
          break;
        default:
          var pages = Object.values(this.vm.plugin_pages).filter(
            (x) => x.keybind == e.key
          );
          if (pages.length) {
            api.open_window({
              archive: true,
              q: `${api.scope(
                this.vm.selected_paragraphs[0]
              )};plugin('${this.format(pages[0].format, {
                mediaitem: this.vm.selected_items[0],
                paragraph: this.vm.selected_paragraphs[0],
              })}');`,
            });
          }
          break;
      }

      this.last_key = this.last_key === null ? "" : e.key;
    },
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