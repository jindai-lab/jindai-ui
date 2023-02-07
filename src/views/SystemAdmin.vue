<template>
  <v-card flat>
    <v-card-title>{{ $t("system-admin") }} </v-card-title>
    <v-card-text>
      <v-list subheader>
        <v-subheader>
          {{ $t("users") }}
        </v-subheader>
        <v-list-item>
          <v-btn
            color="primary"
            @click="
              show_modify = false;
              new_user = { username: '', password: '', roles: [], datasets: [] };
              show_user_modal = true;
            "
          >
            <v-icon>mdi-plus</v-icon> {{ $t("new-user") }}
          </v-btn></v-list-item
        >
        <v-list-item v-for="u in users" :key="u._id">
          <v-list-item-content>
            <v-list-item-title>{{ u.username }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-btn
                @click="
                  show_modify = true;
                  new_user = Object.assign({ password: '', roles: [], datasets: [] }, u);
                  show_user_modal = true;
                "
              >
                <v-icon>mdi-account-edit</v-icon> {{ $t("user-role") }}
              </v-btn>
              <v-btn @click="del_user(u)" class="ml-5">
                <v-icon>mdi-account-cancel</v-icon> {{ $t("delete") }}
              </v-btn>
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        <v-divide></v-divide>
        <v-subheader>{{ $t("schedule") }}</v-subheader>
        <v-list-item>
          <v-btn color="primary" @click="show_creation = true">
            <v-icon>mdi-plus</v-icon> {{ $t("new-schedule") }}
          </v-btn></v-list-item
        >
        <v-list-item v-for="task in scheduled_jobs" :key="task.key">
          <v-list-item-content>
            <v-list-item-title>
              {{ task.key }} : {{ task.name }} ({{
                task.repr
              }})</v-list-item-title
            >
            <v-list-item-subtitle>
              <v-btn @click="delete_schedule(task.key)"
                ><v-icon>mdi-delete</v-icon> {{ $t("cancel") }}</v-btn
              >
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-dialog v-model="show_user_modal">
        <v-card>
          <v-card-title v-if="show_modify">
            {{ $t("user-modify") }}
            <v-spacer></v-spacer>
            <v-btn icon @click="show_user_modal = false"
              ><v-icon>mdi-close</v-icon></v-btn
            >
          </v-card-title>
          <v-card-title v-else>{{ $t("new-user") }}</v-card-title>
          <v-card-text>
            <v-text-field
              :label="$t('username')"
              v-model="new_user.username"
              :disabled="show_modify"
            ></v-text-field>
            <v-text-field
              :label="$t('password')"
              type="password"
              v-model="new_user.password"
              :disabled="show_modify"
            ></v-text-field>
            <v-checkbox
              :label="$t('role-query')"
              disabled
              :input-value="true"
            ></v-checkbox>
            <v-checkbox
              :label="$t('role-task')"
              disabled
              :input-value="true"
            ></v-checkbox>
            <v-checkbox
              :label="$t('role-admin')"
              value="admin"
              v-model="new_user.roles"
            ></v-checkbox>

            <treeselect
              :multiple="true"
              :options="datasets.hierarchy"
              v-model="new_user.datasets"
              :placeholder="$t('permitted-datasets')"
            />
          </v-card-text>
          <v-card-actions>
            <v-btn
              @click="modify_user_role"
              color="primary"
              v-if="show_modify"
              >{{ $t("modify") }}</v-btn
            ><v-btn @click="add_user" color="primary" v-else>{{
              $t("ok")
            }}</v-btn>
            <v-btn @click="show_user_modal = false" class="ml-5">{{
              $t("cancel")
            }}</v-btn></v-card-actions
          >
        </v-card>
      </v-dialog>
      <v-dialog v-model="show_creation">
        <v-card>
          <v-card-title>{{ $t("new-schedule") }}</v-card-title>
          <v-card-text>
            <ParamInput
              v-model="scheduler.task"
              :arg="{ type: 'TASK', name: $t('task'), default: '', description: '' }"
            />
            <ParamInput
              v-model="scheduler.cron"
              :arg="{ type: 'str', name: $t('description'), default: '', description: 'Description, e.g. day at 06:00' }"
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
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { DatasetHierarchy, UIDataset } from "@/api";
import { ScheduledJob, User } from "@/api/dbo";
import { call } from "@/api/net";
import { create_dialog, notify } from "@/dialogs";
import ParamInput from "../components/ParamInput.vue";

export default {
  name: "UserList",
  components: { ParamInput },
  data() {
    return {
      users: [] as User[],
      show_user_modal: false,
      show_modify: false,
      datasets: {} as {hierarchy: DatasetHierarchy[]},
      new_user: {
        username:'',
        roles: [],
        datasets: [],
        password: ''
      },
      scheduled_jobs: [] as ScheduledJob[],
      show_creation: false,
      scheduler: {
        task: "",
        cron: "",
      },
    };
  },
  methods: {
    add_user() {
      call<User>("users/", 'put', this.new_user).then((data) => {
        notify(this.$t("user-added", { user: data.username }));
        this.users.push(data);
        this.show_user_modal = false;
      });
    },
    del_user(u: User) {
      create_dialog('confirm', {content: this.$t("user-delete-confirm", { user: u.username })}).then(() => {
        call<boolean>("users/" + u.username, 'delete').then((data) => {
          if (!data) return;
          notify(this.$t("user-deleted", { user: u.username }));
          this.users = this.users.filter((x) => x._id != u._id);
        });
      })
    },
    modify_user_role() {
      call("users/" + this.new_user.username, 'post', {
          roles: this.new_user.roles,
          datasets: this.new_user.datasets,
        })
        .then(() => (this.show_user_modal = false));
    },
    update_scheduler() {
      call<ScheduledJob[]>("scheduler").then((data) => (this.scheduled_jobs = data));
    },
    create_schedule() {
      var text = `every ${this.scheduler.cron} do ${this.scheduler.task}`;
      call("scheduler", 'put', { text }).then(() => {
        this.scheduler = {
          cron: "",
          task: "",
        };
        this.update_scheduler();
      });
      this.show_creation = false;
    },
    delete_schedule(key: string) {
      call("scheduler/" + key, 'delete').then(() => {
        notify(this.$t("deleted"));
        this.update_scheduler();
      });
    },
  },
  async mounted() {
    call<User[]>("users/").then((data) => (this.users = data));
    this.update_scheduler();
    this.datasets = await UIDataset.get_datasets_hierarchy();
  },
};
</script>

<style scoped>
span.name {
  display: inline-block;
  font-size: 20px;
  min-width: 300px;
  padding-right: 20px;
}

ol {
  list-style-type: none;
  padding: 0;
}

span.id::before {
  content: "ID: ";
}
</style>
