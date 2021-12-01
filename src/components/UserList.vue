<template>
  <div>
    <h3>用户
      <v-btn color="primary" @click="show_modify = false; new_user = { roles: [] }; show_modal = true; ">
        <v-icon>mdi-plus</v-icon> 添加用户
      </v-btn></h3>
    <div>
      <ol>
        <li v-for="u in users" :key="u._id" class="mui-panel">
          <span class="name">{{ u.username }}</span>
          <span class="opers">
            <v-btn @click="show_modify = true; new_user = Object.assign(u, {'password': ''}); show_modal = true;">
              <v-icon>mdi-account-edi</v-icon> 用户角色
            </v-btn>
            <v-btn @click="del_user(u)">
              <v-icon>mdi-account-cancel</v-icon> 删除用户
            </v-btn>
             </span
          >
        </li>
      </ol>
    </div>
    <v-dialog :value="show_modal">
      <v-card>
        <v-card-title v-if="show_modify">
          修改用户角色
        </v-card-title>
        <v-card-title v-else>添加用户</v-card-title>
      <v-card-text>
        <div class="mui-textfield">
          <label>用户名</label>
          <input type="text" v-model="new_user.username" :disabled="show_modify">
        </div>
        <div class="mui-textfield">
          <label>密码</label>
          <input type="password" v-model="new_user.password" :disabled="show_modify">
        </div>
        <div class="mui-checkbox">
          <label><input type="checkbox" disabled checked>查询</label>
          </div>
        <div class="mui-checkbox">
          <label><input type="checkbox" disabled checked>任务</label></div>
        <div class="mui-checkbox">
          <label><input type="checkbox" disabled checked>文件</label></div>
        <div class="mui-checkbox">
          <label><input type="checkbox" disabled checked>数据集</label></div>
        <div class="mui-checkbox">
          <label><input type="checkbox" value="admin" v-model="new_user.roles">用户及其他管理</label>
        </div>
        <v-btn  @click="modify_user_role" v-if="show_modify">修改</v-btn>
        <v-btn  @click="add_user" v-else>确定</v-btn>
      </v-card-text>
      </v-card>
    </v-dialog>>
  </div>
</template>

<script>
import api from "../api";
export default {
  name: 'UserList',
  data() {
    return {
      users: [],
      show_modal: false,
      show_modify: false,
      new_user: {}
    };
  },
  methods: {
    add_user() {
      api.put('users/', this.new_user).then((data) => {
        api.notify({text: '成功添加了用户 ' + data.result.username})
        this.users.push(data.result)
        this.show_modal = false
      })
    },
    del_user(u) {
      if (!confirm('确实要删除用户 ' + u.username + ' 吗？')) return
      api.delete('users/' + u.username).then((data) => {
        if (!data.result.ok) return
        api.notify({text: '成功删除了用户 ' + u.username})
        this.users = this.users.filter(x => x._id != u._id)
      })
    },
    modify_user_role() {
      api.call('users/' + this.new_user.username, {'roles': this.new_user.roles})
    }
  },
  mounted() {
    api.call("users/").then((data) => (this.users = data.result));
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
