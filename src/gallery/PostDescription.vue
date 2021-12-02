<template>
  <v-row>
    <span class="nums">
      <span class="datetime">
        {{ new Date(post.created_at * 1000).toLocaleDateString() }}
      </span>
      <span class="score" v-show="post.score">{{ post.score }}</span>
      <span class="count"
        ><a class="counter secondary--text" target="_blank" :href="post.group">{{
          post.count || post.items.length
        }}</a></span
      >
    </span>
    <a
      :href="
        '?archive=0&query=source_url%25`' +
        post.source_url.replace(/\/\d+(\/|$)/, '/.*$1') +
        '`'
      "
      class="break-anywhere force-text"
      target="_blank"
      >{{ post.source_url }}</a
    >
    {{ text }}
    <a
      :href="
        '?query=' +
        encodeURIComponent(
          quote(tag) +
            (post.author && !['t_group', 't_author'].includes(tag_class(tag))
              ? ',`' + post.author + '`'
              : '')
        ) +
        '&post=' +
        special_page
      "
      :class="['tag', tag_class(tag), 'force-text']"
      target="_blank"
      v-for="tag in tags"
      :key="`${post._id}-${Math.random()}-${tag}`"
      >{{ tag }}</a
    >
    <a :href="post.source_url" target="_blank" class="orig no-underline">🌍</a>
  </v-row>
</template>

<script>
export default {
  name: "PostDescription",
  props: ["post"],
  computed: {
    special_page() {
      return new URLSearchParams(location.search.substr(1)).get("post", "");
    },
    text() {
      var candidates = this.post.tags.filter(this._is_text)
      if (candidates) {
        var longest = candidates.sort(x => x.length).pop()
        candidates = [longest, ... candidates.filter(x => !longest.includes(x))]
        return candidates.join(' ')
      }
      return ''
    },
    tags() {
      return this.post.tags.filter(x => !this._is_text(x)).sort()
    }
  },
  methods: {
    _is_text (x) {return encodeURIComponent(x).replace(/%[0-9a-f]{2}/ig, 'x').length > 20 || x.match(/[\s.,?!。，？…]/)},
    quote(tag) {
      if (tag.match(/[\s.,+%:/]/)) return "`" + tag + "`";
      return tag;
    },
    tag_class(tag) {
      return tag.startsWith("*")
          ? "t_group"
          : tag == this.post.author ? "t_author" : "t_" + tag;
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
  width: 100%;
  display: inline-block;
}
span.nums > * {
  margin-right: 5px;
}
.force-text {
  color: var(--seconday--text);
}
</style>