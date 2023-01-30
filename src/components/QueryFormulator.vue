<template>
  <div>
    <param-input
      :arg="{
        name: $t('brackets'),
        type: '()|[]',
      }"
      v-model="brackets"
      @change="update"
      v-if="context == 'expr'"
    ></param-input>
    <v-select v-model="selected" :items="choices" @change="update"></v-select>
    <template>
      <param-input
        :arg="{
          name: '',
          type: 'str',
        }"
        v-model="embedded"
        @change="update"
        v-if="next.startsWith('literal-')"
      />
      <query-formulator
        :context="next"
        v-model="embedded"
        @change="update"
        v-else-if="next != 'null'"
      />
    </template>
    <v-select
      v-model="jointer"
      :items="jointer_choices"
      @change="update"
    ></v-select>
    <template v-if="jointer">
      <query-formulator context="expr" v-model="successor" @change="update" />
    </template>
  </div>
</template>

<script lang="ts">
const FIELDS = [
  "keywords",
  "content",
  "author",
  "dataset",
  "source.url",
  "source.file",
  "lang",
];

const BINARY_OPERATORS = [
  "=",
  ["%", "match-regex"],
  ">",
  "<",
  ">=",
  "<=",
  "!=",
];

const JOINTERS = [
  "",
  [",", "op-and"],
  ["|", "op-or"],
  [";", "op-list-sep"],
  ["=>", "op-list-join"],
];

const LITERALS = ["literal-any", "literal-text"];

const UNIARY_OPERATORS = [["~", "op-not"]];

const FUNCTIONS = ["in", "first", "last", "groupby", ""];

import ParamInput from "./ParamInput.vue";


import { defineComponent } from "vue";

export default defineComponent({
  name: "QueryFormulator",
  components: {
    ParamInput,
  },
  props: {
    context: {
      type: String,
      default: "expr",
    },
    value: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      function: "match",
      selected: { literal: "null", type: "null" },
      jointer: "",
      embedded: "",
      successor: "",
      brackets: "()",
    };
  },
  methods: {
    _items_from_array(type_string, arr) {
      return arr.map((x) => {
        if (Array.isArray(x) && x.length == 2) {
          return {
            text: this.$t(x[1]),
            value: {
              type: type_string,
              literal: x[0],
            },
          };
        } else
          return {
            text: "" + x,
            value: {
              type: type_string,
              literal: x,
            },
          };
      });
    },
    _selected_string() {
      switch (this.selected.type) {
        case "literals":
          if (this.selected.literal == "literal-text")
            return "`" + this.embedded + "`";
          else return this.embedded;
        case "binary-operators":
        case "uniary-operators":
          return this.selected.literal + this.embedded;
        default:
          return this.selected.literal;
      }
    },
    _stringify() {
      return (
        this._selected_string() +
        (this.jointer ? this.jointer + this.successor : "")
      );
    },
    update() {
      switch (this.context) {
        case "expr":
          this.$emit(
            "input",
            this.brackets[0] + this._stringify() + this.brackets[1]
          );
          break;
        default:
          this.$emit("input", this._stringify());
          break;
      }
      this.$emit("change");
    },
  },
  computed: {
    jointer_choices() {
      return this._items_from_array("jointers", JOINTERS);
    },
    choices() {
      switch (this.context) {
        case "value-from":
          return this._items_from_array("fields", FIELDS);
        case "binary-operators":
          return this._items_from_array("binary-operators", BINARY_OPERATORS);
        case "expr":
          return [
            ...this._items_from_array("null", ["null"]),
            ...this._items_from_array("uniary-operators", UNIARY_OPERATORS),
            ...this._items_from_array("functions", FUNCTIONS),
            ...this._items_from_array("fields", FIELDS),
            ...this._items_from_array("literals", LITERALS),
          ];
        case "call":
          switch (this.function) {
            case "match":
              return this._items_from_array("fields", FIELDS);
            case "regexMatch":
              return this._items_from_array("parameters", [
                "input",
                "regex",
                "options",
              ]);
            case "groupby":
              return this._items_from_array("parameters", [["id", "group-by"]]);
          }
      }
      return [];
    },
    next() {
      switch (this.selected.type) {
        case "fields":
          return "binary-operators";
        case "binary-operators":
        case "uniary-operators":
          return "expr";
        case "null":
          return "null";
        case "literals":
          return this.selected.literal;
        default:
          return "fields";
      }
    },
  },
};
</script>
