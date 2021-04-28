<template>
  <div>
    处理队列: <a @click="show_finished = true" href="javascript:void(0)">{{ finished.length }} 已完成</a> - {{ waiting }} 等待中 - 正在运行:
    {{ running || '无' }}
    <Modal v-if="show_finished" @close="show_finished = false">
        <h3 slot="header">Finished Tasks</h3>
        <div slot="body" v-if="finished.length > 0">
            <div v-for="id in finished" :key="id">
                <a :href="result_url(id)" target="_blank">{{ id }}</a>
            </div>
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
      finished: [],
      running: "...",
      waiting: "...",
      timer: 0,
      show_finished: false,
    };
  },
  components: {
    Modal,
  },
  methods: {
    update() {
      if (this.timer) {
        clearInterval(this.timer);
      } else {
        this.timer = setInterval(() => {
          api.call("queue/").then((resp) => {
            this.finished = resp.data.result.finished;
            this.running = resp.data.result.running;
            this.waiting = resp.data.result.waiting;
          });
        }, 5000);
      }
    },
    result_url(id) {
      return api.result_url(id)
    }
  },
  mounted() {
    this.update();
  },
};
</script>
