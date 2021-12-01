<template>
  <div>
    <div @click="show_finished = true">
    <v-badge
      :value="data.finished.length > 0"
      :content="data.finished.length"
    >
    处理结果
    </v-badge>
    <v-badge
      :value="data.waiting > 0"
      :content="data.waiting"
    >
    等待中
    </v-badge>
     正在运行:
    {{ data.running || "无" }}
    </div>
  </div>
</template>

<script>
import api from "../api";

export default {
  data() {
    return {
      show_finished: false
    };
  },
  props: ["data"],
  methods: {
    download_link(task) {
      return '/api/queue/' + encodeURIComponent(task.id)
    },
    delete_result(task) {
      var id = encodeURIComponent(task.id)
      api.delete("queue/" + id).then(() => {
        api.notify({ title: "成功删除" });
        this.$emit('updated', this.data.filter(x => x.id !== id))
      });
    },
    view_result(task) {
      var id = encodeURIComponent(task.id)
      this.$router.push("/results/" + id).catch(()=>{});
      this.show_finished = false;
    },
  },
};
</script>

<style scoped>
.click-here > span {
  border-radius: 5px;
  line-height: 100%;
  text-align: center;
  min-width: 14px;
  background-color: green;
  display: inline-block;
}
</style>