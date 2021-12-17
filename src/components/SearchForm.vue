<template>
    <v-card flat>
      <v-card-title>搜索</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="3">
            <v-select v-model="sort" label="排序" dense :items="[
              {text: '默认排序', value: ''},
              {text: '从旧到新', value: 'pdate'},
              {text: '从新到旧', value: '-pdate'},
              {text: '出处', value: 'source=1'},
            ]"></v-select>
          </v-col>
          <v-spacer></v-spacer>
        </v-row>
        <v-row>
          <v-col>
          <v-text-field v-model="q" @keyup.enter="search" label="搜索条件"></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
          <treeselect
            :multiple="true"
            :options="collections"
            v-model="selected_collections"
            placeholder="数据集"
          />
          </v-col>
        </v-row>
        <v-row class="ml-1 mb-3">
          <v-btn @click="search" color="primary">查询</v-btn>
        </v-row>
    <v-spacer></v-spacer>
    <v-card flat>
      <v-card-title v-show="total">
      共找到 {{ total }} 个结果。
      <v-btn  @click="export_query">
        <v-icon>mdi-share</v-icon> 导出为任务
      </v-btn>
      <v-btn  @click="export_xlsx">
        <v-icon>mdi-download</v-icon> 直接导出 Excel
      </v-btn>
      </v-card-title>
      <v-card-text>
        <ResultsView :page_size="50" :total="total" @load="load_search" ref="results" />        
      </v-card-text>
    </v-card>    </v-card-text>
    </v-card>
</template>
    
<script>
import api from "../api";
import ResultsView from "./ResultsView";
import Treeselect from '@riophae/vue-treeselect'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'

export default {
  name: "SearchForm",
  components: { ResultsView, Treeselect },
  data() {
    return {
      collections: [],
      datasets: [],
      selected_dataset: "",
      selected_collections: [],
      open_collections: [],
      q: "",
      req: {},
      sort: "",
      querystr: "",
      reqstr: "",
      total: 0,
    };
  },
  mounted() {
    if (location.search) {
      const search_params = api.querystring_parse(location.search)
      Object.assign(this, search_params)
    }
    api.call("collections").then((data) => {
      var hierarchy = {
        id: "ROOT",
        name: "",
        children: [],
      };
      const _stringify = JSON.stringify
      data = data.result
        .map((x) => {
          x.segments = x.name.split("--");
          x.level = x.segments.length;
          return x;
        })
        .sort((x, y) => x.order_weight === y.order_weight ? x.name.localeCompare(y.name) : Math.sign(x.order_weight - y.order_weight));
      for (var x of data) {
        var parent_obj = hierarchy;
        for (
          var i = 0, segs = x.segments[0];
          i < x.level;
          i++, segs += "--" + x.segments[i]
        ) {
          var cand = parent_obj.children.filter((child) => child.id.match('"name":'+_stringify(segs)))[0];
          if (typeof cand === "undefined") {
            cand = {
              id: _stringify({
                name: segs,
                mongocollection: x.mongocollection,
              }),
              label: x.segments[i],
              children: [],
            };
            parent_obj.children.push(cand);
          }
          parent_obj = cand;
        }
        parent_obj.children = parent_obj.children.concat(
          x.sources.sort().map((y) => {
            return {
              id: _stringify({
                name: x.name,
                mongocollection: x.mongocollection,
                source: y
              }),
              label: y.match(/(.*\/)?(.*)/)[2],
            };
          })
        );
      }
      this.collections = hierarchy.children;
    });
    if (this.q) this.search()
  },
  methods: {
    search() {
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
      }
      var req = {}, selected = this.selected_collections.map(JSON.parse);
      this.reqstr = "";
      if (selected.length > 0) {
        req = { $or: [] };
        var colls = selected
            .filter((x) => !x.source)
            .map(x => escapeRegExp(x.name)),
          sourcefiles = selected
            .filter((x) => x.source)
            .map((x) => ({file: x.source.split(":", 2).pop(), collection: x.name})),
          reqstr_colls = "",
          reqstr_sourcefiles = "";
        var selected_datasets = new Set(selected.map(x => x.mongocollection))
        if (selected_datasets.size > 1) {
          api.notify({
            title: '您选择的数据集存在跨数据库搜索情况，请重新选择',
            type: 'warn'
          })
          return
        }
        this.selected_dataset = Array.from(selected_datasets)[0]

        if (colls.length > 0) {
          req.$or.push({
            collection: {
              $regex: "^" + colls.join("|^"),
            },
          });
          reqstr_colls = "collection%`^" + colls.join("|^") + "`";
        }
        if (sourcefiles.length > 0) {
          req.$or.push(... sourcefiles.map(sf => ({
            "collection": sf.collection,
            "source.file": sf.file
          })));
          reqstr_sourcefiles =
            sourcefiles.map(sf => `(collection='${sf.collection}',source.file='${sf.file}')`).join('|')
        }
        if (req.$or.length == 1) {
          req = req.$or[0];
        }
        this.reqstr = "(" + [reqstr_colls, reqstr_sourcefiles].filter(x => x.length > 0).join('|') + ")"
      }
      this.req = req;
      this.$refs.results.start();
    },
    load_search(e) {
      if (!this.q && !this.req) return
      api
        .call("search", {
          q: this.q,
          sort: this.sort,
          req: this.req,
          dataset: this.selected_dataset,
          offset: e.offset,
          limit: e.limit,
        })
        .then((data) => {
          var reg = new RegExp(
            "(" +
              data.result.query.split(/[.,/#!$%^&*;:{}=\-_`"'~()|]/g).filter(x => x).join('|') +
              ")",
            "ig"
          );
          this.results = data.result.results.map((x) => {
            x.matched_content = x.content.replace(reg, "<em>$1</em>");
            return x;
          });
          this.total = data.result.total;
          this.querystr = data.result.query;
          e.callback({ result: data.result.results, offset: e.offset });
          history.pushState('', '', '?' + api.querystring_stringify({
            q: [this.querystr, this.reqstr].filter(x => x !== '').join(','), 
            sort: this.sort,
            selected_dataset: this.selected_dataset
          }))
        });
    },
    export_query(callback) {
      if (typeof callback !== "function")
        callback = (data) =>
          this.$router.push("/tasks/" + data.result).catch(() => {});
      api
        .put("tasks/", {
          datasource_config: {
            query: "?" + this.querystr + this.reqstr,
            mongocollection: this.selected_dataset,
          },
          name: "搜索 " + this.querystr,
          pipeline: [
            ["AccumulateParagraphs", {}],
            ["Export", { format: "xlsx" }],
          ],
        })
        .then(callback);
    },
    export_xlsx() {
      this.export_query((data) => {
        api.put("queue/", { id: data.result }).then(() =>
          api.notify({
            title: "已加入到任务队列",
            text: "请注意查看处理结果",
          })
        );
      });
    },
  },
};
</script>

<style scoped>
.clear {
  clear: both;
}

.v-btn {
  margin-right: 12px;
}
</style>

<style>
.vue-treeselect__control {
  border-radius: 0;
}
</style>