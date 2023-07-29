<template>
  <v-card flat>
    <v-card-title>{{ $t("task-result") }} {{ id }}</v-card-title>
    <v-card-text>
      <v-data-table :items="logs" :headers="[{text: 'Logs', value: 'text', sortable: false}]"></v-data-table>
    </v-card-text>
  </v-card>
</template>

<script>


export default {
  name: "QueueLog",
  props: ["id"],
  data() {
    return {
      logs: []
    };
  },
  watch: {
    id() {
      this.load_data();
    },
  },
  mounted() {
    this.load_data();
  },
  methods: {
    async load_data() {
      this.logs = await this.business.queue_logs(this.id)
    },
  },
};
</script>

<style scoped>
iframe {
  border: 0;
  width: 100%;
  height: calc(100vh - 220px);
}
</style>