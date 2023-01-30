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

<script lang="ts">import { createEventSource } from '@/api/net';

export default {
  name: "EventConsole",
  data: () => ({
    console_outputs: [] as string[],
    queue_source: createEventSource(),
  }),
  props: {
    enabled: {
      type: Boolean,
      default: true
    }
  },
  mounted() {
    window.onblur = () => {
      if (this.queue_source && this.queue_source.readyState == EventSource.OPEN)
        this.queue_source.close();
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
      this.queue_source = createEventSource();
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
    update_queue(queue: object) {
      this.$emit("queue", queue);
    },
  },
};
</script>
