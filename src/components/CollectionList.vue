<template>
  <div>
    <h3>默认数据集</h3>
    <button class="mui-btn" @click="refresh_collections">
      <font-awesome-icon icon="sync"></font-awesome-icon>
      更新
    </button>
    <h3>其他数据集</h3>
    <div v-for="(ds, index) in datasets" :key="ds[0]" class="mui-row">
      <div class="opers mui-col-md-2">
        <button
          @click="move(datasets, index, -1)"
          :disabled="index == 0"
          class="mui-btn"
        >
          <font-awesome-icon icon="arrow-up" />
        </button>
        <button
          @click="move(datasets, index, 1)"
          :disabled="index == datasets.length - 1"
          class="mui-btn"
        >
          <font-awesome-icon icon="arrow-down" />
        </button>
      </div>
      <label class="mui-col-md-2">{{ ds[0] }}</label>
      <ParamInput
        class="mui-col-md-8"
        :arg="{ name: '名称', type: '' }"
        v-model="ds[1]"
        @validation="update_valid(ds[0], $event)"
      />
    </div>
    <div class="mui-row">
      <div class="opers mui-col-md-2">
        <button @click="append_dataset" class="mui-btn">
          <font-awesome-icon icon="plus" />
        </button>
      </div>
      <ParamInput
        class="mui-col-md-4"
        :arg="{ name: '代码ID', type: '', default: '' }"
        v-model="input_ds_id"
        @validation="update_valid(input_ds_id, $event)"
      />
      <ParamInput
        class="mui-col-md-4"
        :arg="{ name: '名称', type: '', default: '' }"
        v-model="input_ds_name"
        @validation="update_valid(input_ds_name, $event)"
      />
    </div>
    <button @click="save" class="mui-btn mui-btn--primary">
      <font-awesome-icon icon="check" /> 保存
    </button>
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
      datasets: [],
      input_ds_name: "",
      input_ds_id: "",
      valid: [],
    };
  },
  mounted() {
    api.call("meta").then((data) => {
      this.datasets = data.result.datasets;
    });
  },
  methods: {
    update_valid(name, val) {
      this.valid = this.valid.filter((x) => x != name);
      if (!val) this.valid.push(name);
    },
    save() {
      if (this.valid.length > 0) {
        alert("请更正填写错误的项");
        return;
      }
      api.call("meta", { datasets: this.datasets });
      api.notify({ title: "保存成功" });
    },
    move(arr, index, inc) {
      var c = arr[index];
      arr.splice(index, 1);
      arr.splice(index + inc, 0, c);
    },
    append_dataset() {
      if (!this.input_ds_name.length || !this.input_ds_id.length) return;
      this.datasets.push([this.input_ds_id, this.input_ds_name]);
      this.input_ds_id = "";
      this.input_ds_name = "";
    },
    refresh_collections() {
      api
        .call("quicktask", {
          query: "??group(_id=$collection,pdfs=addToSet($pdffile))",
          raw: true,
        })
        .then((data) => {
          var hierarchy = {
            id: "ROOT",
            name: "",
            children: [],
          };
          data = data.result
            .map((x) => {
              x.name = x._id;
              x.segments = x.name.split("--");
              x.level = x.segments.length;
              return x;
            })
            .sort((x, y) => x.name.localeCompare(y.name));
          for (var x of data) {
            var parent_obj = hierarchy;
            for (
              var i = 0, segs = x.segments[0];
              i < x.level;
              i++, segs += "--" + x.segments[i]
            ) {
              var cand = parent_obj.children.filter(
                (child) => child.id == segs
              )[0];
              if (typeof cand === "undefined") {
                cand = {
                  id: segs,
                  label: x.segments[i],
                  children: [],
                };
                parent_obj.children.push(cand);
              }
              parent_obj = cand;
            }
            parent_obj.children = parent_obj.children.concat(x.pdfs.sort().map(x => {return {
              id: 'pdffile:' + x,
              label: x.match(/(.*\/)?(.*)/)[2]
            }}));
          }
          api
            .call("meta", { collections: hierarchy.children })
            .then(() => api.notify({ title: "保存成功" }));
        });
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
</style>