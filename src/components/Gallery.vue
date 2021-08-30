<template>
  <div>
    <h3>图集</h3>
    <div class="mui-panel">
      <div id="selectors" class="mui-row">
        <div class="mui-select mui-col-md-4">
          <select name="collection" id="collection" v-model="selected_dataset">
            <option value="">默认</option>
            <option v-for="ds in datasets" :value="ds.id" :key="ds.id">
              {{ ds.name }}
            </option>
          </select>
        </div>
        <div class="mui-select mui-col-md-2">
          <select name="sort" id="sort" v-model="sort">
            <option value="">默认排序</option>
            <option value="year">从旧到新</option>
            <option value="-year">从新到旧</option>
            <option value="pdffile,pdfpage">出处</option>
          </select>
        </div>
      </div>
      <div id="search">
        <div class="mui-textfield">
          <input type="text" v-model="q" @keyup.enter="search" />
        </div>
      </div>
      <div class="clear"></div>
      <button id="search" class="mui-btn" @click="search">查询</button>
    </div>
    <div v-if="total">
      共找到 {{ total }} 个结果。
    </div>
    <ResultsView :total="total" @load="load_search" ref="results" />
  </div>
</template>
    
<script>
import api from "../api";
import ResultsView from "./ResultsView";

export default {
  name: "Gallery",
  components: { ResultsView },
  data() {
    return {
      collections: [],
      datasets: [],
      selected_dataset: "",
      selected_collections: [],
      q: "",
      req: {},
      sort: "",
      querystr: "",
      reqstr: "",
      total: 0,
    };
  },
  mounted() {
    api.call("meta").then((data) => {
      this.datasets = data.result.datasets.map((x) => {
        return { name: x[1], id: x[0] };
      });
      this.collections = data.result.collections
    });
  },
  methods: {
    search () {}
  },
};
</script>

<style scoped>
span.mui-checkbox {
  float: left;
  margin: 5px;
}

.clear {
  clear: both;
}
</style>