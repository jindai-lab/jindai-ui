<template>
  <div>
    <h3>搜索</h3>
    <div class="mui-panel">
      <div id="selectors" class="mui-row">
        <div class="mui-select mui-col-md-3">
          <select name="sort" id="sort" v-model="sort">
            <option value="">默认排序</option>
            <option value="pdate">从旧到新</option>
            <option value="-pdate">从新到旧</option>
            <option value="source=1">出处</option>
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
      <button class="mui-btn" @click="export_query">
        <font-awesome-icon icon="share" /> 导出为任务
      </button>
      <button class="mui-btn" @click="export_xlsx">
        <font-awesome-icon icon="download" /> 直接导出 Excel
      </button>
    </div>
    <ResultsView :total="total" @load="load_search" ref="results" />
  </div>
</template>
    
<script>
import api from "../api";
import ResultsView from "./ResultsView";

export default {
  name: "SearchForm",
  components: { ResultsView },
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
      total: 0,
    };
  },
  mounted() {
    api.call("collections").then((data) => {
      var hierarchy = {
        id: "ROOT",
        name: "",
        children: [],
      };
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
          var cand = parent_obj.children.filter((child) => child.id.match('"name":'+JSON.stringify(segs)))[0];
          if (typeof cand === "undefined") {
            cand = {
              id: JSON.stringify({
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
              id: JSON.stringify({
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
            .map((x) => x.source.split(":", 2).pop()),
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
          req.$or.push({
            "source.file": {
              $in: sourcefiles,
            },
          });
          reqstr_sourcefiles =
            "source.file=in([]=>`" + sourcefiles.join("`=>`") + "`))";
        }
        if (req.$or.length == 1) {
          req = req.$or[0];
          this.reqstr += "," + (reqstr_colls || reqstr_sourcefiles);
        } else {
          this.reqstr += ",(" + reqstr_colls + "|" + reqstr_sourcefiles + ")";
        }
      }
      this.req = req;
      this.$refs.results.start();
    },
    load_search(e) {
      if (!this.q) return;
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
              data.result.query.replace(/[,&]/g, "|").replace(/`/g, "") +
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
span.mui-checkbox {
  float: left;
  margin: 5px;
}

.clear {
  clear: both;
}
</style>