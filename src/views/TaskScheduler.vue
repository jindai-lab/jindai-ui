<template>
  <v-card flat>
    <v-card-title
      >{{ $t("schedule") }}
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="show_creation = true">
        <v-icon>mdi-plus</v-icon> {{ $t("new-schedule") }}
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-row v-for="task in scheduled_jobs" :key="task.key" class="ma-3">
        {{ task.key }} : {{ task.name }} ({{ task.repr }})
        <v-btn @click="delete_schedule(task.key)"
          ><v-icon>mdi-delete</v-icon> {{ $t("cancel") }}</v-btn
        >
      </v-row>
    </v-card-text>
    <v-dialog v-model="show_creation">
      <v-card>
        <v-card-title>{{ $t("new-schedule") }}</v-card-title>
        <v-card-text>
          <ParamInput
            v-model="scheduler.task"
            :arg="{ type: 'TASK', name: '要定时执行的任务' }"
          />
          <ParamInput
            v-model="scheduler.cron"
            :arg="{ type: 'str', name: '定时说明，如 day at 06:00' }"
          />
        </v-card-text>
        <v-card-actions
          ><v-btn @click="create_schedule" color="primary">
            <v-icon>mdi-plus</v-icon>
            {{ $t("add") }}</v-btn
          >
          <v-btn @click="show_creation = false">{{ $t("cancel") }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import api from "../api";
import ParamInput from "../components/ParamInput.vue";

export default {
  components: { ParamInput },
  data() {
    return {
      scheduled_jobs: [],
      show_creation: false,
      scheduler: {
        task: "",
        cron: "",
      },
    };
  },
  methods: {
    update_scheduler() {
      api.call("scheduler").then((data) => (this.scheduled_jobs = data.result));
    },
    create_schedule() {
      var text = `every ${this.scheduler.cron} do ${this.scheduler.task}`;
      api.put("scheduler", { text }).then(() => {
        this.scheduler = {
          cron: "",
          task: "",
        };
        this.update_scheduler();
      });
      this.show_creation = false;
    },
    delete_schedule(key) {
      api.delete("scheduler/" + key).then(() => {
        api.notify({ title: this.$t("deleted") });
        this.update_scheduler();
      });
    },
  },
  mounted() {
    this.update_scheduler();
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
