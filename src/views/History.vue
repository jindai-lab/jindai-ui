<template>
  <v-card flat>
    <v-card-title>{{ $t("history") }}</v-card-title>
    <v-card-text>
      <v-data-table :items="history.map(x => Object.assign(x, {queries: x.queries.join('\n')}))" :headers="[
        {text: $t('user'), value: 'user'},
        {text: $t('created-at'), value: 'created_at'},
        {text: $t('query'), value: 'queries'},
        {text: $t('operations'), value: 'actions'},
      ]"><template v-slot:item.actions="{item}">
          <v-btn icon @click="export_query(item)">
            <v-icon>mdi-file-export</v-icon>
          </v-btn>
          <v-btn icon @click="replay(item)">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import {call} from "@/api/net"
import { History } from "@/api/dbo";

export default {
  data() {
    return { history: [] as History[] };
  },
  mounted() {
    call("history").then((data) => (this.history = data as History[]));
  },
  methods: {
    export_query(h: History) {
      call("tasks/", "put", {
          pipeline: [
            [
              "DBQueryDataSource",
              {
                query: h.queries[0],
              },
            ],
          ],
          name: this.$t("search") + " " + h.queries[0],
        })
        .then((data) => this.$router.push("/tasks/" + data as string))
        .catch(() => { });
    },
    replay(h: History) {
      this.$router.push(
        "search?q=" +
        encodeURIComponent(h.queries[0]) +
        "&req=" +
        encodeURIComponent(h.queries[1])
      );
    },
  },
}
</script>
