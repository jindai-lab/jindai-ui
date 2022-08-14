<template>
  <div
    class="paragraph mt-5"
    v-if="['file', 'list', 'page'].includes(view_mode)"
  >
    <p v-html="content" v-if="is_html"></p>
    <p v-else>
      {{ content }}
      <v-btn
        class="fav-button"
        :color="favored ? 'orange' : ''"
        :dark="favored"
        icon
        small
        @click="
          fav();
          $forceUpdate();
        "
        ><v-icon small>mdi-star</v-icon></v-btn
      >
    </p>
    <div v-if="paragraph.images && paragraph.images.length">
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
            :contain="contain"
            :height="item_height"
            :src="get_item_image(item)"
          ></v-img>
        </v-card>
      </v-row>
    </div>
  </div>
  <div class="gallery-item" v-else>
    <div class="gallery-description">
      <span class="nums">
        <span class="datetime">
          {{ paragraph.pdate | dateSafe }}
        </span>
        <span class="count"
          ><a
            class="counter secondary--text chip"
            target="_blank"
            :href="paragraph.group_url || `/?q=id%3DObjectId(${paragraph._id})`"
            >{{ paragraph.count || paragraph.images.length }}</a
          ></span
        >
        <a
          :href="paragraph.source.url"
          target="_blank"
          class="orig no-underline"
          >🌍</a
        >
      </span>
      <a
        :href="'/?q=source.url%3D`' + (paragraph.source.url || '') + '`'"
        class="force-text break-anywhere"
        target="_blank"
        >{{ paragraph.source.url }}</a
      >
      <p class="content"> {{ text }} </p>
      <template v-for="tag in tags">
        <a
          v-if="tag != '...'"
          :key="`${paragraph._id}-${Math.random()}-${tag}`"
          :href="'/?' + querystring_stringify({
            groups: tag.match(/^\*/) ? 'none' : (tag.match(/^@/) ? 'group' : ''),
            q: 
              tag.match(/^[@*]/)
                ? quote(tag)
                : quote(tag) + ',' + scope(paragraph)
          })"
          :class="['tag', 'chip', tag_class(tag)]"
          target="_blank"
          >{{ tag }}</a
        >
        <span class="tag" :key="tag" v-else>...</span>
      </template>
    </div>
  </div>
</template>

<script>
import api from "../api";

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
  computed: {
    is_html() {
      return this.content.match(/<.*>/);
    },
    content() {
      return this.paragraph.matched_content || this.paragraph.content;
    },
    favored() {
      return api.favored(this.paragraph);
    },
    tags() {
      var sorted = [...this.paragraph.keywords].filter((x) => x).sort();
      if (sorted.length > 20) sorted = [...sorted.slice(0, 20), "..."];
      return sorted;
    },
    text() {
      return this.paragraph.content || "";
    },
  },
  methods: {
    _open_window(url) {
      window.open(url);
    },
    get_item_image(i) {
      return api.get_item_image(i);
    },
    fav() {
      api.fav(this.paragraph);
    },
    quote(x) {
      return JSON.stringify("" + x);
    },
    tag_class(tag) {
      return tag.startsWith("*")
        ? "t_group"
        : tag == this.paragraph.author
        ? "t_author"
        : "t_" + tag;
    },
    querystring_stringify: api.querystring_stringify,
    scope: api.scope
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
.gallery-description a {
  margin-right: 5px;
}

.gallery-description .content {
  max-height: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gallery-description a.tag.t_author,
.gallery-description a.tag.t_group {
  color: white !important;
  border-radius: 5px;
  text-decoration: none;
}

.gallery-description a.tag.t_author {
  background-color: darkorange;
}

.gallery-description a.tag.t_group {
  background-color: purple;
}

.gallery-description a {
  text-decoration: none;
}

.gallery-description .break-anywhere {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  display: inline-block;
  line-height: 100%;
  vertical-align: middle;
}

.gallery-description span.nums > * {
  margin-right: 5px;
}

.gallery-description,
.gallery-description .force-text {
  color: rgba(0, 0, 0, 0.6);
}

.theme--dark .gallery-description,
.theme--dark .gallery-description .force-text {
  color: rgba(255, 255, 255, 0.6);
}

.paragraph > p {
  font-family: Georgia, "Times New Roman", Times, serif;
}
</style>