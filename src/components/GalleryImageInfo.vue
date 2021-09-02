<template>
  <div>
    <div class="text-content">
      {{ item.content }}
    </div>
    <div class="meta-data">
     <span>
         {{ item.pdate }}  ⭐ {{ +(item.rating).toFixed(1) }}
     </span>
      <span class="meta author"
        >作者:
        <a
          href="javascript:void(0);"
          @click="jump_to({ people: p })"
          v-for="p in item.people"
          :key="p"
          >{{ p }}</a
        ></span
      >
      <span class="meta groups"
        >分组:
        <a
          href="javascript:void(0);"
          @click="jump_to({ groups: p })"
          v-for="p in item.groups"
          :key="p"
          >{{ p }}</a
        ></span
      >
      <span class="meta source"
        >来源:
        <a href="javascript:void(0);" @click="jump_to({ source: item.source })">
          {{ item.source.url }}
        </a>
        <a :href="item.source.url" target="_blank" v-if="item.source.url"
          ><font-awesome-icon icon="window-restore"></font-awesome-icon> </a
      ></span>
      <span class="meta keywords"
        >标签:
        <a
          href="javascript:void(0);"
          @click="jump_to({ keywords: p })"
          v-for="p in item.keywords"
          :key="p"
          >{{ p }}</a
        ></span
      >
    </div>
  </div>
</template>

<script>
export default {
  name: "GalleryImageInfo",
  props: ["item"],
  methods: {
    jump_to(arg) {
      this.$emit("jump_to", arg);
    },
  },
};
</script>

<style scoped>
.text-content, .meta-data {
  word-break: break-all;
}

span.meta a {
  margin-right: 5px;
}

span.meta {
  margin-right: 5px;
  display: block;
}
</style>