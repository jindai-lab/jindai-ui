<template>
  <div class="paragraph mt-5" :style="{'font-size': api.config.font_size + 'px'}">
    <p v-html="content" v-if="is_html" :lang="paragraph.lang"></p>
    <p v-else>
      {{ content }}
      <v-btn class="fav-button" :color="favored ? 'orange' : ''" :dark="favored" icon small @click="
        api.fav(paragraph); $forceUpdate();
      ">
        <v-icon small>mdi-star</v-icon>
      </v-btn>
    </p>
    <div v-if="paragraph.images && paragraph.images.length">
      <v-row float>
        <v-card v-for="item in first_item_only
        ? paragraph.images.slice(0, 1)
        : paragraph.images" :key="item._id" :width="item_width" class="ma-5">
          <v-img :contain="contain" :height="item_height" :src="api.get_item_image(item)"></v-img>
        </v-card>
      </v-row>
    </div>
  </div>
</template>

<script>
export default {
  name: "ContentView",
  props: [
    "paragraph",
    "first_item_only",
    "item_width",
    "item_height",
    "view_mode",
    "contain",
  ],
  data: () => ({
    show_all_tags: false
  }),
  computed: {
    is_html() {
      return this.content.match(/<.*>/);
    },
    content() {
      return this.paragraph.matched_content || this.paragraph.content;
    },
    favored() {
      return this.api.favored(this.paragraph);
    },
    tags() {
      var sorted = [...this.paragraph.keywords].filter((x) => x).sort();
      if (!this.show_all_tags && sorted.length > 20) sorted = [...sorted.slice(0, 20), "..."];
      return sorted;
    },
    text() {
      return this.paragraph.content || "";
    },
  },
  mounted() {
    document.addEventListener('copy', this.handle_copy)
  },
  beforeDestroy() {
    document.removeEventListener('copy', this.handle_copy)
  },
  methods: {
    quote(x) {
      return JSON.stringify("" + x);
    },
    tag_class(tag) {
      return tag.startsWith("#")
        ? "t_group"
        : tag == this.paragraph.author
          ? "t_author"
          : tag != 'author' && tag != 'group' ?
            "t_" + tag : '';
    },
    handle_copy(e) {
      var text = document.getSelection().toString().replace(/\s+/g, ' ')
      e.clipboardData.setData('text', text)
      e.preventDefault()
    },
  },
};
</script>

<style scoped>
.fav-button {
  opacity: 0;
}

p:hover .fav-button,
.fav-button.orange--text {
  opacity: 1;
}

.paragraph>p {
  font-family: Georgia, "Times New Roman", Times, serif;
  line-height: 150%;
}
</style>
