<template>
  <v-dialog v-model="visible" width="unset">
    <v-card>
      <v-card-title>{{ $t("tagging") }}</v-card-title>
      <v-card-text style="height: 400px">
        <v-combobox
          autofocus
          v-model="tag_new"
          :items="tag_choices"
          :search-input.sync="tag_typing"
          :loading="cancel !== null"
          flat
          multiple
          chips
          deletable-chips
          hide-selected
          auto-select-first
          label="标签"
          ref="ac"
        ></v-combobox>
        <v-expansion-panels>
          <v-expansion-panel dense key="batched">
            <v-expansion-panel-header>{{
              $t("tag-batch")
            }}</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-text-field v-model="batch" :label="$t('text')"></v-text-field>
              <v-text-field
                v-model="batch_delim"
                :label="$t('delimiter')"
              ></v-text-field>
              <v-text-field
                v-model="batch_prefix"
                :label="$t('prefix')"
              ></v-text-field>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="primary"
          @click="
            do_submit();
            visible = false;
          "
        >
          {{ $t("ok") }}
        </v-btn>
        <v-btn
          @click="
            $emit('cancel');
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
import api from "../api";

export default {
  name: "TaggingDialog",
  data() {
    return {
      tag_choices: [],
      cancel: null,
      tag_new: [],
      tag_typing: "",
      visible: false,
      batch: "",
      batch_delim: "",
      batch_prefix: "",
    };
  },
  props: {
    prompt: {
      type: String,
      default: "",
    },
    value: {
      type: Array,
      default: () => [],
    },
  },
  watch: {
    tag_typing(val) {
      val && this.search_tag(val);
    },
    tag_new() {
      if (this.tag_typing) this.tag_typing = "";
    },
  },
  mounted() {
    Object.assign(this, api.config.tagging);
  },
  methods: {
    show(values) {
      var sorted = [...values].sort();
      this.visible = true;
      this.tag_new = sorted;
      this.tag_choices = sorted;
      this.batch = "";
    },
    search_tag(search) {
      if (this.cancel) this.cancel.cancel();
      if (search.length == 0 || search == "*" || search == "@") return;
      this.tag_choices = [...this.tag_new];
      this.cancel = api.cancel_source();
      search = api.escape_regex(search);
      api
        .call(
          "term/keywords",
          {
            pattern: search,
            regex: true,
          },
          this.cancel
        )
        .then((data) => {
          this.cancel = null;
          this.tag_choices = this.tag_new
            .map((x) => ({
              text: x,
              value: x,
            }))
            .concat(
              data.result.map((x) => ({
                text: x.term,
                value: x.term,
              }))
            );
        })
        .catch((err) => {
          this.cancel = null;
          console.log(err);
          this.tag_choices = [...this.tag_new];
        });
    },
    do_submit() {
      if (this.batch)
        this.tag_new.push(
          ...this.batch
            .split(this.batch_delim || ", ")
            .map((x) => x.trim())
            .filter((x) => x)
            .map((x) => this.batch_prefix + x)
        );
      api.config.tagging = {
        batch_delim: this.batch_delim,
        batch_prefix: this.batch_prefix,
      };
      this.$emit(
        "submit",
        this.tag_new.map((x) => x.value || x) || [this.tag_typing]
      );
    },
  },
};
</script>
