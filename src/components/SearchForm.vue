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
      pdffiles: [],
      selected_collection: "",
      selected_collections: [],
      selected_pdffile: "",
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
      this.collections = data.result.collections.map((x) => {
        return { name: x[1], id: x[0] };
      });
    });
  },
  methods: {
    search() {
      var req = {};
      this.reqstr = ''
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
      this.req = req
      this.$refs.results.start()
    },
    load_search(e) {
      api.call('search', { q: this.q, sort: this.sort, req: this.req, offset: e.offset, limit: e.limit }).then(data => {
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
            query: '?' + this.querystr + this.reqstr
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
          this.pdffiles.sort((a, b) => {
            const rd = /\d+|[零一二三四五六七八九十百]+/
            var num_a = a.match(rd) || ['999'], num_b = b.match(rd) || ['999']

            function chndigit(v) {
              var digits = '零一二三四五六七八九十'
              var r = 0, n = 0
              for (var c of v + '零') {
                var t = digits.indexOf(c)
                if (t < 0) {
                  n *= (({'百': 100, '千': 1000, '万': 10000})[c] || 1)
                } else if (t == 10 && n != 0) {
                  n *= 10
                } else {
                  r += n
                  n = t
                }
              }
              return r
            }

            if (num_a[0].match(/\d+/))
              return (num_a | 0) - (num_b | 0)
            else
              return chndigit(num_a) - chndigit(num_b)
          })
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