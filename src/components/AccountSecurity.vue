<template>
  <div>
    <h3>账户设置</h3>
    <div class="mui-panel">
      <div class="mui-textfield">
        <label>原密码</label>
        <input type="password" v-model="old_password" />
      </div>
      <div class="mui-textfield">
        <label>新密码</label>
        <input type="password" v-model="password" />
      </div>
      <div class="mui-textfield">
        <label>重复新密码</label>
        <input
          type="password"
          v-model="password2"
          :invalid="password !== password2"
        />
      </div>
      <button class="mui-btn mui-btn--primary" @click="update_password">
        更新密码
      </button>
    </div>
  </div>
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
