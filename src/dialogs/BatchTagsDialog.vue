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
            $emit('input', false)
          "
        >
          {{ $t("cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import localConfig from "@/api/localConfig";
import { defineComponent } from "vue";

export default defineComponent({
  name: "PromptChoicesDialog",
  data() {
    return {
      visible: true,
      batch: "",
      batch_delim: "",
      batch_prefix: "",
    };
  },
  mounted() {
    Object.assign(this, localConfig.tagging);
  },
  methods: {
    do_submit() {
      localConfig.tagging = {
        batch_delim: this.batch_delim,
        batch_prefix: this.batch_prefix,
      };
      this.$emit('input', [
        ...this.batch
          .split(this.batch_delim || ", ")
          .map((x) => x.trim())
          .filter((x) => x)
          .map((x) => this.batch_prefix + x),
      ]);
      this.visible = false;
    },
  },
});
</script>

<style scoped>
.dialog-limit {
  max-width: 800px !important;
  width: 75% !important;
  margin: auto;
}
</style>