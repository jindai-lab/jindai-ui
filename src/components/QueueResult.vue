<template>
  <v-card flat>
    <v-card-title>任务结果 {{ id }}</v-card-title>
    <v-card-text>
    <ResultsView @load="load_data" :total="total" v-if="typeof(total) === 'number'" ref="results" />
    <div v-else v-html="prompt || '结果为文件或其他类型，请直接下载'"></div>
    </v-card-text>
  </v-card>
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
      total: 0,
      prompt: ''
    };
  },
  watch: {
    id () {
      this.$refs.results.turn_page(1)
    }
  },
  methods: {
    load_data(e) {
      api.call("queue/" + encodeURIComponent(this.id) + '?offset=' + e.offset + '&limit=' + e.limit).then(data => {
        this.total = data.result.total
        e.callback({
          offset: e.offset,
          result: data.result.results
        })
      }).catch(ex => {
        this.prompt = '<h4>' + ex.message + '</h4><p>' + ex.stack.replace(/\n/g, '<br>') + '</p>'
        this.total = undefined
      })
    }
  }
};
</script>
