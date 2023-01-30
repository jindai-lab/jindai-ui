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

<script lang="ts">
import { TaskDBO } from '@/api/dbo';
import { call } from '@/api/net';
import { notify } from '@/dialogs'

export default {
  data() {
    return {
      tasks: [] as TaskDBO[],
    };
  },
  methods: {
    create_task() {
      call("tasks/", 'put', { name: this.$t("new-task") + " " + new Date() })
        .then((data) => this.$router.push("/tasks/" + data));
    },
    duplicate_task(task: Partial<TaskDBO>) {
      var otask = Object.assign({}, task);
      delete otask._id;
      otask.name += " " + this.$t("copy");
      call("tasks/", 'put', otask)
        .then((data) => this.$router.push("/tasks/" + data));
    },
    delete_task(task: Partial<TaskDBO>) {
      call("tasks/" + task._id, 'delete')
        .then(() => (this.tasks = this.tasks.filter((x) => x._id != task._id)));
    },
    enqueue_task(task: Partial<TaskDBO>) {
      call("queue/", 'put', { id: task._id }).then((data) => {
        notify(this.$t("task-enqueued", {task: data}));
      });
    },
  },
  mounted() {
    call<TaskDBO[]>("tasks/").then((data) => (this.tasks = data));
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
