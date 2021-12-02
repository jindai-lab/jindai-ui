<template>
  <v-card flat>
    <v-card-title>数据集</v-card-title>
    <v-card-text>
    <v-row v-for="(ds, index) in collections" :key="ds._id">
      <v-col cols="2" class="opers">
        <v-btn icon @click="move(index, -1)" :disabled="index == 0" >
          <v-icon>mdi-arrow-up</v-icon>
        </v-btn>
        <v-btn icon
          @click="move(index, 1)"
          :disabled="index == collections.length - 1"
          
        >
          <v-icon>mdi-arrow-down</v-icon>
        </v-btn>
        <v-btn icon @click="refresh_sources(ds._id)">
          <v-icon>mdi-sync</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        {{ ds.name }}
        <v-btn icon @click="rename_collection(ds.name, prompt('更名为：'))">
          <v-icon>mdi-edit</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        {{ ds.mongocollection }}
      </v-col>
    </v-row>
    <v-row>
      <v-col class="opers" cols="2">
        <v-btn icon @click="append_dataset" >
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
    </v-card-text></v-card>
</template>

<script>
import ParamInput from "./ParamInput";
import api from "../api";

export default {
  name: "CollectionList",
  components: {
    ParamInput,
  },
  data() {
    return {
      collections: [],
      input_coll: {},
      valid: [],
    };
  },
  mounted() {
    this.load_collections()
  },
  methods: {
    load_collections() {      
      api.call("collections").then((data) => {
        this.collections = data.result.sort((x, y) =>
          x.order_weight === y.order_weight
            ? x.name.localeCompare(y.name)
            : Math.sign(x.order_weight - y.order_weight)
        );
      });
    },
    prompt(t) { return window.prompt(t) 
    },
    update_valid(id, field, value) {
      var coll = { _id: id };
      coll[field] = value;
      api
        .call("collections", { collection: coll })
        .then(() => api.notify({ title: "更新成功" }));
    },
    save() {
      if (this.valid.length > 0) {
        alert("请更正填写错误的项");
        return;
      }
      api
        .call("collections", {
          collections: this.collections.map((x, i) =>
            Object.assign({}, x, { order_weight: i, sources: null })
          ),
        })
        .then(() => api.notify({ title: "保存成功" }));
    },
    move(index, inc) {
      function __prefixing(s, prefix) {
        return s === prefix || s.startsWith(prefix + "--");
      }
      var c = this.collections[index];
      var suba = this.collections.filter(
        (x, i) => i >= index && __prefixing(x.name, c.name)
      );
      this.collections = this.collections.filter(
        (x, i) => i < index || !__prefixing(x.name, c.name)
      );
      this.collections.splice(index + inc, 0, ...suba);
    },
    append_dataset() {
      if (!this.input_coll.name) return;
      this.collections.push(this.input_coll);
      this.input_coll = {};
    },
    rename_collection(from, to) {
      if (from && to)
        api.call("collections", { rename: {from, to} })
          .then(() => api.notify({ title: "重命名成功" }))
          .then(this.load_collections);
    },
    refresh_sources(id) {
      api.call("collections", { sources: { _id : id } })
        .then(() => api.notify({ title: "刷新完成" }));
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