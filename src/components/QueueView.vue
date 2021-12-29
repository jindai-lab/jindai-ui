<template>
  <div>
    <a link style="color: white; text-decoration: none" @click="show_finished = true">
    <v-badge
      :value="data.finished.length > 0"
      :content="data.finished.length"
      color="green"
    >
    处理结果
    </v-badge>
    <v-badge class="ml-5 mr-5"
      :value="data.waiting > 0"
      :content="data.waiting"
    >
    等待中
    </v-badge>
    <v-badge color="orange" :value="data.running.length > 0" :content="data.running.length">
    正在运行      
    </v-badge>
    </a>
    <v-dialog v-model="show_finished">
      <v-card>
        <v-card-title>已完成的任务
          <v-spacer></v-spacer>
          <v-btn icon @click="show_finished=false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-card-text v-if="data.finished.length > 0">
          <div v-for="task in data.finished" :key="task.id">
                      <h4>{{ task.name }}</h4>
          <span>{{ task.id.split("/")[0] }}</span>
          运行于:
          {{ new Date(task.last_run + ' UTC').toLocaleString() }}<br />
          <v-btn :href="download_link(task)" v-if="!task.isnull" target="_blank">
            <v-icon>mdi-download</v-icon> 下载
          </v-btn>
          <v-btn
            class="ml-3"
            @click="view_result(task)"
            v-if="task.viewable"
          >
            <v-icon>mdi-eye</v-icon> 查看
          </v-btn>
          <v-btn class="ml-3" @click="delete_result(task)">
            <v-icon>mdi-delete</v-icon> 删除
          </v-btn>
          <v-divider class="mt-5"></v-divider>
          </div>
        </v-card-text>
        <v-card-text v-else>没有已完成的任务。</v-card-text>
      </v-card>
    </v-dialog>
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
        this.$emit('updated', {running: this.running, waiting: this.waiting, finished: this.data.finished.filter(x => x.id !== id)})
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