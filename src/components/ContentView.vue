<template>
  <div class="paragraph mt-5" v-if="!view_mode || ['list', 'page'].includes(view_mode)">
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
    <v-img
      v-if="view_mode == 'gallery'"
      :class="paragraph.selected ? 'selected' : ''"
      @click="emit('toggle-select', { paragraph, e: $event })"
      @dblclick="emit('browse', { paragraph })"
      :contain="contain"
      :height="item_height"
      :src="get_item_image(paragraph.images[0])"
    ></v-img>
    <div class="gallery-description">
      <span class="nums">
        <span class="datetime">
          {{ paragraph.pdate | dateSafe }}
        </span>
        <span class="count"
          ><a
            class="counter secondary--text"
            target="_blank"
            :href="paragraph.group || `?q=id%3DObjectId(${paragraph._id})`"
            >{{ paragraph.count || paragraph.images.length }}</a
          ></span
        >
      </span>
      <a
        :href="
          '?archive=0&q=source.url%25`' +
          (paragraph.source.url || '').replace(/\/\d+(\/|$)/, '/.*$1') +
          '`'
        "
        class="force-text break-anywhere"
        target="_blank"
        >{{ paragraph.source.url }}</a
      >
      {{ text }}
      <a
        :href="
          '?q=' +
          encodeURIComponent(
            quote(tag) +
              (paragraph.author && !tag.match(/^[*@]/)
                ? ',`' + paragraph.author + '`'
                : '')
          )
        "
        :class="['tag', tag_class(tag), 'force-text']"
        target="_blank"
        v-for="tag in tags"
        :key="`${paragraph._id}-${Math.random()}-${tag}`"
        >{{ tag }}</a
      >
      <a :href="paragraph.source.url" target="_blank" class="orig no-underline"
        >🌍</a
      >
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
      return this.paragraph.keywords.filter((x) => !this._is_text(x)).sort();
    },
    text() {
      var t = this.paragraph.content || "";
      var candidates = this.paragraph.keywords.filter(this._is_text);
      if (candidates) {
        var longest = candidates.sort((x) => x.length).pop();
        candidates = [
          longest,
          ...candidates.filter((x) => !longest.includes(x)),
        ];
        return t + " " + candidates.join(" ");
      }
      return t;
    },
  },
  methods: {
    get_item_image(i) {
      return api.get_item_image(i);
    },
    fav() {
      api.fav(this.paragraph);
    },
    _is_text(x) {
      x = x || ''
      return (
        encodeURIComponent(x).replace(/%[0-9a-f]{2}/gi, "x").length > 20 ||
        x.match(/[\s.,?!。，？…]/)
      );
    },
    quote: api.quote,
    tag_class(tag) {
      return tag.startsWith("*")
        ? "t_group"
        : tag == this.paragraph.author
        ? "t_author"
        : "t_" + tag;
    },
    emit(event, bundle) {
      bundle.vm = this;
      this.$emit(event, bundle);
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
.gallery-description a {
  margin-right: 5px;
}

.gallery-description a.tag {
  text-decoration: underline;
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

.gallery-description, .gallery-description .force-text {
  color: rgba(0, 0, 0, 0.6)
}

.theme--dark .gallery-description, .theme--dark .gallery-description .force-text {
  color: rgba(255, 255, 255, 0.6);
}

.v-image.selected::before {
  content: "\F012C";
  color: green;
  font-family: "Material Design Icons";
  display: block;
  z-index: 4;
  position: absolute;
  margin: 0;
  font-size: 40px;
  opacity: 1;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
}

</style>