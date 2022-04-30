<template>
  <v-card flat>
    <v-card-title
      >{{ $t("users") }}
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        @click="
          show_modify = false;
          new_user = { roles: [], datasets: [] };
          show_modal = true;
        "
      >
        <v-icon>mdi-plus</v-icon> {{ $t("new-user") }}
      </v-btn></v-card-title
    >
    <v-card-text>
      <v-row v-for="u in users" :key="u._id">
        <v-col class="name">{{ u.username }}</v-col>
        <v-col class="opers">
          <v-btn
            @click="
              show_modify = true;
              new_user = Object.assign(u, { password: '' });
              show_modal = true;
            "
          >
            <v-icon>mdi-account-edit</v-icon> {{ $t("user-role") }}
          </v-btn>
          <v-btn @click="del_user(u)" class="ml-5">
            <v-icon>mdi-account-cancel</v-icon> {{ $t("delete") }}
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
    <v-dialog v-model="show_modal">
      <v-card>
        <v-card-title v-if="show_modify">
          {{ $t("user-modify") }}
          <v-spacer></v-spacer>
          <v-btn icon @click="show_modal = false"
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
          <v-btn @click="modify_user_role" color="primary" v-if="show_modify">{{
            $t("modify")
          }}</v-btn
          ><v-btn @click="add_user" color="primary" v-else>{{
            $t("ok")
          }}</v-btn>
          <v-btn @click="show_modal = false" class="ml-5">{{
            $t("cancel")
          }}</v-btn></v-card-actions
        >
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import api from "../api";
export default {
  name: "UserList",
  data() {
    return {
      users: [],
      show_modal: false,
      show_modify: false,
      datasets: [],
      new_user: {
        roles: [],
        datasets: [],
      },
    };
  },
  methods: {
    add_user() {
      api.put("users/", this.new_user).then((data) => {
        api.notify({
          text: this.$t("user-added", { user: data.result.username }),
        });
        this.users.push(data.result);
        this.show_modal = false;
      });
    },
    del_user(u) {
      if (!confirm(this.$t("user-delete-confirm", { user: u.username })))
        return;
      api.delete("users/" + u.username).then((data) => {
        if (!data.result.ok) return;
        api.notify({ text: this.$t("user-deleted", { user: u.username }) });
        this.users = this.users.filter((x) => x._id != u._id);
      });
    },
    modify_user_role() {
      api
        .call("users/" + this.new_user.username, {
          roles: this.new_user.roles,
          datasets: this.new_user.datasets,
        })
        .then(() => (this.show_modal = false));
    },
  },
  mounted() {
    api.call("users/").then((data) => (this.users = data.result));
    api.get_datasets_hierarchy().then((data) => (this.datasets = data));
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
