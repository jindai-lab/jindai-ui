<template>
  <v-dialog v-model="visible" width="unset">
    <v-card>
      <v-card-title>标签</v-card-title>
      <v-card-text style="height: 400px">
        <v-combobox
          autofocus
          v-model="tag_new"
          :items="tag_choices"
          :search-input.sync="tag_typing"
          :loading="cancel !== null"
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
import api from "../api"

export default {
  name: "TaggingDialog",
  data() {
    return {
      tag_choices: [],
      cancel: null,
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
      if (this.cancel) this.cancel.cancel()
      if (search.length == 0 || search == '*' || search == '@') return
      this.tag_choices = [...this.tag_new]
      this.cancel = api.cancel_source();
      search = api.escape_regex(search)
      api
        .call(
          "quicktask",
          {
            query: `??match(keywords%${api.querify(search)});project(keywords=1);unwind($keywords);match(keywords%${api.querify(search)});group(id=$keywords,count=sum(1));limit(20)`,
            mongocollection: ''
          },
          this.cancel
        )
        .then((data) => {
          this.cancel = null
          this.tag_choices = this.tag_new.map(x => ({
            text: x,
            value: x
          })).concat(data.result.map(x => ({
            text: x._id + ' (' + x.count + ')',
            value: x._id
          })));
        })
        .catch((err) => {
          this.cancel = null
          console.log(err);
          this.tag_choices = [...this.tag_new];
        });
    },
    do_submit() {
      this.$emit('submit', this.tag_new.map(x => x.value || x) || [this.tag_typing])
    }
  },
};
</script>
