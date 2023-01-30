<template>
  <v-dialog v-model="visible" content-class="dialog-limit" v-if="visible">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-combobox
          autofocus
          v-model="new_value"
          :items="candidates"
          :search-input.sync="typing"
          :loading="cancel !== null"
          flat
          multiple
          chips
          deletable-chips
          hide-selected
          :auto-select-first="new_value.length == 0"
          ref="ac"
          :filter="match_pattern"
          @keyup.esc="typing = ''"
          @keyup.enter="!typing ? ret() : null"
          @change="
            new_value = limit && limit > 0 ? new_value.slice(0, limit) : new_value
          "
          max-height="180"
        ></v-combobox>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="ret">
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

import { defineComponent } from "vue";
import { Choice } from "@/api";
import { escape_regex } from "@/api/ui";

export default defineComponent({
  name: "PromptChoicesDialog",
  data() {
    return {
      cancel: null,
      candidates: [] as Choice[],
      new_value: [] as string[],
      typing: "",
      visible: true,
    };
  },
  props: {
    title: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    limit: Number,
    value: {
      type: Array<string>,
      default: () => [],
    },
    initial: {
      type: String,
      default: "",
    },
    choices: {
      type: string[]
    },
    retval: Array,
  },
  watch: {
    typing(val) {
      val && this.search(val);
    },
  },
  mounted() {
    this.typing = this.initial;
    this.new_value = this.value.sort();
    if (Array.isArray(this.choices)) this.candidates = this.choices;
  },
  computed: {
    search() {
      if (typeof this.choices == "function")
        return (val: string) => {
          this.choices(val, this).then(
            (choices: Choice[]) => (this.candidates = choices)
          );
        };
      else return () => [];
    },
  },
  methods: {
    match_pattern(item: any, query: string, item_text: string) {
      return item_text.match(new RegExp(escape_regex(query), "i"));
    },
    ret() {
      var result = this.new_value.map((x) => (x.value ?? x));
      if (this.limit) result = result.slice(this.limit);
      this.$emit('input', result);
      this.visible = false;
    },
  },
};
</script>

<style scope>
.dialog-limit {
  max-width: 800px !important;
  width: 75% !important;
  margin: auto;
}
.v-select__selections {
  overflow-x: hidden;
  max-height: 200px;
  overflow-y: auto;
}
.v-chip {
  overflow: initial;
}
</style>