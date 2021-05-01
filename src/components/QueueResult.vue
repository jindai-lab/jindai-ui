<template>
  <div>
    <h3>任务结果 {{ id }}</h3>
    <ResultsView :value="results" v-if="Array.isArray(results)" />
    <div v-else>结果为文件或其他类型，请直接下载</div>
  </div>
</template>

<script>
import api from "../api";
import ResultsView from "./ResultsView";

export default {
  name: "QueueResult",
  props: ["id"],
  components: { ResultsView },
  data() {
    return {
      results: [],
    };
  },
  mounted() {
    api.call("queue/" + this.id).then((data) => (this.results = data));
  },
  watch: {
    id () {
      api.call("queue/" + this.id).then((data) => (this.results = data));
    }
  }
};
</script>
