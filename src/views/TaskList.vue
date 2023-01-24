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
      :headers="[
        {text: $t('name'), value: 'name'},
        {text: $t('operations'), value: 'actions'},
        {text: $t('run-at'), value: 'last_run'},
        {text: 'ID', value: '_id'},
      ]"
      >
        <template v-slot:item.last_run="{ item }">
          <span>{{ new Date(item.last_run).toLocaleString() }}</span>
        </template>
        <template v-slot:item.actions="{item}">
          <v-btn :to="`/tasks/${item._id}`">
            <v-icon>mdi-file-edit-outline</v-icon>
          </v-btn>

          <v-btn @click="duplicate_task(item)" class="ml-3">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>

          <v-btn @click="enqueue_task(item)" class="ml-3">
            <v-icon>mdi-play</v-icon>
          </v-btn><br/>
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
    };
  },
  methods: {
    create_task() {
      this.api
        .put("tasks/", { name: this.$t("new-task") + " " + new Date() })
        .then((data) => this.$router.push("/tasks/" + data.result));
    },
    duplicate_task(task) {
      var otask = Object.assign({}, task);
      otask._id = null;
      otask.name += " " + this.$t("copy");
      this.api
        .put("tasks/", otask)
        .then((data) => this.$router.push("/tasks/" + data.result));
    },
    delete_task(task) {
      this.api
        .delete("tasks/" + task._id)
        .then(() => (this.tasks = this.tasks.filter((x) => x._id != task._id)));
    },
    enqueue_task(task) {
      this.api.put("queue/", { id: task._id }).then((data) => {
        this.$notify(this.$t("task-enqueued", {task: data.result}));
      });
    },
  },
  mounted() {
    this.api.call("tasks/").then((data) => (this.tasks = data.result));
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
