<template>
  <v-card flat>
    <v-card-title>{{ $t("task-result") }} {{ id }}</v-card-title>
    <v-card-text>
      <p v-if="prompt" v-html="prompt"></p>
      <ResultsView
        @load="load_data"
        v-else-if="typeof total === 'number'"
        ref="results"
      />
      <iframe v-else-if="redirect" :src="redirect" />
      <div v-else>{{ $t("task-file-result") }}</div>
    </v-card-text>
  </v-card>
</template>

<script>
import api from "../api";
import ResultsView from "../components/ResultsView";

export default {
  name: "QueueResult",
  props: ["id"],
  components: { ResultsView },
  data() {
    return {
      total: 0,
      prompt: "",
      redirect: "",
    };
  },
  watch: {
    id() {
      this.$refs.results.turn_page(1);
    },
  },
  methods: {
    load_data(e) {
      var token = new Date().getTime() - Math.random();
      api
        .call(
          "queue/" +
            encodeURIComponent(this.id) +
            "?offset=" +
            e.offset +
            "&limit=" +
            e.limit
        )
        .then((data) => {
          if (data.__redirect__) {
            this.redirect = data.__redirect__;
            this.total = null;
          } else if (typeof data.__exception__ !== "undefined") {
            this.prompt = `<h4>${
              data.__exception__
            }</h4><pre>${data.__tracestack__.join("\n")}</pre>`;
          } else if (data.result) {
            this.total = data.result.total;
            e.callback({
              offset: e.offset,
              result: data.result.results,
              token,
            });
          }
        })
        .catch((ex) => {
          this.prompt =
            "<h4>" +
            ex.message +
            "</h4><p>" +
            ex.stack.replace(/\n/g, "<br>") +
            "</p>";
          this.total = undefined;
        });
    },
  },
};
</script>

<style scoped>
iframe {
  border: 0;
  width: 100%;
  height: calc(100vh - 220px);
}
</style>