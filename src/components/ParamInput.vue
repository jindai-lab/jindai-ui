<template>
  <div>
    <v-select
      v-if="arg.type.indexOf('|') >= 0 || arg.type == 'LANG'"
      :label="arg.name"
      :value="
        value === null || typeof value === 'undefined' ? arg.default : value
      "
      v-bind="$attrs"
      v-on="inputListeners"
      @change="inputListeners.input"
      :items="
        (arg.type == 'LANG' ? langs : arg.type)
          .split('|')
          .map((x) => (x.includes(':') ? x.split(':') : [x, x]))
          .map((x) => ({ text: x[0], value: x[1] }))
      "
    >
    </v-select>

    <v-autocomplete
      :label="arg.name"
      v-bind="$attrs"
      v-on="inputListeners"
      :value="value"
      @change="inputListeners.input"
      :items="choices"
      item-value="value"
      item-text="text"
      v-else-if="arg.type == 'TASK'"
    ></v-autocomplete>

    <v-combobox
      v-else-if="arg.type == 'COLLECTION'"
      :items="choices"
      :label="arg.name"
      v-bind="$attrs"
      v-on="inputListeners"
      :value="value"
      item-value="value"
      item-text="text"
      @change="inputListeners.input"
    ></v-combobox>

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
    if (typeof val.value !== "undefined") val = val.value;
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
  },
  data() {
    return {
      prompt: "",
      code: "",
      choices: [],
      langs: '自动:auto|简体中文:chs|繁体中文:cht|英文:en|德文:de|法文:fr|俄文:ru|西班牙文:es|葡萄牙文:pt|日文:ja|韩文/朝鲜文:kr|越南文:vn'
    };
  },
  watch: {
    arg() {
      this.update_choices()
    },
  },
  methods: {
    validate(val) {
      if (val === "") {
        if (
          typeof this.arg.default === "undefined" ||
          this.arg.default === null
        ) {
          this.prompt = "必填";
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
      this.prompt = "请输入一个符合 " + this.arg.type + " 类型的值";
      return;
    },
    highlighter(code) {
      return highlight(code, languages.clike); // languages.<insert language> to return html with markup
    },
    refresh(val) {
      this.code = val;
      this.$emit("input", val);
    },
    update_choices() {      
      switch (this.arg.type) {
        case "TASK":
        case "COLLECTION":
          api.call(this.arg.type.toLowerCase() + "s").then((data) => (this.choices = data.result.map((x) => ({
            text: x.name,
            value: this.arg.type == 'TASK' ? x._id : x.name,
          }))));
          break;
      }
    }
  },
  mounted() {
    this.code = this.value;
    this.update_choices()
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
</style>
