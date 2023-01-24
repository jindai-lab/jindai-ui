<template>
  <v-card flat>
    <v-card-title> {{ $t("shortcuts") }} </v-card-title>
    <v-card-text>
      <v-data-table :items="shortcuts" :items-per-page="20" :page.sync="page" :search="search" :headers="[
        {text: $t('name'), value: 'name'},
        {text: $t('expression'), value: 'expr'}
      ]">
        <template v-slot:top>
          <v-toolbar flat>
            <v-text-field v-model="search" clearable flat hide-details prepend-inner-icon="mdi-magnify"
              :label="$t('search')"></v-text-field>
          </v-toolbar>
          <v-toolbar flat class="mb-5">
            <v-text-field v-model="new_shortcut.name" :label="$t('name')"></v-text-field>
            <v-text-field v-model="new_shortcut.expr" :label="$t('expression')" class="new-shortcut-data"></v-text-field>

            <v-btn @click="shortcut_create(new_shortcut)" class="new-shortcut-data">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-toolbar>
        </template>
           <template v-slot:body="{ items, headers }">
                <tbody>
                    <tr v-for="(item,idx,) in items" :key="idx">
                        <td v-for="(header,key) in headers" :key="key">
                            <v-edit-dialog
                              :return-value.sync="item[header.value]"
                              @save="submit(item)"
                              @cancel="cancel_edit(item)"
                              @open="before_edit(item)"
                            > {{item[header.value]}}
                              <template v-slot:input>
                                <ParamInput
                                  v-model="item[header.value]"
                                  :arg="{type: item.name.startsWith(':') ? 'QUERY' : 'str'}"
                                  :label="$t('edit')"
                                  :key="item.name"
                                  @submit="submit(item)"
                                ></ParamInput>
                              </template>
                            </v-edit-dialog>
                        </td>
                    </tr>
                </tbody>
            </template>

      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script>

import ParamInput from "../components/ParamInput.vue";

export default {
  name: "Shortcuts",
  data: () => ({
    shortcuts: [],
    page: 1,
    search: "",
    new_shortcut: {
      name: "",
      expr: "",
    },
  }),
  components: {
    ParamInput
  },
  computed: {
    pages_count() {
      return Math.ceil(this.auto_tags.length / 20);
    },
  },
  mounted() {
    this.reload();
  },
  methods: {
    shortcut_create() {
      if (this.new_shortcut.name && this.new_shortcut.expr) {
        this.submit(this.new_shortcut).then(() =>{
        this.new_shortcut.name = this.new_shortcut.expr = ''
        })
      }
    },
    shortcut_delete(ids) {
      this.api
        .call("plugins/shortcuts", { key: ids, value: '' })
        .then(
          () => this.reload()
        );
    },
    auto_tags_apply(id) {
      this.api.call("plugins/shortcuts", { apply: id })
        .then(() => (this.$notify('success')))
    },
    reload() {
      this.api
        .call("plugins/shortcuts")
        .then((data) => (this.shortcuts = data.result));
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
    before_edit(item) {
      this.new_shortcut.name = item.name
      this.new_shortcut.expr = item.expr
    },
    cancel_edit(item) {
      item.name = this.new_shortcut.name
      item.expr = this.new_shortcut.expr
    },
    submit(item) {
      return this.api.call("plugins/shortcuts", {key: item.name, value: item.expr}).then((data) => {
          if (!data.__exception__) {
            this.new_shortcut.name = "";
            this.new_shortcut.expr = "";
            this.reload();
          }
        });
    }
  },
};
</script>

<style scoped>
.new-tag-data {
  margin-left: 2vw;
}
</style>