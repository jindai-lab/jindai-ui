<template>
  <div>
    <h3>检索历史</h3>
    <div class="mui-row mui-panel" v-for="h in history" :key="h._id">
      <div class="mui-col-md-2">{{ h.user }}</div>
      <div class="mui-col-md-2">{{ h.created_at }}</div>
      <div class="mui-col-md-6">{{ h.querystr }}</div>
      <div class="mui-col-md-2">
        <button class="mui-btn" @click="export_query(h.querystr)">
          <i class="fa fa-share"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import api from "../api";

export default {
  data() {
    return { history: [] };
  },
  mounted() {
    api.call("history").then((resp) => (this.history = resp.data.result));
  },
  methods: {
    export_query(q) {
      api
        .put("tasks/", {
          datasource_config: {
            query: q,
          },
          name: '搜索 ' + q
        })
        .then((resp) => this.$router.push("/tasks/" + resp.data.result));
    },
  },
};
</script>
