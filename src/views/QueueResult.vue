<template>
  <v-card flat>
    <v-card-title>{{ $t("task-result") }} {{ id }}</v-card-title>
    <v-card-text>
      <p v-if="prompt" v-html="prompt"></p>
      <ResultsView
        :key="'results-' + id"
        :load="load_data"
        v-else-if="typeof total === 'number'"
        ref="results"
      />
      <iframe v-else-if="redirect" :src="redirect" />
      <div v-else>{{ $t("task-file-result") }}</div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">

import ResultsView from "../components/ResultsView.vue";
import { DataError, call } from "@/api/net";
import { UpdaterOptions } from "@/api/ui";

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
  methods: {
    async load_data(e: UpdaterOptions) {
      var token = new Date().getTime() - Math.random();
      try {
        let data = await call<JobResult>(
          "queue/" +
            encodeURIComponent(this.id) +
            "?offset=" +
            e.offset +
            "&limit=" +
            e.limit
        )
          if (data.__redirect__) {
            this.redirect = data.__redirect__;
            this.total = -1;
          } else if (data) {
            this.total = data.total;
            
          }

          if (data.__exception__) {

          }

          return {
              result: data.results,
              token,
              total: data.total
            }
        
      } catch (e) {
        let ex = e as DataError
        this.prompt =
            "<h4>" +
            ex.message +
            "</h4><p>" +
            ex.remoteStack.join("<br>") +
            "</p>";
          this.total = -1;
      }
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