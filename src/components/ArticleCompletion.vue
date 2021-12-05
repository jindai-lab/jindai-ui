<template>
  <v-card>
    <v-card-title>文本补全</v-card-title>
    <ParamInput :arg="{ name: '备选数量', type: 'int' }" v-model="n" />
    <ParamInput :arg="{ name: '概率阈限', type: 'float' }" v-model="topp" />
    <ParamInput ref="editor" :arg="{ name: '文本内容', type: 'str' }" v-model="text" />
    <v-btn @click="complete" color="primary">
      <v-icon>mdi-sync</v-icon> 补全
    </v-btn>
    <ul class="results">
      <li v-for="r in results" :key="r">{{ r }}
        <v-btn @click="append(r)" >
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </li>
    </ul>
  </v-card>
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
      original_prompt: '',
      results: []
    };
  },
  methods: {
    complete() {
      api.call("articlecompletion", { n: this.n, topp: this.topp, prompt: this.text }).then(data => {
        this.results = data.results
        this.original_prompt = data.config.prompt
      });
    },
    append(r) {
      this.text = this.original_prompt + r
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