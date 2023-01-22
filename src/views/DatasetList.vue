<template>
  <v-card flat>
    <v-card-title>{{ $t("datasets") }}</v-card-title>
    <v-card-text>
      <v-list two-line>
        <draggable v-model="datasets">
          <template v-for="ds in datasets">
            <v-list-item :key="ds._id">
              <v-list-item-content>
                <v-list-item-title>
                  {{ ds.display_name || ds.name }}
                  <span v-if="ds.display_name">({{ ds.name }})</span>
                  <v-btn
                    class="oper"
                    icon
                    @click="
                      rename_collection(ds, prompt($t('raname-to'), ds.name))
                    "
                  >
                    <v-icon>mdi-textbox</v-icon>
                  </v-btn>

                  <v-btn class="oper" icon @click="refresh_sources(ds)">
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </template>
        </draggable>
      </v-list>
      <v-row>
        <v-col class="opers" cols="2">
          <v-btn icon @click="append_dataset">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-col>
        <v-col>
          <ParamInput
            :arg="{ name: $t('name'), type: '', default: '' }"
            v-model="input_coll.name"
        /></v-col>
        <v-col>
          <ParamInput
            :arg="{ name: $t('display-name'), type: '', default: '' }"
            v-model="input_coll.display_name"
        /></v-col>
        <v-col>
          <ParamInput
            :arg="{ name: $t('mongocollection'), type: '', default: '' }"
            v-model="input_coll.mongocollection"
        /></v-col>
      </v-row>
      <v-btn @click="save" color="primary">
        <v-icon>mdi-check</v-icon> {{ $t("save") }}
      </v-btn>
    </v-card-text></v-card
  >
</template>

<script>
import ParamInput from "../components/ParamInput";
import draggable from "vuedraggable";

import api from "../api";

export default {
  name: "DatasetList",
  components: {
    ParamInput,
    draggable,
  },
  data() {
    return {
      datasets: [],
      input_coll: {},
      valid: [],
    };
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
      api
        .call("datasets/edit", coll)
        .then(() => api.notify(this.$t("updated")));
    },
    save() {
      if (this.valid.length > 0) {
        alert(this.$t("invalid-input"));
        return;
      }
      api
        .call(
          "datasets/batch",
          this.datasets.map((x, i) =>
            Object.assign({}, x, { order_weight: i, sources: null })
          )
        )
        .then(() => api.notify(this.$t("saved") ));
    },
    append_dataset() {
      if (!this.input_coll.name) return;
      api.call("datasets/edit", this.input_coll).then(() => {
        this.load_datasets();
        this.input_coll = {};
      });
    },
    rename_collection(coll, to) {
      if (coll && to)
        api
          .call("datasets/rename", { _id: coll._id, to })
          .then(() => api.notify(this.$t("renamed") ))
          .then(this.load_datasets);
    },
    refresh_sources(coll) {
      api
        .call("datasets/sources", { _id: coll._id })
        .then(() => api.notify(this.$t("refreshed") ));
    },
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

.oper {
  opacity: 0;
}

:hover > .oper {
  opacity: 100%;
}
</style>