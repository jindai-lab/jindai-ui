<template>
  <v-dialog v-model="visible" width="unset">
    <v-card>
      <v-card-title>标签</v-card-title>
      <v-card-text style="height: 400px">
        <v-combobox
          autofocus
          v-model="tag_new"
          :items="tag_choices"
          :loading="loading"
          :search-input.sync="tag_typing"
          flat multiple
          auto-select-first
          label="标签"
          ref="ac"
        ></v-combobox>
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="primary"
          @click="do_submit(); visible=false;"
        >
          确定
        </v-btn>
        <v-btn @click="$emit('cancel'); visible=false;"> 取消 </v-btn>
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
          this.tag_choices = this.tag_new.map(x => ({
            text: x,
            value: x
          })).concat(data.result.map(x => ({
            text: x._id + ' (' + x.count + ')',
            value: x._id
          })));
          this.loading = false;
        })
        .catch((err) => {
          console.log(err);
          this.loading = false;
          this.tag_choices = [...this.tag_new];
        });
    },
    do_submit() {
      this.$emit('submit', this.tag_new.map(x => x.value || x) || [this.tag_typing])
    }
  },
};
</script>
