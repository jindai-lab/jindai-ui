<template>
  <v-card flat>
    <v-card-title
      >{{ $t("task") }}
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="create_task()">
        <v-icon>mdi-plus</v-icon> {{ $t("new-task") }}
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-data-table
        :items="tasks"
        :search="search"
        :headers="[
          { text: $t('name'), value: 'name' },
          { text: $t('operations'), value: 'actions' },
          { text: $t('run-at'), value: 'last_run' },
          { text: 'ID', value: '_id' },
        ]"
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-text-field
              v-model="search"
              clearable
              flat
              hide-details
              prepend-inner-icon="mdi-magnify"
              :label="$t('search')"
            ></v-text-field>
          </v-toolbar>
        </template>

        <template v-slot:item.last_run="{ item }">
          <span>{{ new Date(item.last_run).toLocaleString() }}</span>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn :to="`/tasks/${item._id}`">
            <v-icon>mdi-file-edit-outline</v-icon>
          </v-btn>

          <v-btn @click="duplicate_task(item)" class="ml-3">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>

          <v-btn @click="enqueue_task(item)" class="ml-3">
            <v-icon>mdi-play</v-icon> </v-btn
          ><br />
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  data() {
    return {
      tasks: [],
      search: "",
    };
  },
  methods: {
    async create_task() {
      var {_id} = await this.business.tasks({creation: { name: this.$t("new-task") + " " + new Date() }})
      this.$router.push("/tasks/" + _id);
    },
    async duplicate_task(task) {
      var otask = Object.assign({}, task);
      otask._id = null;
      otask.name += " " + this.$t("copy");
      var {_id} = await this.business.tasks({creation: otask})
      this.$router.push("/tasks/" + _id);
    },
    async delete_task(task) {
      await this.task.deletion(task._id);
      this.tasks = this.tasks.filter((x) => x._id != task._id)
    },
    enqueue_task(task) {
      this.business.enqueue(task._id).then(({job}) => {
        this.$notify(this.$t("job-enqueued", { job }));
      });
    },
  },
  async mounted() {
    this.tasks = await this.business.tasks();
  },
};
</script>

<style scoped>
span.name {
  display: inline-block;
  font-size: 20px;
  padding-right: 20px;
  min-width: 300px;
}

ol {
  list-style-type: none;
  padding: 0;
}

span.id::before {
  content: "ID: ";
}

.opers .v-btn {
  margin-right: 12px;
}
</style>
