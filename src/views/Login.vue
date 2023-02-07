<template>
  <v-card flat>
    <v-card-title>{{ $t("login") }}</v-card-title>
    <v-card-text>
      <v-tabs v-model="tab">
        <v-tab key="form">{{ $t("username-login") }}</v-tab>
        <v-tab key="otp">{{ $t("otp-login") }}</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item key="form">
          <v-text-field
            v-model="username"
            :label="$t('username')"
          ></v-text-field>
          <v-text-field
            v-model="password"
            type="password"
            :label="$t('password')"
            @keyup.enter="login"
          ></v-text-field>
        </v-tab-item>
        <v-tab-item key="otp">
          <v-text-field
            v-model="username"
            :label="$t('username')"
          ></v-text-field>
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
      <v-btn @click="login" color="primary" dark>{{ $t("login") }}</v-btn>
      <v-spacer></v-spacer>
      <v-checkbox v-model="remember" :label="$t('remember-me')"></v-checkbox>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">

import { authenticate } from "@/api/net";

export default {
  name: "Login",
  data() {
    return {
      username: "",
      password: "",
      remember: true,
      otp: "",
      tab: "",
    };
  },
  methods: {
    login() {
      authenticate({
        username: this.username,
        password: this.password,
        otp: this.otp,
        remember: this.remember
      }).then(() => {
          location.href = '/';
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