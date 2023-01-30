<template>
  <v-dialog v-model="visible">
    <v-card>
      <v-card-title>
        {{ $t("view") }} {{ querify(target.source) }}
        <v-spacer></v-spacer>
        <v-btn icon @click="visible = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <ResultsView
          :load="target.arr"
          :total="(target.arr || []).length"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">

import { defineComponent } from "vue";
import { querify } from "@/api/ui";

export default defineComponent({
  name: "EmbeddedDialog",
  data: () => ({
    visible: true,
  }),
  props: ["target"],
  watch: {
    visible() {
      this.$emit('input', true)
    },
  },
  methods: {querify}
});
</script>