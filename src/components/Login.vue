<template>
  <v-card flat>
    <v-card-title>登录</v-card-title>
    <v-card-text>
      <v-tabs v-model="tab">
        <v-tab key="form">用户名/密码登录</v-tab>
        <v-tab key="otp">OTP 登录</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item key="form">
          <v-text-field v-model="username" label="用户名"></v-text-field>
          <v-text-field
            v-model="password"
            type="password"
            label="密码"
            @keyup.enter="login"
          ></v-text-field>
        </v-tab-item>
        <v-tab-item key="otp">
          <v-text-field v-model="username" label="用户名"></v-text-field>
          <v-otp-input
            class="otp-input"
            v-model="otp"
            length="6"
            @finish="login"
          ></v-otp-input>
        </v-tab-item>
      </v-tabs-items>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="login" color="primary" dark>登录</v-btn>
      <v-spacer></v-spacer>
      <v-checkbox v-model="remember" label="记住我"></v-checkbox>
    </v-card-actions>
  </v-card>
</template>

<script>
import api from "../api";

export default {
  name: "Login",
  data() {
    return {
      username: "",
      password: "",
      remember: true,
      opt: "",
      tab: "",
    };
  },
  methods: {
    login(otp = null) {
      api.auth(this.username, this.password, otp || this.otp, this.remember).then(() => {
        this.$emit("logined");
        this.$router.push("/");
      });
    },
  },
};
</script>

<style scoped>
.otp-input {
  max-width: 400px;
  margin: 0 auto;
}
</style>