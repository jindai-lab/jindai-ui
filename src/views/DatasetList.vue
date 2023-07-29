<template>
  <v-card flat>
    <v-card-title>{{ $t("datasets") }}</v-card-title>
    <v-card-text>
      <v-data-table :items="datasets" :search="search" :headers="[
        { text: $t('name'), value: 'name' },
        { text: $t('tag'), value: 'tag' },
        { text: $t('operations'), value: 'operations' },
      ]">
        <template v-slot:top>
          <v-toolbar flat>
            <v-text-field v-model="search" clearable flat hide-details prepend-inner-icon="mdi-magnify"
              :label="$t('search')"></v-text-field>
          </v-toolbar>
          <v-toolbar flat class="mb-5">
            
        <v-col class="opers" cols="2">
          <v-btn icon @click="append_dataset">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-col>
        <v-col>
          <ParamInput :arg="{ name: $t('name'), type: '', default: '' }" v-model="input_coll.name" />
        </v-col>
        <v-col>
          <ParamInput :arg="{ name: $t('display-name'), type: '', default: '' }" v-model="input_coll.display_name" />
        </v-col>
        <v-col>
          <ParamInput :arg="{ name: $t('mongocollection'), type: '', default: '' }"
            v-model="input_coll.mongocollection" />
        </v-col>
      </v-toolbar>
      <v-toolbar flat>
      <v-btn @click="save" color="primary">
        <v-icon>mdi-check</v-icon> {{ $t("save") }}
      </v-btn>
          </v-toolbar>
        </template>

        <template v-slot:item.name="{ item }">
          {{ item.display_name || item.name }}
          <span v-if="item.display_name">({{ item.name }})</span>
        </template>

        <template v-slot:item.tag="{ item }"><v-combobox v-model="item.tags" flat multiple chips dense
            :items="all_tags" deletable-chips @change="update_tags(item)"></v-combobox>
        </template>

        <template v-slot:item.operations="{ item }">
          <v-btn icon @click="rename_collection(item, prompt($t('raname-to'), item.name))">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon @click="refresh_sources(item)">
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card-text></v-card>
</template>

<script>
import ParamInput from "../components/ParamInput";
import api from "../api";

export default {
  name: "DatasetList",
  components: {
    ParamInput,
  },
  data() {
    return {
      datasets: [],
      input_coll: {},
      valid: [],
      search: '',
    };
  },
  computed: {
    all_tags() {
      return Array.from(new Set(this.datasets.map(x => x.tags).reduce((prev, curr) => prev.concat(curr), [])))
    }
  },
  mounted() {
    this.load_datasets();
  },
  methods: {
    load_datasets() {
      api.get_datasets().then((x) => (this.datasets = x));
    },
    prompt(t, v) {
      return window.prompt(t, v);
    },
    update_valid(id, field, value) {
      var coll = { _id: id };
      coll[field] = value;
      this.business.datasets({edit: coll}).then(() => this.$notify(this.$t("updated")));
    },
    save() {
      if (this.valid.length > 0) {
        alert(this.$t("invalid-input"));
        return;
      }
      this.business.datasets({batch: 
          this.datasets.map((x, i) =>
            Object.assign({}, x, { order_weight: i, sources: null })
          )})
        .then(() => this.$notify(this.$t("saved")));
    },
    append_dataset() {
      if (!this.input_coll.name) return;
      this.business.datasets({edit: this.input_coll}).then(() => {
        this.load_datasets();
        this.input_coll = {};
      });
    },
    rename_collection(coll, to) {
      if (coll && to)
        this.business.datasets({rename: { _id: coll._id, to }})
          .then(() => this.$notify(this.$t("renamed")))
          .then(this.load_datasets);
    },
    refresh_sources(coll) {
      this.business.datasets({sources: { _id: coll._id }})
        .then(() => this.$notify(this.$t("refreshed")));
    },
    update_tags(ds) {
      this.business.datasets({edit: {_id: ds._id, tags: ds.tags}})
        .then(() => this.$notify(this.$t("saved")));
    }
  },
};
</script>

<style scoped>
label {
  font-size: 20px;
  text-align: right;
  vertical-align: baseline;
  line-height: 64px;
}

[disabled] {
  opacity: 0;
}
</style>
