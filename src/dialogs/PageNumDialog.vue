<template>
  <!-- pagenum edit -->
  <v-dialog v-model="visible" width="unset">
    <v-card>
      <v-card-title>{{ $t("edit-pagenum") }}
        <v-spacer></v-spacer>
        <v-btn icon @click="visible = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-card-text>
        <v-sheet>
          <ParamInput :arg="{ name: $t('pagenum'), type: 'int' }" v-model="new_pagenum" />
          <ParamInput :arg="{
            name: $t('modify-mode'),
            type: $t('pagenum-modes'),
          }" v-model="sequential" />
          <ParamInput :arg="{ name: $t('folio-mode'), type: 'bool' }" v-model="folio" />
        </v-sheet>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="do_submit()">{{ $t("ok") }}</v-btn>
        <v-btn @click="
          visible = false;
        retval = false;
        ">
          {{ $t("cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import ParamInput from '../components/ParamInput.vue';

export default {
  name: "PageNumDialog",
  components: {
    ParamInput
  },
  data() {
    return {
      visible: true,
      new_pagenum: 0,
      folio: false,
      sequential: 'all'
    };
  },
  props: {
    retval: {
      type: Object,
      default: () => { },
    },
    pagenum: {
      type: Number,
      default: 0
    }
  },
  mounted() {
    this.new_pagenum = this.pagenum;
  },
  watch: {
    pagenum(val) { this.new_pagenum = val;}
  },
  methods: {
    do_submit() {
      this.retval = { folio: this.folio, new_pagenum: this.new_pagenum, sequential: this.sequential };
      this.visible = false;
    },
  },
};
</script>

<style scoped>
.dialog-limit {
  max-width: 800px !important;
  width: 75% !important;
  margin: auto;
}
</style>