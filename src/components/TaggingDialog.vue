<template>
  <v-dialog v-model="visible" content-class="dialog-limit">
    <v-card>
      <v-card-title>{{ $t("tagging") }}</v-card-title>
      <v-card-text>
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
          :filter="match_pattern"
          @keyup="(e) => (e.key != 'Enter' && (enter_hit = 0))"
          @keyup.enter="() => (++enter_hit == 2 ? do_submit() : null)"
          max-height="180"
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
          <v-expansion-panel dense key="author">
            <v-expansion-panel-header>{{
              $t("author")
            }}</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-combobox v-model="author" :label="$t('text')" :items="author_candidates"></v-combobox>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-card-actions>
        <div style="margin-top: 250px">        
        <v-btn
          color="primary"
          @click="
            do_submit();
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
        </v-btn></div>
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
      enter_hit: 0,
      author: ""
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
    scope: {
      type: String,
      default: ""
    }
  },
  watch: {
    tag_typing(val) {
      val && this.search_tag(val);
    },
    tag_new() {
      if (this.tag_typing) this.tag_typing = "";
    },
  },
  computed: {
    author_candidates() {
      return this.tag_new.filter(x => !(x.value || x).startsWith('*')).sort()
    }
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
      if (this.scope) {
        api.call("term/keywords", {
          scope: this.scope
        }).then(data=> {
          this.tag_choices = [...sorted, ... data.result]
        })
      }
    },
    escape_search(search) {
      if (search.match(/^[@*]/))
        search = '\\' + search[0] + '.*' + api.escape_regex(search.substr(1));
      else
        search = api.escape_regex(search);
      return search
    },
    match_pattern(item, query, item_text) {
      return item_text.match(new RegExp(this.escape_search(query), "i"))
    },
    search_tag(search) {
      if (this.cancel) this.cancel.cancel();
      if (search.length == 0 || search == "*" || search == "@") return;
      this.tag_choices = [...this.tag_new];
      this.cancel = api.cancel_source();
      api
        .call(
          "term/keywords",
          {
            pattern: this.escape_search(search),
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
      this.enter_hit = 0;
      if (this.author) {
        this.$emit("author", this.author)
        this.author = ''
      }
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