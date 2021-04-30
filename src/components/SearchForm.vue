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
          <input type="text" v-model="q" @keyup.enter="search" />
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
    <div v-if="results.length">
      共找到 {{ results.length == 100 ? results.length + '+' : results.length }} 个结果。
      <button class="mui-btn" @click="export_query"><i class="fa fa-share"></i> 导出为任务</button>
    </div>
    <ResultsView :value="results" />
  </div>
</template>
    
<script>
import api from "../api";
import ResultsView from "./ResultsView"

export default {
  name: "SearchForm",
  components: {ResultsView},
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
      reqstr: ""
    };
  },
  mounted() {
    api.call("meta").then((data) => {
      this.collections = data.result.collections.map((x) => {
        return { name: x[1], id: x[0] };
      });
    });
  },
  methods: {
    search() {
      var req = {};
      if (this.selected_pdffile) {
        req.pdffile = this.selected_pdffile;
        this.reqstr += ',pdffile=`' + this.selected_pdffile + '`'
      }
      if (this.selected_collection) {
        req.collection = this.selected_collection;
        this.reqstr += ',collection=`' + this.selected_collection + '`'
      }
      else if (this.selected_collections.length > 0) {
        req.collection = {
          $in: this.selected_collections,
        };
        this.reqstr += ',collection=in(_json(`' + JSON.stringify(this.selected_collections) + '`))'
      }
      api.call("search", { q: this.q, sort: this.sort, req }).then((data) => {
        var reg = new RegExp(
          "(" + data.result.query.replace(/[,&]/, "|") + ")",
          "g"
        );
        this.results = data.result.results.map((x) => {
          x.matched_content = x.content.replace(reg, "<em>$1</em>");
          return x;
        });
        this.querystr = data.result.query;
      });
    },
    export_query() {
      api
        .put("tasks/", {
          datasource_config: {
            query: this.querystr + this.reqstr
          },
          name: '搜索 ' + this.querystr
        })
        .then((data) => this.$router.push("/tasks/" + data.result));
    }
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
        .then((data) => {
          this.pdffiles = data.result.map((x) => x._id);
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