<template>
  <div class="paragraph mt-5">
    <p v-html="content" v-if="is_html"></p>
    <p v-else>
      {{ content }}
      <v-btn class="fav-button" :color="favored ? 'orange' : ''" :dark="favored" icon small @click="fav(); $forceUpdate()"><v-icon small>mdi-star</v-icon></v-btn>
    </p>
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
import api from "../api"

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
    favored() { return api.favored(this.paragraph) },
  },
  methods: {
    get_item_image(i) {
      return galleryApi.get_item_image(i);
    },
    fav() { api.fav(this.paragraph); },
  },
};
</script>

<style scoped>
.fav-button {
  opacity: 0;
}
p:hover .fav-button, .fav-button.orange--text {
  opacity: 1;
}
</style>