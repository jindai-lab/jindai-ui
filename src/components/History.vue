<template>
  <div>
    <h3>检索历史</h3>
    <div class="mui-row mui-panel" v-for="h in history" :key="h._id">
      <div class="mui-col-md-2">{{ h.user }}</div>
      <div class="mui-col-md-2">{{ h.created_at }}</div>
      <div class="mui-col-md-6">{{ h.querystr }}</div>
      <div class="mui-col-md-2">
        <button class="mui-btn" @click="export_query(h)">
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
        .then((data) => this.$router.push("/tasks/" + data.result));
    },
  },
};
</script>
