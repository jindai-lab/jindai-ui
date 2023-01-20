<template>
  <v-dialog persistent content-class="dialog-limit" v-model="visible">
    <v-card>
      <v-card-title>{{ $t("tag-batch") }}</v-card-title>
      <v-card-text>
        <v-text-field v-model="batch" :label="$t('text')"></v-text-field>
        <v-text-field
          v-model="batch_delim"
          :label="$t('delimiter')"
        ></v-text-field>
        <v-text-field
          v-model="batch_prefix"
          :label="$t('prefix')"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
          <v-btn color="primary" @click="do_submit()">
            {{ $t("ok") }}
          </v-btn>
          <v-btn
            @click="
              visible = false;
              retval = false
            "
          >
            {{ $t("cancel") }}
          </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import api from "../api";

export default {
  name: "PromptChoicesDialog",
  data() {
    return {
      visible: true,
      batch: "",
      batch_delim: "",
      batch_prefix: "",
    };
  },
  props: {
    retval: {
      type: Array,
      default: () => [],
    },
  },
  mounted() {
    Object.assign(this, api.config.tagging);
  },
  methods: {
    do_submit() {
      api.config.tagging = {
        batch_delim: this.batch_delim,
        batch_prefix: this.batch_prefix,
      };
      this.retval = [
        ...this.batch
          .split(this.batch_delim || ", ")
          .map((x) => x.trim())
          .filter((x) => x)
          .map((x) => this.batch_prefix + x),
      ];
      this.visible = false;
    },
  },
};
</script>
