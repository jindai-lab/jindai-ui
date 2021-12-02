<template>
  <v-dialog v-model="visible">
    <v-card>
      <v-card-title>Tags</v-card-title>
      <v-card-text style="height: 400px">
        <v-autocomplete
          autofocus
          v-model="tag_new"
          :items="tag_choices"
          :loading="loading"
          :search-input.sync="tag_typing"
          flat multiple
          auto-select-first
          label="Tag"
          ref="ac"
        ></v-autocomplete>
      </v-card-text>
      <v-card-actions>
        <v-btn
          @click="do_submit(); visible=false;"
        >
          OK
        </v-btn>
        <v-btn @click="$emit('cancel'); visible=false;"> Cancel </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import api from "./gallery-api";

export default {
  name: "TaggingDialog",
  data() {
    return {
      tag_choices: [],
      loading: false,
      tag_new: [],
      tag_typing: "",
      visible: false
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
      if (this.tag_typing) this.tag_typing = ''
    }
  },
  methods: {
    show(values) {
      this.visible = true
      this.tag_new = [...values]
      this.tag_choices = [...values]
    },
    search_tag(search) {
      if (this.loading) return
      this.tag_choices = [...this.tag_new]
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
          this.tag_choices = [...this.tag_new, search].concat(data.result);
          this.loading = false;
        })
        .catch((err) => {
          console.log(err);
          this.loading = false;
          this.tag_choices = [...this.tag_new, search];
        });
    },
    do_submit() {
      this.$emit('submit', this.tag_new || [this.tag_typing])
    }
  },
};
</script>
