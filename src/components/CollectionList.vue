<template>
  <div>
    <h3>数据集</h3>
    <div v-for="(ds, index) in collections" :key="ds._id" class="mui-row">
      <div class="opers mui-col-md-2">
        <v-btn @click="move(index, -1)" :disabled="index == 0" >
          <v-icon>mdi-arrow-up</v-icon>
        </v-btn>
        <v-btn
          @click="move(index, 1)"
          :disabled="index == collections.length - 1"
          
        >
          <v-icon>mdi-arrow-down</v-icon>
        </v-btn>
        <v-btn  @click="refresh_sources(ds._id)">
          <v-icon>mdi-sync</v-icon>
        </v-btn>
      </div>
      <div class="mui-col-md-4">
        {{ ds.name }}
        <v-btn  @click="rename_collection(ds.name, prompt('更名为：'))">
          <v-icon>mdi-edit</v-icon>
        </v-btn>
      </div>
      <div class="mui-col-md-4">
        {{ ds.mongocollection }}
      </div>
    </div>
    <div class="mui-row">
      <div class="opers mui-col-md-2">
        <v-btn @click="append_dataset" >
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </div>
      <ParamInput
        class="mui-col-md-4"
        :arg="{ name: '名称', type: '', default: '' }"
        v-model="input_coll.name"
      />
      <ParamInput
        class="mui-col-md-4"
        :arg="{ name: '数据库', type: '', default: '' }"
        v-model="input_coll.mongocollection"
      />
    </div>
    <v-btn @click="save" class="mui-btn mui-btn--primary">
      <v-icon>mdi-check</v-icon> 保存
    </v-btn>
  </div>
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