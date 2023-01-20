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
          @load="(a) => a.callback({ offset: 0, result: target.arr })"
          :total="(target.arr || []).length"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "EmbeddedDialog",
  data: () => ({
    visible: true,
  }),
  props: ["target", "retval"],
  watch: {
    visible() {
      this.retval = true;
    },
  },
};
</script>