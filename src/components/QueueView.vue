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
          <a :href="download_link(task)" class="mui-btn" target="_blank">
            <font-awesome-icon icon="download" /> 下载
          </a>
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