<template>
  <v-card flat>
    <v-card-title>账户设置</v-card-title>
    <v-card-text>
      <v-text-field
        v-model="old_password"
        type="password"
        label="原密码"
      ></v-text-field>
      <v-text-field
        v-model="password"
        type="password"
        label="新密码"
      ></v-text-field>
      <v-text-field
        v-model="password2"
        type="password"
        label="重复新密码"
      ></v-text-field>
      <v-sheet v-show="otp_secret" class="otp-info">
        <v-row>
          <div class="qrcode" ref="qrCodeUrl"></div>
          <div class="ml-5">
            请使用 Authenticator 扫描上述二维码，或输入如下信息：{{ otp_secret }}<br>
            本信息仅显示一次。
          </div>
        </v-row>
      </v-sheet>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" class="ml-3" @click="update_password">
        更新密码
      </v-btn>
      <v-btn @click="change_otp(true)" v-if="!otp">启用 OTP 登录</v-btn>
      <v-btn @click="change_otp(false)" v-else>关闭 OTP 登录</v-btn>
    </v-card-actions>
  </v-card>
</template>


<script>
import api from "../api";
import QRCode from "qrcodejs2";

export default {
  name: "AccountSecurity",
  data() {
    return {
      old_password: "",
      password: "",
      password2: "",
      otp: false,
      otp_secret: "",
      username: "",
    };
  },
  mounted() {
    api
      .call("authenticate")
      .then((data) => {
        this.otp = data.result.otp_secret
        this.username = data.result.username
      });
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
          .then(api.notify("更改成功"));
      }
    },
    change_otp(otp) {
      api.call("account/", { otp }).then((data) => {
        api.notify("更改成功");
        this.otp = otp;
        if (otp && data.result) {
          this.otp_secret = data.result;
          this.create_qr_code()
        }
      });
    },
    create_qr_code() {
      new QRCode(this.$refs.qrCodeUrl, {
        text: `otpauth://totp/${this.username}?secret=${this.otp_secret}`,
        width: 100,
        height: 100,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });
    },
  },
};
</script>

<style scoped>
.qrcode {
  display: inline-block;
}

.qrcode img {
  width: 132px;
  height: 132px;
  background-color: #fff;
  padding: 6px;
  box-sizing: border-box;
}

.otp-info {
  margin: 20px;
}
</style>
