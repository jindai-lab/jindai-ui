<template>
  <v-dialog v-model="show" width="unset">
    <v-card>
      <v-card-title>{{ $t("tagging") }}</v-card-title>
      <v-card-text style="height: 150px">
        <v-autocomplete
          autofocus
          ref="ac"
          v-model="tag_new"
          :items="tag_choices"
          :loading="loading"
          :search-input.sync="tag_typing"
          class="mx-4"
          multiple
          flat
          hide-no-data
          hide-details
          :label="$t('tag')"
          @keyup.enter="do_submit"
          @change="tag_typing = ''"
        ></v-autocomplete>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="do_submit"> {{ $t("ok") }} </v-btn>
        <v-btn @click="$emit('input', false)"> {{ $t("cancel") }} </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "TaggingShortcutsDialog",
  data() {
    return {
      tag_choices: [],
      loading: false,
      tag_new: [],
      tag_typing: "",
      show: false,
    };
  },
  props: {
    choices: {
      default: null,
    },
    bundle: {
      default: () => ({}),
    },
    prompt: {
      type: String,
      default: "",
    },
    value: {
      type: Boolean,
      default: false,
    },
    multiple: {
      type: Boolean,
      default: true,
    },
    initial: String,
    match_initials: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    tag_typing(val) {
      val && this.search_tag(val);
    },
    choices(val) {
      this.tag_choices = val || [];
    },
    value(val) {
      this.show = val;
      if (val) {
        this.tag_new = [];
        this.tag_typing = this.initial;
      }
    },
    show(val) {
      if (!val) this.$emit("input", false);
    },
  },
  mounted() {
    this.tag_choices = this.choices || [];
  },
  methods: {
    search_tag(search) {
      if (!search) return;
      var matched = this.choices.filter((x) => x.text.startsWith(search));
      if (matched.length > 0) {
        if (matched[0].text.startsWith(search + " "))
          this.tag_new = Array.from(new Set(this.tag_new.concat(matched[0])));
        if (matched.length > 1) this.tag_typing = search;
        else this.tag_typing = "";
      }
      return matched;
    },
    do_submit() {
      this.$emit(
        "submit",
        this.tag_new.map((x) => x.value).filter((x) => x)
      );
      this.$emit("input", false);
    },
  },
};
</script>

<style scoped>
.v-toolbar {
  position: fixed;
  top: 0;
  z-index: 210;
  width: 100%;
}
</style>