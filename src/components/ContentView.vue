<template>
  <div class="paragraph">
    <p v-html="content" v-if="is_html"></p>
    <p v-else v-text="content"></p>
    <div v-if="paragraph.images">
      <v-row float>
        <v-card
          v-for="item in first_item_only
            ? paragraph.images.slice(0, 1)
            : paragraph.images"
          :key="item._id"
          :width="item_width"
          style="overflow: hidden"
          class="ma-5"
        >
          <v-img
            :contain="true"
            :height="item_height"
            :src="get_item_image(item)"
          ></v-img>
        </v-card>
      </v-row>
    </div>
  </div>
</template>

<script>
import galleryApi from "../gallery/gallery-api";

export default {
  name: "ContentView",
  props: ["paragraph", "first_item_only", "item_width", "item_height"],
  computed: {
    is_html() {
      return this.content.match(/<.*>/);
    },
    content() {
      return this.paragraph.matched_content || this.paragraph.content;
    },
  },
  methods: {
    get_item_image(i) {
      return galleryApi.get_item_image(i);
    },
  },
};
</script>

<style>
</style>