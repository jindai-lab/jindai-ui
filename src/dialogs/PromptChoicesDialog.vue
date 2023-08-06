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
          @change="new_value = limit > 0 ? new_value.slice(0, limit) : new_value"
          max-height="180"
          :delimiters="[' ', ',', '，', ';', '；', '、']"
        ></v-combobox>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="ret">
          {{ $t("ok") }}
        </v-btn>
        <v-btn
          @click="
            retval = false;
            visible = false;
          "
        >
          {{ $t("cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "PromptChoicesDialog",
  data() {
    return {
      cancel: null,
      candidates: [],
      new_value: [],
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
      type: Array,
      default: () => [],
    },
    initial: {
      type: String,
      default: "",
    },
    matcher: {
      default: () => [],
    },
    choices: Array,
    retval: Array,
    allow_custom: {
      type: Boolean,
      default: true,
    },
  },
  watch: {
    typing(val) {
      val && this.search(val);
    },
  },
  mounted() {
    this.typing = this.initial;
    this.new_value = this.value.sort();
    this.candidates = this.choices;
  },
  computed: {
    search() {
      if (typeof this.matcher == "function")
        return (val) => {
          this.matcher(val, this).then((choices) => (this.candidates = choices));
        };
      return () => this.candidates;
    },
  },
  methods: {
    match_pattern(item, query, item_text) {
      return item_text.match(new RegExp(this.api.escape_regex(query), "i"));
    },
    ret() {
      var result = this.new_value;
      result = result.map((x) => (typeof x == "string" ? x : x.value));
      if (this.limit) result = result.slice(0, this.limit);
      if (!this.allow_custom) {
        const listed = this.choices.map((x) => (typeof x == "string" ? x : x.value));
        result = result.filter((x) => listed.indexOf(x) >= 0);
      }
      this.retval = result;
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
