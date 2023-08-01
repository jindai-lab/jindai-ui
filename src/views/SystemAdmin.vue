<template>
  <v-card flat>
    <v-card-title>{{ $t("system-admin") }} </v-card-title>
    <v-card-text>
      <v-list subheader>
        <v-subheader>
          {{ $t("users") }}
        </v-subheader>
        <v-list-item>
          <v-btn color="primary" @click="
            show_modify = false;
          new_user = { roles: [], datasets: [] };
          show_user_modal = true;
          ">
            <v-icon>mdi-plus</v-icon> {{ $t("new-user") }}
          </v-btn></v-list-item>
        <v-list-item v-for="u in users" :key="u._id">
          <v-list-item-content>
            <v-list-item-title>{{ u.username }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-btn @click="
                show_modify = true;
              new_user = Object.assign(u, { password: '' });
              show_user_modal = true;
              ">
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
          </v-btn></v-list-item>
        <v-list-item v-for="task in scheduled_jobs" :key="task.key">
          <v-list-item-content>
            <v-list-item-title>
              {{ task.key }} : {{ task.name }} ({{
                task.repr
              }})</v-list-item-title>
            <v-list-item-subtitle>
              <v-btn @click="delete_schedule(task.key)"><v-icon>mdi-delete</v-icon> {{ $t("cancel") }}</v-btn>
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-dialog v-model="show_user_modal">
        <v-card>
          <v-card-title v-if="show_modify">
            {{ $t("user-modify") }}
            <v-spacer></v-spacer>
            <v-btn icon @click="show_user_modal = false"><v-icon>mdi-close</v-icon></v-btn>
          </v-card-title>
          <v-card-title v-else>{{ $t("new-user") }}</v-card-title>
          <v-card-text>
            <v-text-field :label="$t('username')" v-model="new_user.username" :disabled="show_modify"></v-text-field>
            <v-text-field :label="$t('password')" type="password" v-model="new_user.password"
              :disabled="show_modify"></v-text-field>
            <v-checkbox :label="$t('role-query')" disabled :input-value="true"></v-checkbox>
            <v-checkbox :label="$t('role-task')" disabled :input-value="true"></v-checkbox>
            <v-checkbox :label="$t('role-admin')" value="admin" v-model="new_user.roles"></v-checkbox>

            <treeselect :multiple="true" :options="datasets.hierarchy" v-model="new_user.datasets"
              :placeholder="$t('permitted-datasets')" />
          </v-card-text>
          <v-card-actions>
            <v-btn @click="modify_user_role" color="primary" v-if="show_modify">{{ $t("modify") }}</v-btn><v-btn
              @click="add_user" color="primary" v-else>{{
                $t("ok")
              }}</v-btn>
            <v-btn @click="show_user_modal = false" class="ml-5">{{
              $t("cancel")
            }}</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="show_creation">
        <v-card>
          <v-card-title>{{ $t("new-schedule") }}</v-card-title>
          <v-card-text>
            <ParamInput v-model="scheduler.task" :arg="{ type: 'TASK', name: $t('task') }" />
            <ParamInput v-model="scheduler.cron" :arg="{ type: 'str', name: 'Description, e.g. day at 06:00' }" />
          </v-card-text>
          <v-card-actions><v-btn @click="create_schedule" color="primary">
              <v-icon>mdi-plus</v-icon>
              {{ $t("add") }}</v-btn>
            <v-btn @click="show_creation = false">{{ $t("cancel") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card-text>
  </v-card>
</template>

<script>
import ParamInput from "../components/ParamInput.vue";
export default {
  name: "UserList",
  components: { ParamInput },
  data() {
    return {
      users: [],
      show_user_modal: false,
      show_modify: false,
      datasets: [],
      new_user: {
        roles: [],
        datasets: [],
      },
      scheduled_jobs: [],
      show_creation: false,
      scheduler: {
        task: "",
        cron: "",
      },
    };
  },
  methods: {
    async add_user() {
      var data = await this.business.admin_users({ creation: this.new_user })
      this.$notify(this.$t("user-added", { user: data.username }));
      this.users.push(data);
      this.show_user_modal = false;
    },
    async del_user(u) {
      await this.api.dialogs.confirm({ title: this.$t("user-delete-confirm", { user: u.username }) });
      await this.business.admin_users({ deletion: u.username })
      this.$notify(this.$t("user-deleted", { user: u.username }));
      this.users = this.users.filter((x) => x._id != u._id);
    },
    modify_user_role() {
      this.show_user_modal = false
      this.business.admin_users({
        update: {
          username: this.new_user.username,
          roles: this.new_user.roles,
          datasets: this.new_user.datasets,
        }
      })
    },
    async update_scheduler() {
      this.scheduled_jobs = await this.business.admin_scheduler()
    },
    async create_schedule() {
      var text = `every ${this.scheduler.cron} do ${this.scheduler.task}`;
      this.show_creation = false;
      await this.business.admin_scheduler({ creation: text });
      this.scheduler = {
        cron: "",
        task: "",
      };
      this.update_scheduler();
    },
    async delete_schedule(key) {
      await this.business.admin_scheduler({ deletion: key })
      this.$notify(this.$t("deleted"));
      this.update_scheduler();
    },
  },
  async mounted() {
    this.users = (await this.business.admin_users()).results
    this.datasets = await this.business.get_datasets_hierarchy()
    this.update_scheduler();
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
