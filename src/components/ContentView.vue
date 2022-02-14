<template>
  <div class="paragraph">
    <p v-html="content" v-if="is_html"></p>
    <p v-else v-text="content"></p>
    <v-row justify="start" v-if="paragraph.images">
      <v-col
        v-for="item in first_item_only
          ? paragraph.images
          : paragraph.images.slice(0, 1)"
        :key="item._id"
        cols="12"
        xs="12"
        sm="6"
        md="3"
        lg="2"
      >
        <v-card
          :width="item_width"
          style="overflow: hidden"
        >
          <v-img
            :contain="true"
            :height="item_height"
            :src="get_item_image(g.images[0])"
          ></v-img>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  name: "ContentView",
  props: ["paragraph", "first_item_only", "item_width", "item_height"],
  computed: {
    is_html() {
      return this.content.match(/<.*>/);
    },
    content() {
      return this.paragraph.matched_content || this.paragraph.content
    },
  },
};
</script>

<style>
</style>