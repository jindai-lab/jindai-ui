<template>
  <v-snackbar v-model="visible">
    {{ $te(text) ? $t(text) : text }}
    <template v-slot:action="">
      <v-btn v-if="detail" text @click="show_more">
        <v-icon>mdi-dots-horizontal</v-icon>
      </v-btn>
      <InfoDialog v-if="detail && info_visible" :target="detail"></InfoDialog>
      <v-btn color="primary" text @click="close">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script>
import InfoDialog from "./InfoDialog.vue";

export default {
  name: "AlertDialog",
  props: ["text", "detail", "retval"],
  components: { InfoDialog },
  data: () => ({
    visible: true,
    info_visible: false,
  }),
  methods: {
    close() {
      this.visible = false;
      this.retval = true;
    },
    show_more() {
      this.info_visible = true;
    },
  },
};
</script>
