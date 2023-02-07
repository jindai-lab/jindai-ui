<template>
  <v-card flat>
    <v-card-title> {{ $t("auto-tagging") }} </v-card-title>
    <v-card-text>
      <v-data-table :items="auto_tags" :items-per-page="20" :page.sync="page" :search="search" :headers="[
        { text: $t('match-cond'), value: 'cond' },
        { text: $t('tag'), value: 'tag' },
        { text: $t('operations'), value: 'operations' },
      ]">
        <template v-slot:top>
          <v-toolbar flat>
            <v-text-field v-model="search" clearable flat hide-details prepend-inner-icon="mdi-magnify"
              :label="$t('search')"></v-text-field>
          </v-toolbar>
          <v-toolbar flat class="mb-5">
            <v-text-field v-model="new_tag.cond" :label="$t('match-cond')"></v-text-field>
            <v-text-field v-model="new_tag.tag" :label="$t('tag')" class="new-tag-data"></v-text-field>

            <v-btn @click="auto_tags_create()" class="new-tag-data">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-toolbar>
        </template>

        <template v-slot:item.operations="{ item }">
          <v-btn @click="auto_tags_delete(item._id)" :alt="`Delete ${item._id}`">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <v-btn class="ml-5" @click="auto_tags_apply(item._id)">
            <v-icon>mdi-check</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">

import { UIParagraph } from "@/api";
import { AutoTag } from '@/api/dbo';
import { call } from "@/api/net";
import { notify } from '@/dialogs';

export default {
  name: "AutoTags",
  data: () => ({
    auto_tags: [] as AutoTag[],
    page: 1,
    search: "",
    new_tag: {
      tag: "",
      cond: "",
    },
  }),
  computed: {
    pages_count() {
      return Math.ceil(this.auto_tags.length / 20);
    },
  },
  mounted() {
    this.reload();
  },
  methods: {
    auto_tags_create() {
      if (this.new_tag.cond.startsWith('@@')) {
        this.new_tag.cond = 'author=' + this.new_tag.cond.substring(1)
      }
      if (!this.new_tag.tag) {
        this.new_tag.tag = '#' + UIParagraph.guessGroups(this.new_tag.cond).pop() || ''
      }
      if (this.new_tag.tag == this.new_tag.cond || !this.new_tag.tag) return
      call("plugins/autotags", 'put', this.new_tag).then((data) => {
        this.new_tag.tag = "";
        this.new_tag.cond = "";
        this.reload();
      
      });
    },
    auto_tags_delete(id: string) {
      call("plugins/autotags/" + id, 'delete')
        .then(
          () =>
          (this.auto_tags = this.auto_tags.filter(
            (x) => !id.includes(x._id)
          ))
        );
    },
    auto_tags_apply(id: string) {
      call("plugins/autotags", 'post', { apply: id })
        .then(() => (notify(this.$t('success'))))
    },
    reload() {
      call<AutoTag[]>("plugins/autotags")
        .then((data) => (this.auto_tags = data));
    },
    do_search(items: AutoTag[], search: string) {
      if (!search) return items;
      return items.filter(
        (x) =>
          [x.cond, x.tag]
            .join(" ")
            .toLowerCase()
            .indexOf(search.toLowerCase()) >= 0
      );
    },
  },
}
</script>

<style scoped>
.new-tag-data {
  margin-left: 2vw;
}
</style>