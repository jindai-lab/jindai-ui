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
      <v-row v-for="task in tasks" :key="task._id" class="ma-3">
        <span class="name">{{ task.name }}</span>
        <span class="opers">
          <v-btn :to="`/tasks/${task._id}`">
            <v-icon>mdi-file-edit-outline</v-icon>
          </v-btn>

          <v-btn @click="duplicate_task(task)">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>

          <v-btn @click="enqueue_task(task)">
            <v-icon>mdi-play</v-icon>
          </v-btn> </span
        ><br />
        <span class="id">{{ task._id }}</span>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import api from "../api";

export default {
  data() {
    return {
      tasks: [],
    };
  },
  methods: {
    create_task() {
      api
        .put("tasks/", { name: this.$t("new-task") + " " + new Date() })
        .then((data) => this.$router.push("/tasks/" + data.result));
    },
    duplicate_task(task) {
      var otask = Object.assign({}, task);
      otask._id = null;
      otask.name += " " + this.$t("copy");
      api
        .put("tasks/", otask)
        .then((data) => this.$router.push("/tasks/" + data.result));
    },
    delete_task(task) {
      api
        .delete("tasks/" + task._id)
        .then(() => (this.tasks = this.tasks.filter((x) => x._id != task._id)));
    },
    enqueue_task(task) {
      api.put("queue/", { id: task._id }).then((data) => {
        api.notify(this.$t("task-enqueued", {task: data.result}));
      });
    },
  },
  mounted() {
    api.call("tasks/").then((data) => (this.tasks = data.result));
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
