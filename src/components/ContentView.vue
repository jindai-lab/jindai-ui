<template>
  <div class="paragraph mt-5">
    <p v-html="content" v-if="is_html"></p>
    <p v-else>
      {{ content }}
      <!-- <v-btn class="fav-button" :color="favored ? 'orange' : ''" :dark="favored" icon small @click="fav(paragraph); $forceUpdate();
      ">
        <v-icon small>mdi-star</v-icon>
      </v-btn> -->
    </p>
    <div v-if="paragraph.images && paragraph.images.length">
      <v-row float>
        <v-card v-for="item in first_item_only
        ? paragraph.images.slice(0, 1)
        : paragraph.images" :key="item._id" :width="item_width" style="overflow: hidden" class="ma-5">
          <v-img :contain="contain" :height="item_height" :src="item.getUrl()"></v-img>
        </v-card>
      </v-row>
    </div>
  </div>
</template>

<script lang="ts">
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
    tags() {
      var sorted = [...this.paragraph.keywords].filter((x) => x).sort();
      if (!this.show_all_tags && sorted.length > 20) sorted = [...sorted.slice(0, 20), "..."];
      return sorted;
    },
    text() {
      return this.paragraph.content || "";
    },
  },
  methods: {
    tag_class(tag: string) {
      return tag.startsWith("#")
        ? "t_group"
        : tag == this.paragraph.author
          ? "t_author"
          : tag != 'author' && tag != 'group' ?
            "t_" + tag : '';
    },
  },
}
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
}
</style>