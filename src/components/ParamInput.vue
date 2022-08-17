<template>
  <div>
    <v-autocomplete
      v-if="type_choices"
      :label="arg.name"
      :value="
        value === null || typeof value === 'undefined' ? arg.default : value
      "
      v-bind="$attrs"
      v-on="inputListeners"
      @change="inputListeners.input"
      :items="type_choices"
    >
    </v-autocomplete>

    <v-autocomplete
      :label="arg.name"
      v-bind="$attrs"
      v-on="inputListeners"
      :value="value"
      @change="inputListeners.input"
      :items="choices"
      :hint="(choices.filter((x) => x.value == value)[0] || {}).hint"
      persistent-hint
      item-value="value"
      item-text="text"
      v-else-if="arg.type == 'TASK' || arg.type == 'PIPELINE'"
    ></v-autocomplete>

    <v-combobox
      v-else-if="arg.type == 'DATASET'"
      :items="choices"
      :label="arg.name"
      v-bind="$attrs"
      v-on="inputListeners"
      :value="value"
      item-value="value"
      item-text="text"
      @change="inputListeners.input"
    ></v-combobox>

    <div v-else-if="arg.type == 'object'">
      <v-row v-for="(r, i) in keys" :key="r.name">
        <v-col
          ><v-text-field
            v-model="r.name"
            @input="update_object_value"
          ></v-text-field
        ></v-col>
        <v-col
          ><v-select
            :items="['str', 'int', 'float', 'bool']"
            v-model="r.type"
            @input="update_object_value"
          ></v-select
        ></v-col>
        <v-col
          ><ParamInput
            :arg="r"
            v-model="object_value[r.name]"
            @input="update_object_value"
        /></v-col>
        <v-col
          ><v-btn
            icon
            @click="
              keys.splice(i, 1);
              update_object_value();
            "
            ><v-icon>mdi-minus</v-icon></v-btn
          ></v-col
        >
      </v-row>
      <v-row>
        <v-btn icon @click="keys.push({ name: '', type: 'str' })"
          ><v-icon>mdi-plus</v-icon></v-btn
        >
      </v-row>
    </div>

    <div v-else-if="arg.type == 'bool'">
      <v-simple-checkbox
        :value="value"
        class="d-inline-block"
        ref="checkbox"
        v-bind="$attrs"
        v-on="inputListeners"
      >
      </v-simple-checkbox
      ><label @click="() => $refs.checkbox.click()">{{ arg.name }}</label>
    </div>

    <div v-else-if="arg.type == 'QUERY'">
      <label>{{ arg.name }}</label>
      <prism-editor
        class="my-editor match-braces"
        v-model="code"
        @input="$emit('input', code)"
        :highlight="highlighter"
        line-numbers
        @keyup.ctrl.enter="$emit('submit')"
      />
    </div>

    <v-textarea
      v-else-if="arg.type == 'str' || arg.type == 'string'"
      :value="value"
      v-bind="$attrs"
      v-on="inputListeners"
      :hint="arg.default"
      :required="!arg.default"
      :rows="(value || '').includes('\n') ? 4 : 1"
      cols="40"
      :label="arg.name"
    ></v-textarea>

    <div
      v-else-if="arg.type.startsWith('file')"
      @drop.prevent="drop_file"
      @dragover.prevent
      @click="$refs.input_file.click()"
      class="file-drop"
    >
      {{ file_prompt }}
      <input
        type="file"
        @change="drop_file({ dataTransfer: { files: $event.target.files } })"
        :accept="
          arg.type
            .substr(5)
            .split(',')
            .map((x) => `.${x}`)
            .join(', ')
        "
        ref="input_file"
      />
    </div>

    <v-text-field
      v-else
      type="text"
      :value="value"
      v-bind="$attrs"
      v-on="inputListeners"
      :placeholder="arg.default"
      :required="!arg.default"
      :label="arg.name"
    >
    </v-text-field>

    {{ prompt }}
  </div>
</template>

<script>
function input_func(vm) {
  return function (event) {
    var val = vm.validate(event);
    if (typeof val !== "undefined") {
      vm.prompt = "";
    } else {
      val = null;
    }
    if (val && typeof val.value !== "undefined") val = val.value;
    vm.$emit("validation", vm.prompt === "");
    vm.$emit("input", val);
  };
}

import api from "../api";
import { PrismEditor } from "vue-prism-editor";
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

// import highlighting library (you can use any library you want just return html string)
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/themes/prism-tomorrow.css"; // import syntax highlighting styles

export default {
  name: "ParamInput",
  inheritAttrs: false,
  props: ["value", "arg"],
  events: ["validation"],
  components: {
    PrismEditor,
  },
  computed: {
    inputListeners: function () {
      const vm = this;
      return Object.assign({}, this.$listeners, {
        input: input_func(vm),
      });
    },
    type_choices() {
      function _expand_choices(x) {
        return x
          .split("|")
          .map((x) => (x.includes(":") ? x.split(":") : [x, x]))
          .map((x) => ({ text: x[0], value: x[1] }));
      }

      switch (this.arg.type) {
        case "LANG":
          return _expand_choices(this.langs);
        default:
          if (this.arg.type.includes("|")) {
            return _expand_choices(this.arg.type);
          }
          var doc_choose = (this.arg.description || "").match(
            /@choose\((.*?)\)/
          );
          if (doc_choose) {
            return _expand_choices(doc_choose[1]);
          }
          return false;
      }
    },
  },
  data() {
    return {
      prompt: "",
      code: "",
      choices: [],
      file_prompt: this.$t("drop-in-files"),
      langs: this.$t("langs"),
      object_value: {},
      keys: [],
    };
  },
  watch: {
    arg() {
      this.update_choices();
    },
  },
  methods: {
    validate(val) {
      if (val === "") {
        if (
          typeof this.arg.default === "undefined" ||
          this.arg.default === null
        ) {
          this.prompt = this.$t("required");
          return;
        }
        return null;
      }
      switch (this.arg.type) {
        case "bool":
          return val;
        case "int":
          if (val.match(/^[+-]?\d+$/)) return parseInt(val);
          break;
        case "float":
        case "number":
          if (val.match(/^[+-]?\d?\.?\d+[eE]?[+-]?\d*$/))
            return parseFloat(val);
          break;
        default:
          return val;
      }
      this.prompt = this.$t("match-type", { type: this.arg.type });
      return;
    },
    highlighter(code) {
      return highlight(code, languages.clike); // languages.<insert language> to return html with markup
    },
    update_object_value() {
      if (this.arg.type !== "object") return;
      var val = {};
      for (var k of this.keys) {
        val[k.name] = this.object_value[k.name];
      }
      this.$emit("input", val);
    },
    refresh(val) {
      this.code = val;
      this.$emit("input", val);
    },
    update_choices() {
      switch (this.arg.type) {
        case "TASK":
        case "DATASET":
          api.call(this.arg.type.toLowerCase() + "s").then(
            (data) =>
              (this.choices = data.result.map((x) => ({
                text: x.name,
                value: this.arg.type == "TASK" ? x._id : x.name,
              })))
          );
          break;
        case "PIPELINE":
          api.help_langs.then(
            (data) =>
              (this.choices = [].concat(
                ...Object.values(data).map((x) =>
                  Object.keys(x).map((k) => ({
                    text: `${x[k].doc} ${k}`,
                    value: k,
                    hint: x[k].args
                      .map(
                        (x) =>
                          `${x.name} (${x.type}${
                            x.default !== null ? " optional" : ""
                          })`
                      )
                      .join(", "),
                  }))
                )
              ))
          );
          break;
        case "LANG":
          api.help_langs().then((data) => {
            for (var pair of Object.entries(data)) {
              let key = pair[0],
                val = pair[1];
              if (this.langs.indexOf(`:${key}`) >= 0) continue;
              this.langs += `|${val}:${key}`;
            }
          });
          break;
        case "object":
          this.keys = this.arg.keys || [];
      }
    },
    drop_file(e) {
      let types = this.arg.type.substr(5).split(",");
      let types_check = new RegExp("\\.(" + types.join("|") + ")$", "i");
      let droppedFiles = Array.from(e.dataTransfer.files).filter((x) =>
        x.name.match(types_check)
      );
      if (!droppedFiles.length) {
        api.notify(this.$t("match-file-type", { type: types.join(", ") }));
        return;
      }
      let file = droppedFiles[0];
      var reader = new FileReader();
      reader.onload = (e) => {
        this.$emit("input", e.target.result);
        this.file_prompt = file.name;
      };
      reader.onerror = (e) => console.log("Error : " + e.type);
      reader.readAsDataURL(file);
    },
  },
  mounted() {
    this.code = this.value;
    this.update_choices();
  },
};
</script>

<style scoped>
blockquote {
  color: red;
}

/* required class */
.my-editor {
  /* we dont use `language-` classes anymore so thats why we need to add background and text color manually */
  background: #2d2d2d;
  color: #ccc;

  /* you must provide font-family font-size line-height. Example: */
  font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 5px;
}

/* optional class for removing the outline */
.prism-editor__textarea:focus {
  outline: none;
}

.file-drop {
  border: 1px dashed dodgerblue;
  max-width: 200px;
  padding: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
