<template>
  <v-card flat v-show="console_outputs.length > 0" ref="console">
    <v-btn small left bottom text class="ma-3" @click="console_outputs = []"
      ><v-icon>mdi-delete</v-icon>{{ $t("clear") }}</v-btn
    >
    <div class="console">
      <div v-for="(line, index) in console_outputs.slice(0, 50)" :key="index">
        {{ line }}
      </div>
    </div>
  </v-card>
</template>

<script>
import api from '../api'
export default {
  name: "EventConsole",
  data: () => ({
    console_outputs: [],
    queue_source: null,
  }),
  props: {
    enabled: {
      type: Boolean,
      default: true
    }
  },
  mounted() {
    window.onblur = () => {
      if (this.queue_source) this.queue_source.close();
      this.queue_source = null;
    };
    window.onfocus = () => {
      try {
        this.queue_event();        
      } catch (error) {
        console.log('[eventsource]', error)
      }
    };
    this.queue_event()
  },
  methods: {
    queue_event() {
      if (!this.enabled || !api.is_logined()) return
      api.queue().then((queue) => this.update_queue(queue));
      if (this.queue_source) return;
      this.queue_source = api.get_event_source();
      this.queue_source.onmessage = (event) => {
        console.log(event);
        var data = JSON.parse(event.data);
        if (data.log) {
          this.console_outputs.splice(0, 0, data.log);
          if (this.console_outputs.length > 100)
            this.console_outputs.splice(50, this.console_outputs.length - 50);
        } else this.update_queue(data);
      };
    },
    update_queue(queue) {
      this.$emit("queue", queue);
    },
  },
};
</script>
