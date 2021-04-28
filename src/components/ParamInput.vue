<template>
  <div class="mui-textfield">
    <div class="mui-select"
      v-if="arg.type.indexOf('|') >= 0"
    >
    <select
      :value="value"
      v-bind="$attrs"
      v-on="inputListeners"
    >
      <option value="" v-if="arg.default">默认</option>
      <option v-for="opt in arg.type.split('|')" :key="opt">{{ opt }}</option>
    </select>
    </div>
    <input
      v-else-if="arg.type == 'bool'"
      type="checkbox"
      :checked="value"
      v-bind="$attrs"
      v-on="inputListeners"
    />
    <textarea
      v-else-if="arg.type == 'str'"
      :value="value"
      v-bind="$attrs"
      v-on="inputListeners"
      :placeholder="arg.default || '必填'"
      rows="4"
      cols="40"
    ></textarea>
    <input
      v-else
      type="text"
      :value="value"
      v-bind="$attrs"
      v-on="inputListeners"
      :placeholder="arg.default || '必填'"
    />

    <label>{{ arg.name }}</label>
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
      vm.$emit("input", val);
    }
  };
}

export default {
  inheritAttrs: false,
  props: ["value", "arg"],
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
    };
  },
  methods: {
    validate(val) {
      if (val === "") {
        if (!this.arg.default) {
          this.prompt = "必填"
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
          if (val.match(/^[+-]?\d?\.?\d+[eE]?[+-]?\d*$/))
            return parseFloat(val);
          break;
        default:
          return val;
      }
      this.prompt = "请输入一个符合 " + this.arg.type + " 类型的值";
      return undefined;
    },
  },
  mounted() {
  },
};
</script>

<style scoped>
blockquote {
  color: red;
}
</style>