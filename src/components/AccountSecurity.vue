<template>
  <v-card flat>
    <v-card-title>账户设置</v-card-title>
    <v-card-text>
      <v-text-field v-model="old_password" type="password" label="原密码"></v-text-field>
      <v-text-field v-model="password" type="password" label="新密码"></v-text-field>
      <v-text-field v-model="password2" type="password" label="重复新密码"></v-text-field>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" class="ml-3" @click="update_password">
        更新密码
      </v-btn>
    </v-card-actions>
  </v-card>
</template>


<script>
import api from "../api";
export default {
  name: "AccountSecurity",
  data() {
    return {
      old_password: "",
      password: "",
      password2: "",
    };
  },
  methods: {
    update_password() {
      if (this.password !== this.password2) {
        api.notify({ text: "新密码需保持一致" });
      } else {
        api
          .call("account/", {
            old_password: this.old_password,
            password: this.password,
          })
          .then(api.notify({ text: "更改成功" }));
      }
    },
  },
};
</script>
