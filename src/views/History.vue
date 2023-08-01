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

<script>


export default {
  data() {
    return { history: [] };
  },
  async mounted() {
    this.history = await this.business.history()
  },
  methods: {
    export_query(h) {
      this.business.tasks({
        creation: {
          pipeline: [
            [
              "DBQueryDataSource",
              {
                query: h.queries[0],
              },
            ],
          ],
          name: this.$t("search") + " " + h.queries[0],
        }
      }).then(({_id}) => this.$router.push("/tasks/" + _id))
        .catch(() => { });
    },
    replay(h) {
      this.$router.push(
        "search?q=" +
        encodeURIComponent(h.queries[0]) +
        "&req=" +
        encodeURIComponent(h.queries[1])
      );
    },
  },
};
</script>
