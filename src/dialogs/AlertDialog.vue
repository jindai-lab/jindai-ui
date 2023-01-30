<template>
  <v-snackbar v-model="visible">
    <div v-if="content">{{ $te(content) ? $t(content) : content }}</div>
    <template slot="action">
      <v-btn v-if="target" text @click="show_more">
        <v-icon>mdi-dots-horizontal</v-icon>
      </v-btn>
      <InfoDialog v-if="target && info_visible" :target="target"></InfoDialog>
      <v-btn color="primary" text @click="close">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts">
import InfoDialog from "./InfoDialog.vue";

import { defineComponent } from 'vue'

export default defineComponent({
  name: "AlertDialog",
  props: {
    content: String,
    target: Object
  },
  emits: ['input'],
  components: { InfoDialog },
  data: () => ({
    visible: true,
    info_visible: false,
  }),
  methods: {
    close() {
      this.$emit('input', false)
    },
    show_more() {
      this.info_visible = true;
    },
  },
})
</script>
