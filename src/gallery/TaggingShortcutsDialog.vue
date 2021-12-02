<template>
  <v-dialog v-model="show">
    <v-card>
      <v-card-title>Tagging Shortcuts</v-card-title>
      <v-card-text style="height: 150px">
        <v-autocomplete
          autofocus
          ref="ac"
          v-model="tag_new"
          :items="tag_choices"
          :loading="loading"
          :search-input.sync="tag_typing"
          class="mx-4"
          :multiple="multiple"
          flat
          auto-select-first
          hide-no-data
          hide-details
          label="Tag"
          @keyup.enter="do_submit"
          @change="tag_typing = ''"
        ></v-autocomplete>
      </v-card-text>
      <v-card-actions>
        <v-btn
          @click="do_submit"
        >
          OK
        </v-btn>
        <v-btn @click="$emit('input', false)"> Cancel </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import api from "./gallery-api";

export default {
  name: "TaggingShortcutsDialog",
  data() {
    return {
      tag_choices: [],
      loading: false,
      tag_new: "",
      tag_typing: "",
      show: false,
    };
  },
  props: {
    choices: {
      default: null,
    },
    bundle: {
      default: () => ({})
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
      default: false
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
        this.tag_new = "";
        this.tag_typing = this.initial;
      }
    },
    show(val) {
      if (!val) this.$emit("input", false);
    },
  },
  methods: {
    search_tag(search) {
      if (this.choices) {
        if (!search) return;
        this.tag_choices = this.choices.filter(x => this.match_initials ? x.text.startsWith(search) : x.text.match(search));
        return;
      }
      if (this.loading) return
      this.loading = true;
      api
        .call(
          "search_tags",
          {
            tag: search,
            match_initials: ((search.match(/^[@*]/)) ? true : false)
          },
          "post",
          false
        )
        .then((data) => {
          this.tag_choices = [search].concat(data.result);
          this.loading = false;
        })
        .catch((err) => {
          console.log(err);
          this.loading = false;
          this.tag_choices = [search];
        });
    },
    do_submit() {
      const val = this.tag_new || [this.tag_typing]
      this.$emit('submit', val);
      this.$emit('input', false);      
    }
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