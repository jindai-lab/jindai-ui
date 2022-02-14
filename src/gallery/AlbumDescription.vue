<template>
  <v-row>
    <span class="nums">
      <span class="datetime">
        {{ new Date(album.pdate).toLocaleDateString() }}
      </span>
      <span class="score" v-show="album.score">{{ album.score }}</span>
      <span class="count"
        ><a class="counter secondary--text" target="_blank" :href="album.group">{{
          album.count || album.images.length
        }}</a></span
      >
    </span>
    <a
      :href="
        '?archive=0&query=source.url%25`' +
        (album.source.url||'').replace(/\/\d+(\/|$)/, '/.*$1') +
        '`'
      "
      class="force-text break-anywhere"
      target="_blank"
      >{{ album.source.url }}</a
    >
    {{ text }}
    <a
      :href="
        '?query=' +
        encodeURIComponent(
          quote(tag) +
            (album.author && !tag.match(/^[*@]/)
              ? ',`' + album.author + '`'
              : '')
        ) +
        '&post=' +
        special_page
      "
      :class="['tag', tag_class(tag), 'force-text']"
      target="_blank"
      v-for="tag in tags"
      :key="`${album._id}-${Math.random()}-${tag}`"
      >{{ tag }}</a
    >
    <a :href="album.source.url" target="_blank" class="orig no-underline">🌍</a>
  </v-row>
</template>

<script>
import api from "./gallery-api"
export default {
  name: "AlbumDescription",
  props: ["album"],
  computed: {
    special_page() {
      return new URLSearchParams(location.search.substr(1)).get("post", "");
    },
    text() {
      var t = this.album.content || ''
      var candidates = this.album.keywords.filter(this._is_text)
      if (candidates) {
        var longest = candidates.sort(x => x.length).pop()
        candidates = [longest, ... candidates.filter(x => !longest.includes(x))]
        return t + ' ' + candidates.join(' ')
      }
      return t
    },
    tags() {
      return this.album.keywords.filter(x => !this._is_text(x)).sort()
    }
  },
  methods: {
    _is_text (x) {return encodeURIComponent(x).replace(/%[0-9a-f]{2}/ig, 'x').length > 20 || x.match(/[\s.,?!。，？…]/)},
    quote: api.quote,
    tag_class(tag) {
      return tag.startsWith("*")
          ? "t_group"
          : tag == this.album.author ? "t_author" : "t_" + tag;
    },
  },
};
</script>

<style scoped>
div a {
  margin-right: 5px;
}
a.tag {
  text-decoration: underline;
}
a.tag.t_author, a.tag.t_group {
  color: white !important;
  border-radius: 5px;
  text-decoration: none;
}
a.tag.t_author {
  background-color: darkorange;
}
a.tag.t_group {
  background-color: purple;
}
a {
  text-decoration: none;
}
.break-anywhere {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  display: inline-block;
}
span.nums > * {
  margin-right: 5px;
}
.force-text {
  color: var(--seconday--text);
}
</style>