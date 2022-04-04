<template>
  <v-card flat>
    <v-card-title>数据集</v-card-title>
    <v-card-text>
      <v-list two-line>
        <draggable v-model="datasets">
          <template v-for="ds in datasets">
            <v-list-item :key="ds._id">
              <v-list-item-content>
                <v-list-item-title>
                  {{ ds.name }}
                  
                  <v-btn
                    class="oper"
                    icon
                    @click="rename_collection(ds.name, prompt('更名为：', ds.name))"
                  >
                    <v-icon>mdi-form-textbox</v-icon>
                  </v-btn>

                  <v-btn class="oper" icon @click="refresh_sources(ds._id)">
                    <v-icon>mdi-sync</v-icon>
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
            :arg="{ name: '名称', type: '', default: '' }"
            v-model="input_coll.name"
        /></v-col>
        <v-col>
          <ParamInput
            :arg="{ name: '数据库', type: '', default: '' }"
            v-model="input_coll.mongocollection"
        /></v-col>
      </v-row>
      <v-btn @click="save" color="primary">
        <v-icon>mdi-check</v-icon> 保存
      </v-btn>
    </v-card-text></v-card
  >
</template>

<script>
import ParamInput from "./ParamInput";
import draggable from 'vuedraggable'

import api from "../api";

export default {
  name: "DatasetList",
  components: {
    ParamInput,
    draggable
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
      api.get_datasets().then(x => this.datasets = x);
    },
    prompt(t, v) {
      return window.prompt(t, v);
    },
    update_valid(id, field, value) {
      var coll = { _id: id };
      coll[field] = value;
      api
        .call("datasets", { dataset: coll })
        .then(() => api.notify({ title: "更新成功" }));
    },
    save() {
      if (this.valid.length > 0) {
        alert("请更正填写错误的项");
        return;
      }
      api
        .call("datasets", {
          datasets: this.datasets.map((x, i) =>
            Object.assign({}, x, { order_weight: i, sources: null })
          ),
        })
        .then(() => api.notify({ title: "保存成功" }));
    },
    append_dataset() {
      if (!this.input_coll.name) return;
      this.datasets.push(this.input_coll);
      this.input_coll = {};
    },
    rename_collection(from, to) {
      if (from && to)
        api
          .call("datasets", { rename: { from, to } })
          .then(() => api.notify({ title: "重命名成功" }))
          .then(this.load_datasets);
    },
    refresh_sources(id) {
      api
        .call("datasets", { sources: { _id: id } })
        .then(() => api.notify({ title: "刷新完成" }));
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