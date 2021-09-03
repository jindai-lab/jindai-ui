<template>
  <div class="message-box dialog-mask" @click="$close(null)">
    <div class="dialog-content">
      <header>{{ title }}</header>
      <div class="dialog-body">
        <div class="mui-select">
          <select v-model="field" @change="refresh_tags">
            <option value="keywords">标签</option>
            <option value="groups">分组</option>
            <option value="people">作者</option>
          </select>
        </div>
        <p>
          <vue-tags-input
            :tags="tags"
            @tags-changed="(newTags) => (tags = newTags)"
          />
        </p>
      </div>
      <footer>
        <button
          type="text"
          size="mini"
          @click="
            $close({
              tags: this.tags,
              field: this.field,
              initial_tags: this.initial_tags,
            })
          "
          >保存</button
        >
        <button type="text" size="mini" @click="$close(null)"
          >取消</button
        >
      </footer>
    </div>
  </div>
</template>

<script>
import VueTagsInput from "@johmun/vue-tags-input";

export default {
  name: "GalleryTagging",
  components: { VueTagsInput },
  props: ["items", "default_field"],
  data() {
    return {
      tags: [],
      initial_tags: [],
      field: "keywords",
    };
  },
  mounted() {
    this.field = this.default_field || "keywords";
  },
  methods: {
    refresh_tags() {
      this.tags = Array.from(
        new Set(
          this.items
            .map((x) => x[this.field])
            .reduce((prev, current) => (prev || []).concat(current))
        )
      );
      this.initial_tags = [].concat(this.tags);
    },
  },
};
</script>
