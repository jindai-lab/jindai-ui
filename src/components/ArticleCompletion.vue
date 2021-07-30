<template>
  <div>
    <h3>文本补全</h3>
    <ParamInput class="mui-textfield" :arg="{ name: '备选数量', type: 'int' }" v-model="n" />
    <ParamInput class="mui-textfield" :arg="{ name: '概率阈限', type: 'float' }" v-model="topp" />
    <ParamInput ref="editor" class="mui-textfield" :arg="{ name: '文本内容', type: 'str' }" v-model="text" />
    <button @click="complete" class="mui-btn mui-btn--primary">
      <font-awesome-icon icon="sync" /> 补全
    </button>
    <ul class="results">
      <li v-for="r in results" :key="r">{{ r }}</li>
    </ul>
  </div>
</template>

<script>
import ParamInput from "./ParamInput";
import api from "../api";

export default {
  name: "CollectionList",
  components: {
    ParamInput,
  },
  data() {
    return {
      text: '',
      topp: 0.95,
      n: 5,
      results: []
    };
  },
  methods: {
    complete() {
      api.call("articlecompletion", { n: this.n, topp: this.topp, prompt: this.text }).then(data => this.results = data.results);
    }
  },
};
</script>

<style scoped>
label {
  font-size: 20px;
  text-align: right;
  vertical-align: baseline;
  line-height: 64px;
}
[disabled] {
  opacity: 0;
}
ul.results {
  list-style: none;
}
ul.results>li {
  line-height: 200%;
}
</style>