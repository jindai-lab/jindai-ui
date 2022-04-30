<template>
  <v-card flat>
    <v-card-title> 自动标签 </v-card-title>
    <v-card-text>
      <v-data-iterator
        :items="auto_tags"
        :items-per-page="20"
        :page.sync="page"
        :search="search"
        hide-default-footer
        no-data-text="无可用数据"
      >
        <template v-slot:header>
          <v-toolbar class="mb-1" flat>
            <v-text-field
              v-model="search"
              clearable
              flat
              solo-inverted
              hide-details
              prepend-inner-icon="mdi-magnify"
              label="查找"
            ></v-text-field>
          </v-toolbar>
          <v-toolbar flat class="mb-5">
            <v-text-field
              v-model="new_tag.pattern"
              label="匹配 URL 格式"
            ></v-text-field>

            <v-text-field
              v-model="new_tag.from_tag"
              class="new-tag-data"
              label="匹配标签"
              @input="
                $event && $event.startsWith('@')
                  ? (new_tag.tag = $event.replace(/@\d*/, '*'))
                  : ''
              "
            ></v-text-field>

            <v-text-field
              v-model="new_tag.tag"
              label="标记为"
              class="new-tag-data"
            ></v-text-field>

            <v-btn @click="auto_tags_create(new_tag)" class="new-tag-data">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-toolbar>
          <v-row>
            <v-col
              v-for="(key, index) in ['匹配 URL', '匹配标签', '标记为', '操作']"
              :key="index"
              >{{ key }}</v-col
            >
          </v-row>
        </template>

        <template v-slot:default="props">
          <v-row v-for="item in props.items" :key="item._id" cols="12">
            <v-col
              v-for="(key, index) in ['pattern', 'from_tag', 'tag']"
              :key="index"
            >
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
              @click="formerPage"
            >
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <span class="mr-4 ml-4 grey--text">
              第 {{ page }} / {{ numberOfPages }} 页
            </span>
            <v-btn
              small
              dark
              fab
              color="blue darken-3"
              class="ml-1"
              @click="nextPage"
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
      from_tag: "",
      pattern: "",
    },
  }),
  computed: {
    numberOfPages() {
      return Math.ceil(this.auto_tags.length / 20);
    },
  },
  mounted() {
    this.reload();
  },
  methods: {
    auto_tags_create() {
      api.put("plugins/autotags", this.new_tag).then((data) => {
        if (!data.exception) {
          this.new_tag.tag = "";
          this.new_tag.from_tag = "";
          this.new_tag.pattern = "";
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
    nextPage() {
      if (this.page + 1 <= this.numberOfPages) this.page += 1;
    },
    formerPage() {
      if (this.page - 1 >= 1) this.page -= 1;
    },
    do_search(items, search) {
      if (!search) return items;
      return items.filter(
        (x) =>
          [x.pattern, x.tag, x.from_tag]
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
  margin-left: 10px;
}
</style>