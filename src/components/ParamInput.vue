<template>
  <div>
    <div class="mui-select" v-if="arg.type.indexOf('|') >= 0">
      <select
        :value="value"
        v-bind="$attrs"
        v-on="inputListeners"
        @change="inputListeners.input"
        :required="!arg.default"
      >
        <option value="" v-if="arg.default">默认</option>
        <option v-for="opt in arg.type.split('|')" :key="opt">{{ opt }}</option>
      </select>
      <label>{{ arg.name }}</label>
    </div>

    <div class="mui-checkbox" v-else-if="arg.type == 'bool'">
      <label><input
        type="checkbox"
        value="true"
        :checked="value"
        v-bind="$attrs"
        v-on="inputListeners"
      />
      {{ arg.name }}</label>
    </div>
    <div class="mui-textfield" v-else-if="arg.type == 'js' || arg.name == 'query' || arg.name == 'cond'">
      <prism-editor class="my-editor match-braces"
        v-model="code"
        @input="$emit('input', code)"
        :highlight="highlighter"
        line-numbers />
      <label>{{ arg.name }}</label>
    </div>
    <div class="mui-textfield" v-else-if="arg.type == 'str' || arg.type == 'string'">
      <textarea
        :value="value"
        v-bind="$attrs"
        v-on="inputListeners"
        :placeholder="arg.default"
        :required="!arg.default"
        :rows="arg.length > 20 ? 4 : 1"
        cols="40"
      ></textarea>
      <label>{{ arg.name }}</label>
    </div>
    <div class="mui-textfield" v-else>
      <input
        type="text"
        :value="value"
        v-bind="$attrs"
        v-on="inputListeners"
        :placeholder="arg.default"
        :required="!arg.default"
      />
      <label>{{ arg.name }}</label>
    </div>
    <blockquote>{{ prompt }}</blockquote>
  </div>
</template>

<script>
function input_func(vm) {
  return function (event) {
    var val = vm.validate(
      vm.arg.type === "bool" ? event.target.checked : event.target.value
    );
    if (typeof val !== "undefined") {
      vm.prompt = "";
    } else {
      val = null
    }
    vm.$emit("validation", vm.prompt === "");
    vm.$emit("input", val);
  };
}

import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere

// import highlighting library (you can use any library you want just return html string)
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/themes/prism-tomorrow.css'; // import syntax highlighting styles

export default {
  inheritAttrs: false,
  props: ["value", "arg"],
  events: ["validation"],
  components: {
    PrismEditor
  },
  computed: {
    inputListeners: function () {
      var vm = this;
      return Object.assign({}, this.$listeners, {
        input: input_func(vm),
      });
    },
  },
  data() {
    return {
      prompt: "",
      code: "",
    };
  },
  methods: {
    validate(val) {
      if (val === "") {
        if (!this.arg.default) {
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
      this.code = val
      this.$emit('input', val)
    }
  },
  mounted () {
    this.code = this.value
  }
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