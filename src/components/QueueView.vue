<template>
  <div>
    处理队列:
    <a
      @click="show_finished = true"
      href="javascript:void(0)"
      :class="data.finished.length > 0 ? 'click-here' : ''"
      ><span>{{ data.finished.length }}</span> 已完成</a
    >
    - {{ data.waiting }} 等待中 - 正在运行:
    {{ data.running || "无" }}
    <Modal v-if="show_finished" @close="show_finished = false">
      <h3 slot="header">已完成的任务</h3>
      <div slot="body" v-if="data.finished.length > 0">
        <div v-for="task in data.finished" :key="task.id">
          <h4>{{ task.name }}</h4>
          <span>{{ task.id.split("/")[0] }}</span>
          运行于:
          {{ task.last_run }}<br />
          <button @click="download(task)" class="mui-btn" target="_blank">
            <font-awesome-icon icon="download" /> 下载
          </button>
          <button
            class="mui-btn"
            @click="view_result(task)"
            v-if="task.viewable"
          >
            <font-awesome-icon icon="eye" /> 查看
          </button>
          <button class="mui-btn" @click="delete_result(task)">
            <font-awesome-icon icon="trash" /> 删除
          </button>
        </div>
        <div class="mui-divide"></div>
      </div>
    </Modal>
  </div>
</template>

<script>
import api from "../api";
import Modal from "./ModalView";

export default {
  data() {
    return {
      show_finished: false
    };
  },
  props: ["data"],
  components: {
    Modal,
  },
  methods: {
    download(task) {
      var id = encodeURIComponent(task.id)
      api.download('queue/' + id, task.id.split('/').slice(-1)[0] + '.' + task.file_ext);
    },
    delete_result(task) {
      var id = encodeURIComponent(task.id)
      api.delete("queue/" + id).then(() => {
        api.notify({ title: "成功删除" });
      });
    },
    view_result(task) {
      var id = encodeURIComponent(task.id)
      this.$router.push("/results/" + id);
      this.show_finished = false;
    },
  },
};
</script>

<style scoped>
.click-here > span {
  border-radius: 5px;
  background-color: green;
}
</style>