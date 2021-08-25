<template>
  <div>
    <h3>默认数据集顺序</h3>
    <button @click="refresh_collections" class="mui-btn">
      <font-awesome-icon icon="refresh" />刷新
    </button>

    <ParamInput
      ref="editor"
      class="mui-textfield"
      :arg="{ name: 'JSON', type: 'js' }"
      v-model="collections_json"
    />

    <hr />
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
      collections_json: "",
      datasets: [],
      input_ds_name: "",
      input_ds_id: "",
      valid: [],
    };
  },
  mounted() {
    api.call("meta").then((data) => {
      this.collections_json = JSON.stringify(data.result.collections, "", 2);
      this.datasets = data.result.datasets;
      this.$refs.editor.refresh(this.collections_json);
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
      var collections = {};
      try {
        collections = JSON.parse(this.collections_json);
      } catch {
        alert("无法解析JSON数据");
        return;
      }
      api.call("meta", { collections, datasets: this.datasets });
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
          query:
            "??group(_id=(collection=$collection,pdffile=$pdffile))=>group(_id=$_id.collection,content=push($_id.pdffile))=>addFields(collection=$_id)",
        })
        .then((data) => {
          console.log(data);
          data = data.result;
          var colls = {};
          for (var cpdf of data) {
            var cobj = colls;
            for (var ckey of cpdf.collection.split("--")) {
              if (typeof cobj[ckey] === "undefined") cobj[ckey] = {};
              cobj = cobj[ckey];
            }
            cobj.content = cpdf.content.sort().map((x) => "pdffile:" + x);
          }

          function expand_to_array(obj, arr) {
            for (var k in obj) {
              if (typeof k !== "string" || k === 'content') continue;
              var v = obj[k];
              arr.push([k, v.content || []]);
              expand_to_array(v, arr[arr.length - 1][1]);
            }
          }

          var collarr = [];
          expand_to_array(colls, collarr);
          this.collections_json = JSON.stringify(collarr, "", 2);
          this.$refs.editor.refresh(this.collections_json);
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