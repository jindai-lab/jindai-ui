<template>
  <v-card flat>
    <v-card-title
      >用户
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        @click="
          show_modify = false;
          new_user = { roles: [], datasets: [] };
          show_modal = true;
        "
      >
        <v-icon>mdi-plus</v-icon> 添加用户
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
            <v-icon>mdi-account-edit</v-icon> 用户角色
          </v-btn>
          <v-btn @click="del_user(u)" class="ml-5">
            <v-icon>mdi-account-cancel</v-icon> 删除用户
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
    <v-dialog v-model="show_modal">
      <v-card>
        <v-card-title v-if="show_modify">
          修改用户角色
          <v-spacer></v-spacer>
          <v-btn icon @click="show_modal = false"
            ><v-icon>mdi-close</v-icon></v-btn
          >
        </v-card-title>
        <v-card-title v-else>添加用户</v-card-title>
        <v-card-text>
          <v-text-field
            label="用户名"
            v-model="new_user.username"
            :disabled="show_modify"
          ></v-text-field>
          <v-text-field
            label="密码"
            type="password"
            v-model="new_user.password"
            :disabled="show_modify"
          ></v-text-field>
          <v-checkbox label="查询" disabled :input-value="true"></v-checkbox>
          <v-checkbox label="任务" disabled :input-value="true"></v-checkbox>
          <!-- <v-checkbox label="文件" disabled :input-value="true"></v-checkbox> -->
          <!-- <v-checkbox label="数据集" disabled :input-value="true"></v-checkbox> -->
          <v-checkbox
            label="用户及其他管理"
            value="admin"
            v-model="new_user.roles"
          ></v-checkbox>
          
          <treeselect
            :multiple="true"
            :options="datasets.hierarchy"
            v-model="new_user.datasets"
            placeholder="允许访问的数据集"
          />

        </v-card-text>
        <v-card-actions>
          <v-btn @click="modify_user_role" color="primary" v-if="show_modify"
            >修改</v-btn
          ><v-btn @click="add_user" color="primary" v-else>确定</v-btn>
          <v-btn @click="show_modal = false" class="ml-5"
            >取消</v-btn
          ></v-card-actions
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
        datasets: []
      },
    };
  },
  methods: {
    add_user() {
      api.put("users/", this.new_user).then((data) => {
        api.notify({ text: "成功添加了用户 " + data.result.username });
        this.users.push(data.result);
        this.show_modal = false;
      });
    },
    del_user(u) {
      if (!confirm("确实要删除用户 " + u.username + " 吗？")) return;
      api.delete("users/" + u.username).then((data) => {
        if (!data.result.ok) return;
        api.notify({ text: "成功删除了用户 " + u.username });
        this.users = this.users.filter((x) => x._id != u._id);
      });
    },
    modify_user_role() {
      api.call("users/" + this.new_user.username, {
        roles: this.new_user.roles,
        datasets: this.new_user.datasets
      }).then(() => this.show_modal = false);
    },
  },
  mounted() {
    api.call("users/").then((data) => (this.users = data.result));
    api.get_datasets_hierarchy().then(data => this.datasets = data)
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
