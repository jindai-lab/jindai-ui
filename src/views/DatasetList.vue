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

<script lang="ts">
import draggable from "vuedraggable";
import { UIDataset } from "@/api";
import { Dataset } from "@/api/dbo";
import { call } from "@/api/net";
import { notify } from "@/dialogs";
import ParamInput from "../components/ParamInput.vue";

export default {
  name: "DatasetList",
  components: {
    ParamInput,
    draggable,
  },
  data() {
    return {
      datasets: [] as UIDataset[],
      input_coll: {} as Partial<Dataset>,
      valid: [],
    };
  },
  mounted() {
    this.load_datasets();
  },
  methods: {
    load_datasets() {
      UIDataset.get_datasets().then((x) => (this.datasets = x));
    },
    update_valid(id: string, field: string, value: string) {
      var coll : Partial<Dataset> = { _id: id };
      coll[field as keyof Dataset] = value;
      call("datasets/edit", 'post', coll)
        .then(() => notify(this.$t("updated")));
    },
    save() {
      if (this.valid.length > 0) {
        alert(this.$t("invalid-input"));
        return;
      }
      call(
          "datasets/batch",
          'post',
          this.datasets.map((x, i) =>
            Object.assign({}, x, { order_weight: i, sources: null })
          )
        )
        .then(() => notify(this.$t("saved") ));
    },
    append_dataset() {
      if (!this.input_coll.name) return;
      call("datasets/edit", 'post', this.input_coll).then(() => {
        this.load_datasets();
        this.input_coll = {};
      });
    },
    rename_collection(coll:UIDataset, to:string) {
      if (coll && to)
        call("datasets/rename", 'post', { _id: coll._id, to })
          .then(() => notify(this.$t("renamed") ))
          .then(this.load_datasets);
    },
    refresh_sources(coll:UIDataset) {
      call("datasets/sources", 'post',  { _id: coll._id })
        .then(() => notify(this.$t("refreshed") ));
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