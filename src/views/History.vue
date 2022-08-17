<template>
  <v-card flat>
    <v-card-title>{{ $t("history") }}</v-card-title>
    <v-card-text>
      <v-row v-for="h in history" :key="h._id">
        <v-col>{{ h.user }}</v-col>
        <v-col>{{ h.created_at }}</v-col>
        <v-col cols="6" v-text="h.queries.join('\n')"></v-col>
        <v-col>
          <v-btn icon @click="export_query(h)">
            <v-icon>mdi-file-export</v-icon>
          </v-btn>
          <v-btn icon @click="replay(h)">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import api from "../api";

export default {
  data() {
    return { history: [] };
  },
  mounted() {
    api.call("history").then((data) => (this.history = data.result));
  },
  methods: {
    export_query(h) {
      api
        .put("tasks/", {
          pipeline: [
            [
              "DBQueryDataSource",
              {
                query: h.queries[0],
              },
            ],
          ],
          name: this.$t("search") + " " + h.queries[0],
        })
        .then((data) => this.$router.push("/tasks/" + data.result))
        .catch(() => {});
    },
    replay(h) {
      this.$router.push(
        "search?q=" +
          encodeURIComponent(h.queries[0]) +
          "&req=" +
          encodeURIComponent(h.queries[1])
      );
    },
  },
};
</script>
