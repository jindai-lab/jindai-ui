<template>
  <v-dialog v-model="visible" width="unset">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text style="height: 150px" v-if="content">
        {{ content }}
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="ret(true)">
          {{ $t("ok") }}
        </v-btn>
        <v-btn @click="ret(false)"> {{ $t("cancel") }} </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">

import { defineComponent } from "vue";

export default defineComponent({
  name: "ConfirmDialog",
  data() {
    return {
      visible: false,
    };
  },
  created() {
    this.visible =true
  },
  props: {
    retval: {
      type: Boolean,
      default: false,
    },
    dark: Boolean,
    title: String,
    content: String,
  },
  methods: {
    ret(val: boolean) {
      this.visible = false
      this.$emit('input', val)
    }
  },
});
</script>

<style scoped>
.v-toolbar {
  position: fixed;
  top: 0;
  z-index: 210;
  width: 100%;
}
</style>