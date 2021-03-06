<template>
  <v-card flat>
    <v-card-title>{{ $t("preferences") }}</v-card-title>
    <v-card-text>
      <v-sheet>
        <v-text-field
          v-model="old_password"
          type="password"
          :label="$t('password-old')"
        ></v-text-field>
        <v-text-field
          v-model="password"
          type="password"
          :label="$t('password-new')"
        ></v-text-field>
        <v-text-field
          v-model="password2"
          type="password"
          :label="$t('password-repeated')"
        ></v-text-field>
      </v-sheet>
      <v-sheet v-show="otp_secret" class="otp-info">
        <v-row>
          <div class="qrcode" ref="qrCodeUrl"></div>
          <div class="ml-5">
            {{ $t("otp-prompt", { otp_secret }) }}
          </div>
        </v-row>
      </v-sheet>
      <v-sheet>
        <v-btn color="primary" class="mr-3" @click="update_password">
          {{ $t("password-update") }}
        </v-btn>
        <v-btn @click="change_otp(true)" v-if="!otp">{{
          $t("otp-enable")
        }}</v-btn>
        <v-btn @click="change_otp(false)" v-else>{{ $t("otp-disable") }}</v-btn>
      </v-sheet>
      <v-sheet class="mt-5">
        <v-row>
          <v-col>
            <v-checkbox
              flat
              v-model="config.contain"
              :label="$t('image-full-size')"
            ></v-checkbox> </v-col
        ></v-row>
        <v-row
          ><v-col>
            <v-checkbox
              flat
              v-model="config.force_thumbnail"
              :label="$t('image-thumbnail')"
            ></v-checkbox></v-col
        ></v-row>
        <v-row
          ><v-col>
            <v-checkbox
              flat
              v-model="config.enhance"
              :label="$t('image-enhance')"
            ></v-checkbox>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-text-field
              type="number"
              :label="$t('playing-interval')"
              v-model="config.playing_interval"
            ></v-text-field> </v-col
        ></v-row>
      </v-sheet>
    </v-card-text>
  </v-card>
</template>


<script>
import api from "../api";
import QRCode from "qrcodejs2";

export default {
  name: "Preferences",
  data() {
    return {
      old_password: "",
      password: "",
      password2: "",
      otp: false,
      otp_secret: "",
      username: "",
      config: api.config,
    };
  },
  mounted() {
    api.call("authenticate").then((data) => {
      this.otp = data.result.otp_secret;
      this.username = data.result.username;
    });
  },
  methods: {
    update_password() {
      if (this.password !== this.password2) {
        api.notify({ text: this.$t("password-dismatch") });
      } else {
        api
          .call("account/", {
            old_password: this.old_password,
            password: this.password,
          })
          .then(api.notify(this.$t("updated")));
      }
    },
    change_otp(otp) {
      api.call("account/", { otp }).then((data) => {
        api.notify(this.$t("updated"));
        this.otp = otp;
        if (otp && data.result) {
          this.otp_secret = data.result;
          this.create_qr_code();
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
