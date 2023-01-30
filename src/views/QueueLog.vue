<template>
  <v-card flat>
    <v-card-title>{{ $t("task-result") }} {{ id }}</v-card-title>
    <v-card-text>
      <v-data-table :items="logs" :headers="[{text: 'Logs', value: 'text', sortable: false}]"></v-data-table>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">import { call } from '@/api/net';

export default {
  name: "QueueLog",
  props: ["id"],
  data() {
    return {
      logs: [] as ({text:string})[]
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
    load_data() {
      call<string[]>(
          "queue/logs/" +
            encodeURIComponent(this.id)
        )
        .then((data) => {
          this.logs = data.map(x => ({text: x}))
        })
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