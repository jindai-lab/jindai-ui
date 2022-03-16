<template>
  <v-card flat>
    <v-card-title>检索历史</v-card-title>
    <v-card-text>
    <v-row v-for="h in history" :key="h._id">
      <v-col>{{ h.user }}</v-col>
      <v-col>{{ h.created_at }}</v-col>
      <v-col cols="6">{{ h.querystr }}</v-col>
      <v-col>
        <v-btn icon @click="export_query(h)">
          <v-icon>mdi-share</v-icon>
        </v-btn>
        <v-btn icon @click="replay(h)">
          <v-icon>mdi-replay</v-icon>
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
          datasource_config: {
            query: h.querystr
          },
          name: '搜索 ' + h.querystr
        })
        .then((data) => this.$router.push("/tasks/" + data.result)).catch(()=>{});
    },
    replay(h) {
      this.$router.push('search?q=' + encodeURIComponent('?' + h.querystr))
    }
  },
};
</script>
