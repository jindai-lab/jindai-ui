<template>
  <v-card flat>
    <v-card-title> {{ $t("auto-tagging") }} </v-card-title>
    <v-card-text>
      <v-data-table
        :items="auto_tags"
        :search="search"
        :headers="[
          { text: $t('match-cond'), value: 'cond' },
          { text: $t('tag'), value: 'tag' },
          { text: $t('operations'), value: 'operations' },
        ]"
      >
        <template v-slot:top>
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
            <v-text-field v-model="new_tag.cond" :label="$t('match-cond')"></v-text-field>
            <v-text-field
              v-model="new_tag.tag"
              :label="$t('tag')"
              class="new-tag-data"
            ></v-text-field>

            <v-btn @click="auto_tags_create(new_tag)" class="new-tag-data">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-toolbar>
        </template>

        <template v-slot:item.operations="{ item }">
          <v-btn @click="auto_tags_delete([item._id])" :alt="`Delete ${item._id}`">
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

<script>
export default {
  name: "AutoTags",
  data: () => ({
    auto_tags: [],
    search: "",
    new_tag: {
      tag: "",
      cond: "",
    },
  }),
  mounted() {
    this.reload();
  },
  methods: {
    auto_tags_create() {
      if (this.new_tag.cond.startsWith("@@")) {
        this.new_tag.cond = "author=" + this.new_tag.cond.substring(1);
      }
      if (!this.new_tag.tag) {
        this.new_tag.tag = "#" + this.api.guess_groups(this.new_tag.cond).pop();
      }
      if (this.new_tag.tag == this.new_tag.cond || !this.new_tag.tag) return;
      this.business.autotags({creation: this.new_tag}).then((data) => {
        if (!data.__exception__) {
          this.new_tag.tag = "";
          this.new_tag.cond = "";
          this.reload();
        }
      });
    },
    auto_tags_delete(ids) {
      this.business.autotags({ deletion: ids })
        .then(
          () => (this.auto_tags = this.auto_tags.filter((x) => !ids.includes(x._id)))
        );
    },
    auto_tags_apply(id) {
      this.business.autotags({apply: id}).then(() => this.$notify(this.$t("success")));
    },
    async reload() {
      this.auto_tags = await this.business.autotags();
    },
  },
};
</script>

<style scoped>
.new-tag-data {
  margin-left: 2vw;
}
</style>
