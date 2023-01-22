<template>
  <div class="gallery-item">
    <div class="gallery-description">
      <span class="nums">
        <span class="datetime">{{ paragraph.pdate | dateSafe }}</span>
        <span class="count">
          <a class="counter secondary--text chip" target="_blank"
            :href="'/' + querystring_stringify({
          groups:'none',
          q: `(${get_group(paragraph)})`
        })">{{
            paragraph.count || paragraph.images.length }}</a>
        </span>
        <v-btn :href="paragraph.source.url" target="_blank" class="orig no-underline" icon>
          <v-icon>mdi-web</v-icon>
        </v-btn>
      </span>
      <a :href="'/' + querystring_stringify({
        q: `source(\`${paragraph.source.url || paragraph.source.file || ''}\`)`})" class="force-text break-anywhere"
        target="_blank">{{ paragraph.source.url }}</a>
      <p class="content" @click.ctrl="search_selection">{{ text }}</p>
      <template v-for="tag in tags">
        <a v-if="tag != '...'" :alt="tag" :key="`${paragraph._id}-${Math.random()}-${tag}`" :href="'/' + querystring_stringify({
          groups: tag.match(/^#/) ? 'none' : (tag.match(/^@/) ? 'group' : ''),
          sort: '-pdate',
          q:
            tag.match(/^[@#]/)
              ? quote(tag)
              : quote(tag) + ',' + scope(paragraph)
        })" :class="['tag', 'chip', tag_class(tag)]" target="_blank">{{ tag }}</a>
        <v-btn icon v-else :key="`${paragraph._id}-${Math.random()}-${tag}`" @click="show_all_tags = true">
          <v-icon>mdi-more</v-icon>
        </v-btn>
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
      return api.favored(this.paragraph);
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
    _open_window(url) {
      window.open(url);
    },
    get_item_image(i) {
      return api.get_item_image(i);
    },
    get_group(para) {
      return api.get_group(para)
    },
    fav() {
      api.fav(this.paragraph);
    },
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
    search_selection() {
      var selected = document.getSelection().toString()
      if (!selected)return
      this._open_window(api.querystring_stringify({
        q: `c(${this.quote(selected)}),${this.scope(this.paragraph)}`,
        datasets: [this.paragraph.dataset]
      }))
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

.gallery-description span.nums>* {
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

.paragraph>p {
  font-family: Georgia, "Times New Roman", Times, serif;
}
</style>