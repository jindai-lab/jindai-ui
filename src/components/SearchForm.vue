<template>
  <div>
    <h3>搜索</h3>
    <div class="mui-panel">
      <div id="selectors" class="mui-row">
        <div class="mui-select mui-col-md-4">
          <select
            name="collection"
            id="collection"
            v-model="selected_collection"
          >
            <option value="">(全部)</option>
            <option v-for="coll in collections" :value="coll.id" :key="coll.id">
              {{ coll.name }}
            </option>
          </select>
        </div>
        <div class="mui-select mui-col-md-6">
          <select name="pdffile" id="pdffile" v-model="selected_pdffile">
            <option value="">(全部)</option>
            <option v-for="pdffile in pdffiles" :value="pdffile" :key="pdffile">
              {{ pdffile }}
            </option>
          </select>
        </div>
        <div class="mui-select mui-col-md-2">
          <select name="sort" id="sort" v-model="sort">
            <option value="">默认</option>
            <option value="year">从旧到新</option>
            <option value="-year">从新到旧</option>
            <option value="pdffile,pdfpage">出处</option>
          </select>
        </div>
      </div>
      <div id="search">
        <div class="mui-textfield">
          <input type="text" v-model="q" />
        </div>
      </div>
      <div
        id="multiselect"
        class="mui-container-fluid"
        v-show="selected_collection == ''"
      >
        <span v-for="coll in collections" :key="coll.id" class="mui-checkbox">
          <label>
            <input
              type="checkbox"
              v-model="selected_collections"
              :value="coll.id"
            />
            {{ coll.name }}</label
          >
        </span>
      </div>
      <div class="clear"></div>
      <button id="search" class="mui-btn" @click="search">查询</button>
    </div>
    <div v-if="results.length > 0">
      <div>
        共找到 {{ results.length == 100 ? "100+" : results.length }} 个结果。
      </div>
      <div v-for="r in results" :key="r._id" class="mui-panel">
        <p class=""
          >数据集: {{ r.collection }} 大纲: {{ r.outline }} 来源: {{ r.pdffile }} 页码:
          {{ r.pagenum }} 年份: {{ r.year }}</p>
        <div class="mui-divider"></div>
        <br>
        <div v-html="r.matched_content"></div>
        <br>
        <button class="mui-btn" @click="$router.push('/view/' + r.pdffile + '/' + r.pdfpage)">
          <i class="fa fa-file" aria-hidden="true"></i> 查看
        </button>
      </div>
    </div>
    <div v-else>未找到匹配的结果。</div>
  </div>
</template>
    
<script>
import api from "../api";

export default {
  name: "SearchForm",
  components: {},
  data() {
    return {
      collections: [],
      results: [],
      pdffiles: [],
      selected_collection: "",
      selected_collections: [],
      selected_pdffile: "",
      q: "",
      sort: "",
      querystr: "",
    };
  },
  mounted() {
    api.call("meta").then((resp) => {
      this.collections = resp.data.result.collections.map((x) => {
        return { name: x[1], id: x[0] };
      });
    });
  },
  methods: {
    search() {
      var req = {};
      if (this.selected_pdffile) req.pdffile = this.selected_pdffile;
      if (this.selected_collection) req.collection = this.selected_collection;
      else if (this.selected_collections.length > 0)
        req.collection = {
          $in: this.selected_collections,
        };
      api.call("search", { q: this.q, sort: this.sort, req }).then((resp) => {
        var reg = new RegExp(
          "(" + resp.data.result.query.replace(/[,&]/, "|") + ")",
          "g"
        );
        this.results = resp.data.result.results.map((x) => {
          x.matched_content = x.content.replace(reg, "<em>$1</em>");
          return x;
        });
        this.querystr = resp.data.result.query;
      });
    },
  },
  watch: {
    selected_collection() {
      api
        .call("quicktask", {
          q:
            "??match(collection=`" +
            this.selected_collection +
            "`)=>group(_id=$pdffile)",
          raw: true,
        })
        .then((resp) => {
          this.pdffiles = resp.data.result.map((x) => x._id);
        });
    },
  },
};
</script>

<style scoped>
span.mui-checkbox {
  float: left;
  margin: 5px;
}

.clear {
  clear: both;
}
</style>