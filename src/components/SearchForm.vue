<template>
  <div>
    <h3>搜索</h3>
    <div class="mui-panel">
      <div id="selectors" class="mui-row">
        <div class="mui-select mui-col-md-4">
          <select
            name="collection"
            id="collection"
            v-model="selected_dataset"
          >
            <option value="">默认</option>
            <option v-for="ds in datasets" :value="ds.id" :key="ds.id">
              {{ ds.name }}
            </option>
          </select>
        </div>
        <div class="mui-select mui-col-md-2">
          <select name="sort" id="sort" v-model="sort">
            <option value="">默认排序</option>
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
        v-show="selected_dataset == ''"
      >
       <treeselect
        :multiple="true"
        :options="collections"
        v-model="selected_collections"
        />
      </div>
      <div class="clear"></div>
      <button id="search" class="mui-btn" @click="search">查询</button>
    </div>
    <div v-if="total">
      共找到 {{ total }} 个结果。
      <button class="mui-btn" @click="export_query"><font-awesome-icon icon="share" /> 导出为任务</button>
      <button class="mui-btn" @click="export_xlsx"><font-awesome-icon icon="download" /> 直接导出 Excel</button>
    </div>
    <ResultsView :total="total" @load="load_search" ref="results" />
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
      datasets: [],
      selected_dataset: "",
      selected_collections: [],
      q: "",
      req: {},
      sort: "",
      querystr: "",
      reqstr: "",
      total: 0
    };
  },
  mounted() {
    api.call("meta").then((data) => {
      function expand_collection(x, last) {
        if (Array.isArray(x) && x.length == 2 && typeof x[0] === 'string' && Array.isArray(x[1])) 
          return {
            label: x[0],
            id: last + x[0],
            children: x[1].map(y => expand_collection(y, last + x[0] + '--'))
          }
        else
          return { label: x.split('pdffile:')[1].split('/').slice(-1)[0], id: x }
      }
      this.collections = data.result.collections.map(x => expand_collection(x, ''));
      console.log(this.collections)
      this.datasets = data.result.datasets.map((x) => {
        return { name: x[1], id: x[0] };
      })
    });
  },
  methods: {
    search() {
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
      }
      var req = {};
      this.reqstr = ''
      if (this.selected_collections.length > 0) {
        req = {'$or': []}
        var colls = this.selected_collections.filter(x => !x.startsWith('pdffile:')).map(escapeRegExp), 
            pdffiles = this.selected_collections.filter(x => x.startsWith('pdffile:')).map(x => x.split(':', 2)[1]),
            reqstr_colls = '', reqstr_pdffiles = ''
        
        if (colls.length > 0) {
          req.$or.push({collection: {
            $regex: '^' + colls.join('|^'),
          }})
          reqstr_colls = 'collection%`^' + colls.join('|^') + '`))'
        }
        if (pdffiles.length > 0) {
          req.$or.push({
            pdffile: {
              $in: pdffiles
            }
          })
          reqstr_pdffiles = 'pdffile=in([]=>`' + pdffiles.join('`=>`') + '`))'
        }
        if (req.$or.length == 1) {
          req = req.$or[0]
          this.reqstr += ',' + (reqstr_colls || reqstr_pdffiles)
        } else {
          this.reqstr += ',(' + reqstr_colls + '|' + reqstr_pdffiles + ')'
        }
      }
      this.req = req
      this.$refs.results.start()
    },
    load_search(e) {
      api.call('search', { q: this.q, sort: this.sort, req: this.req, dataset: this.selected_dataset, offset: e.offset, limit: e.limit }).then(data => {
        var reg = new RegExp(
          "(" + data.result.query.replace(/[,&]/g, "|").replace(/`/g, "") + ")",
          "ig"
        );
        this.results = data.result.results.map((x) => {
          x.matched_content = x.content.replace(reg, "<em>$1</em>");
          return x;
        });
        this.total = data.result.total;
        this.querystr = data.result.query;
        e.callback({result: data.result.results, offset: e.offset})
      })
    },
    export_query(callback) {
      if (typeof(callback) !== 'function') 
        callback = (data) => this.$router.push("/tasks/" + data.result)
      api
        .put("tasks/", {
          datasource_config: {
            query: '?' + this.querystr + this.reqstr,
            mongocollection: this.selected_dataset
          },
          name: '搜索 ' + this.querystr,
          pipeline: [
            ['AccumulateParagraphs', {}],
            ['Export', {format: 'xlsx'}]
          ]
        })
        .then(callback);
    },
    export_xlsx() {
      this.export_query(data => {
        api.put('queue/', {id: data.result}).then(() => 
        api.notify({title: '已加入到任务队列', text: '请注意查看处理结果'})
        )
      })
    }
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