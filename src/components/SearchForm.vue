<template>
  <v-card flat>
    <v-card-title>搜索</v-card-title>
    <v-card-text @drop.prevent="drop_json_file" @dragover.prevent>
      <v-row>
        <v-col>
          <v-text-field
            class="d-inline-block selector"
            :style="{ width: 'calc(100% - 200px)', 'min-width': '200px' }"
            dense
            v-model="q"
            @keyup.enter="search"
            label="搜索条件"
          ></v-text-field>
          <v-combobox
            class="d-inline-block ml-5 selector"
            v-model="sort"
            label="排序"
            dense
            :style="{ width: '100px' }"
            :items="[
              { text: '默认排序', value: '' },
              { text: '从旧到新', value: 'pdate' },
              { text: '从新到旧', value: '-pdate' },
              { text: '出处', value: 'source' },
              { text: '随机', value: 'random' },
            ]"
          ></v-combobox>
          <v-text-field
            class="d-inline-block ml-5 selector"
            label="每页数量"
            v-model="page_size"
            type="number"
            dense
            :style="{ width: '50px' }"
            >50</v-text-field
          >
        </v-col>
      </v-row>
      <v-row style="margin-top: -24px">
        <v-col>
          <treeselect
            :multiple="true"
            :options="datasets"
            v-model="selected_datasets"
            placeholder="数据集"
          />
        </v-col>
      </v-row>
      <v-row class="ml-0 mb-3">
        <v-btn @click="search" color="primary">查询</v-btn>
        <span class="ml-5" style="line-height: 100%; vertical-align: middle">
          分组
          <v-combobox
            class="d-inline-block ml-1"
            style="width: 80px"
            dense
            flat
            :items="[
              {text: '无', value: 'none'},
              {text: '按组', value: 'group'},
              {text: '按来源', value: 'source'},
              {text: '按作者', value: 'author'}
            ]"
            v-model="groups"
          />
        </span>
        <v-spacer></v-spacer>
        <div class="tools">
          <v-btn @click="export_query">
            <v-icon>mdi-clipboard-outline</v-icon> 导出为任务
          </v-btn>
          <v-btn @click="export_file('xlsx')">
            <v-icon>mdi-file-excel</v-icon> 导出 Excel
          </v-btn>
          <v-btn @click="export_file('json')">
            <v-icon>mdi-download</v-icon> 导出 JSON
          </v-btn>
          <v-btn-toggle
            v-model="view_mode"
            mandatory
            class="view-mode-toggler"
            dense
          >
            <v-btn value="list">
              <v-icon>mdi-view-list</v-icon>
            </v-btn>
            <v-btn value="page">
              <v-icon>mdi-text-long</v-icon>
            </v-btn>
            <v-btn value="gallery">
              <v-icon>mdi-view-module</v-icon>
            </v-btn>
          </v-btn-toggle>
        </div>
      </v-row>
      <ResultsView
        class="mt-5"
        :view_mode="view_mode"
        :page_size="page_size"
        @load="load_search"
        ref="results"
      />
    </v-card-text>
  </v-card>
</template>
    
<script>
import api from "../api";
import ResultsView from "./ResultsView";

export default {
  name: "SearchForm",
  components: { ResultsView, },
  data() {
    return {
      datasets: [],
      selected_datasets: [],
      open_datasets: [],
      selected_mongocollections: [],
      q: "",
      groups: "none",
      sort: "",
      querystr: "",
      req: "",
      selection_bundles: {},
      external_json: null,
      view_mode: "list",
      page_size: 50,
      cancel_source: api.cancel_source(),
    };
  },
  mounted() {
    let config = api.load_config("main");
    if (config.view_mode) this.view_mode = config.view_mode;
    if (config.page_size) this.page_size = +config.page_size;
    if (config.sort) this.sort = config.sort;

    const search_params = api.querystring_parse(location.search);
    for (var k of ["q", "sort", "groups"])
      if (search_params[k]) this[k] = search_params[k];

    api.get_datasets_hierarchy().then((data) => {
      this.datasets = data.hierarchy;
      this.selection_bundles = data.bundles;
      this.selected_datasets =
        search_params.selected_datasets || config.selected_datasets || [];
      if (this.q) this.search(true);
    });
  },
  watch: {
    view_mode() {
      this._save_config();
    },
  },
  methods: {
    datasets_req() {
      var selected = this.selected_datasets.map(
          (sid) => this.selection_bundles[sid]
        ),
        req = "";

      if (selected.length > 0) {
        var datasets = selected
            .filter((x) => !x.source)
            .map((x) => api.escape_regex(x.name)),
          sourcefiles = selected
            .filter((x) => x.source)
            .map((x) => ({
              file: x.source.split(":", 2).pop(),
              dataset: x.name,
            })),
          req_datasets = "",
          req_sourcefiles = "";
        this.selected_mongocollections = Array.from(
          new Set(selected.map((x) => x.mongocollection))
        );

        if (datasets.length > 0) {
          req_datasets = "dataset%`^" + datasets.join("|^") + "`";
        }
        if (sourcefiles.length > 0) {
          req_sourcefiles = sourcefiles
            .map((sf) => `(dataset='${sf.dataset}',source.file='${sf.file}')`)
            .join("|");
        }
        req =
          "(" +
          [req_datasets, req_sourcefiles]
            .filter((x) => x.length > 0)
            .join("|") +
          ")";
      }

      return req;
    },
    _save_config() {
      api.save_config("main", {
        page_size: this.page_size,
        view_mode: this.view_mode,
        sort: this.sort == "random" ? "" : this.sort,
        selected_datasets: this.selected_datasets,
      });
    },
    search(pagenum_preserve) {
      this._save_config();
      this.external_json = null;

      if (this.selected_datasets.length == 0)
        this.selected_datasets = this.datasets.map((s) => s.id);

      this.req = this.datasets_req();

      if (pagenum_preserve !== true)
        history.pushState(
          "",
          "",
          api.querystring_stringify(
            Object.assign(api.querystring_parse(location.search), {
              q: this.q,
              selected_datasets: this.selected_datasets,
              sort: this.sort,
              groups: this.groups,
              selected_mongocollections: this.selected_mongocollections,
            })
          )
        );

      this.$refs.results.start(pagenum_preserve === true ? undefined : 1);
    },
    load_search(e) {
      if (this.external_json) {
        e.callback({
          result: this.external_json.result.results.slice(
            e.offset,
            e.offset + e.limit
          ),
          offset: e.offset,
          total: this.external_json.result.total,
        });
        return;
      }
      if (!this.q && !this.req) return;

      if (this.cancel_source) this.cancel_source.cancel();

      this.cancel_source = api.cancel_source();

      var params = {
        q: this.q,
        req: this.req,
        sort: typeof this.sort === "object" ? this.sort.value : this.sort,
        mongocollections: this.selected_mongocollections,
        offset: e.offset,
        limit: e.limit,
        groups: typeof this.groups === "object" ? this.groups.value : this.groups,
      };

      var token = new Date().getTime() + Math.random();

      api.call("search", params, this.cancel_source).then((data) => {
        if (!data) {
          console.log("WARNING: no data returned.");
          return;
        }
        if (data.result.query) {
          var reg = new RegExp(
            "(" +
              [... data.result.query.matchAll(/"(.*?)"/g)]
                .map(element =>
                  element[1].split(/[.,:=\-+()?*%#!@^&|`'"]/g)
                )
                .reduce((previous, current) => previous.concat(current), [])
                .filter((x) => x)
                .join("|") +
              ")",
            "ig"
          );
          this.results = data.result.results.map((x) => {
            x.matched_content = (x.content || '').replace(reg, "<em>$1</em>");
            return x;
          });
        }
        this.querystr = data.result.query;
        e.callback({
          token,
          result: data.result.results,
          offset: e.offset,
        });
      });

      api
        .call(
          "search",
          Object.assign({ count: true }, params, this.cancel_source)
        )
        .then((data) => {
          if (data.result) e.callback({ token, total: data.result });
        });
    },
    export_query(format, callback) {
      if (typeof callback !== "function")
        callback = (data) =>
          this.$router.push("/tasks/" + data.result).catch(() => {});
      api
        .put("tasks/", {
          name: "搜索 " + this.querystr,
          pipeline: [
            [
              "DBQueryDataSource",
              {
                query: this.querystr,
                mongocollections: this.selected_mongocollections,
              },
            ],
            ["AccumulateParagraphs", {}],
            ["Export", { format }],
          ],
        })
        .then(callback);
    },
    export_file(fmt) {
      this.export_query(fmt, (data) => {
        api.put("queue/", { id: data.result }).then(() =>
          api.notify({
            title: "已加入到任务队列",
            text: "请注意查看处理结果",
          })
        );
      });
    },
    drop_json_file(e) {
      let droppedFiles = Array.from(e.dataTransfer.files).filter((x) =>
        x.name.match(/\.json$/)
      );
      if (!droppedFiles.length) return;
      let file = droppedFiles[0];
      let reader = new FileReader();
      reader.onload = (f) => {
        this.external_json = JSON.parse(f.target.result);
        this.$refs.results.start();
      };
      reader.readAsText(file);
    },
  },
};
</script>

<style scoped>
.clear {
  clear: both;
}

.tools > .v-btn {
  margin-right: 12px;
}

.tools {
  padding-right: 12px;
}

.view-mode-toggler {
  vertical-align: middle;
}

.vue-treeselect__control {
  border-radius: 0;
}
.theme--dark .vue-treeselect {
  color: rgba(0, 0, 0, 0.7) !important;
}

.selector {
  vertical-align: bottom;
}
</style>