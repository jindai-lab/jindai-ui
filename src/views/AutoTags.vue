<template>
  <v-card flat>
    <v-card-title> {{ $t("auto-tagging") }} </v-card-title>
    <v-card-text>
      <v-data-iterator
        :items="auto_tags"
        :items-per-page="20"
        :page.sync="page"
        :search="search"
        hide-default-footer
      >
        <template v-slot:header>
          <v-toolbar flat>
            <v-text-field
              v-model="search"
              clearable
              flat
              hide-details
              prepend-inner-icon="mdi-magnify"
              :label="$t('search')"
            ></v-text-field>
          </v-toolbar>
          <v-toolbar flat class="mb-5">
            <v-text-field
              v-model="new_tag.cond"
              :label="$t('match-cond')"
            ></v-text-field>
            <v-text-field
              v-model="new_tag.tag"
              :label="$t('tag')"
              class="new-tag-data"
            ></v-text-field>

            <v-btn @click="auto_tags_create(new_tag)" class="new-tag-data">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-toolbar>
          <v-row>
            <v-col
              v-for="(key, index) in [
                $t('match-cond'),
                $t('tag'),
                $t('operations'),
              ]"
              :key="index"
              >{{ key }}</v-col
            >
          </v-row>
        </template>

        <template v-slot:default="props">
          <v-row v-for="item in props.items" :key="item._id" cols="12">
            <v-col v-for="(key, index) in ['cond', 'tag']" :key="index">
              {{ item[key] }}
            </v-col>
            <v-col>
              <v-btn
                @click="auto_tags_delete([item._id])"
                :alt="`Delete ${item._id}`"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </template>

        <template v-slot:footer>
          <v-row class="mt-2" align="center" justify="center">
            <v-btn
              small
              dark
              fab
              color="blue darken-3"
              class="mr-1"
              @click="prev_page"
            >
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <span class="mr-4 ml-4 grey--text">
              {{ $t("pagination", { page, total: pages_count }) }}
            </span>
            <v-btn
              small
              dark
              fab
              color="blue darken-3"
              class="ml-1"
              @click="next_page"
            >
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-row>
        </template>
      </v-data-iterator>
    </v-card-text>
  </v-card>
</template>

<script>
import api from "../api";

export default {
  name: "AutoTags",
  data: () => ({
    auto_tags: [],
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
      api.put("plugins/autotags", this.new_tag).then((data) => {
        if (!data.__exception__) {
          this.new_tag.tag = "";
          this.new_tag.cond = "";
          this.reload();
        }
      });
    },
    auto_tags_delete(ids) {
      api
        .call("plugins/autotags", { ids, delete: true })
        .then(
          () =>
            (this.auto_tags = this.auto_tags.filter(
              (x) => !ids.includes(x._id)
            ))
        );
    },
    reload() {
      api
        .call("plugins/autotags")
        .then((data) => (this.auto_tags = data.result));
    },
    next_page() {
      if (this.page + 1 <= this.pages_count) this.page++;
    },
    prev_page() {
      if (this.page - 1 >= 1) this.page--;
    },
    do_search(items, search) {
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
};
</script>

<style scoped>
.new-tag-data {
  margin-left: 2vw;
}
</style>