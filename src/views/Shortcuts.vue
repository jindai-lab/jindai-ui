<template>
  <v-card flat>
    <v-card-title> {{ $t("shortcuts") }} </v-card-title>
    <v-card-text>
      <v-data-table :items="shortcuts" :items-per-page="20" :page.sync="page" :search="search" :headers="[
        { text: $t('name'), value: 'name' },
        { text: $t('expression'), value: 'expr' }
      ]">
        <template v-slot:top>
          <v-toolbar flat>
            <v-text-field v-model="search" clearable flat hide-details prepend-inner-icon="mdi-magnify"
              :label="$t('search')"></v-text-field>
          </v-toolbar>
          <v-toolbar flat class="mb-5">
            <v-text-field v-model="new_shortcut.name" :label="$t('name')"></v-text-field>
            <v-text-field v-model="new_shortcut.expr" :label="$t('expression')"
              class="new-shortcut-data"></v-text-field>

            <v-btn @click="shortcut_create()" class="new-shortcut-data">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-toolbar>
        </template>
        <template v-slot:body="{ items, headers }">
          <tbody>
            <tr v-for="(item, idx,) in items" :key="idx">
              <td v-for="(header, key) in headers" :key="key">
                <v-edit-dialog :return-value.sync="item[header.value]" @save="submit(item)" @cancel="cancel_edit(item)"
                  @open="before_edit(item)"> {{ item[header.value]}}
                  <template v-slot:input>
                    <ParamInput v-model="item[header.value]"
                      :arg="{ type: item.name.startsWith(':') ? 'QUERY' : 'str', name: '', description: '', default: '' }"
                      :label="$t('edit')" :key="item.name" @submit="submit(item)"></ParamInput>
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

<script lang="ts">

import ParamInput from "../components/ParamInput.vue";
import { TaggingShortcut } from "@/api/dbo"
import { call } from "@/api/net";
export default {
  name: "Shortcuts",
  data: () => ({
    shortcuts: [] as TaggingShortcut[],
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
    pagesCount() {
      return Math.ceil(this.shortcuts.length / 20);
    },
  },
  mounted() {
    this.reload();
  },
  methods: {
    shortcut_create() {
      if (this.new_shortcut.name && this.new_shortcut.expr) {
        this.submit(this.new_shortcut).then(() => {
          this.new_shortcut.name = this.new_shortcut.expr = ''
        })
      }
    },
    shortcut_delete(key: string) {
      call("plugins/shortcuts", 'post', { key: key, value: '' })
        .then(
          () => this.reload()
        );
    },
    reload() {
      call<TaggingShortcut[]>("plugins/shortcuts")
        .then((data) => (this.shortcuts = data));
    },
    next_page() {
      if (this.page + 1 <= this.pagesCount) this.page++;
    },
    prev_page() {
      if (this.page - 1 >= 1) this.page--;
    },
    before_edit(item: TaggingShortcut) {
      this.new_shortcut.name = item.name
      this.new_shortcut.expr = item.expr
    },
    cancel_edit(item: TaggingShortcut) {
      item.name = this.new_shortcut.name
      item.expr = this.new_shortcut.expr
    },
    submit(item: TaggingShortcut) {
      return call("plugins/shortcuts", 'post', { key: item.name, value: item.expr }).then((data) => {
        this.new_shortcut.name = "";
        this.new_shortcut.expr = "";
        this.reload();
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