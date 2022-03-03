<template>
  <v-card flat>
    <v-card-title>搜索</v-card-title>
    <v-card-text @drop.prevent="drop_json_file" @dragover.prevent>
      <v-row>
        <v-col>
          <v-text-field
            class="d-inline-block"
            :style="{ width: 'calc(100% - 200px)', 'min-width': '200px' }"
            dense
            v-model="q"
            @keyup.enter="search"
            label="搜索条件"
          ></v-text-field>
          <v-select
            class="d-inline-block ml-5"
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
          ></v-select>
          <v-text-field
            class="d-inline-block ml-5"
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
      <div class="mt-5">
        <ResultsView
          v-if="view_mode != 'gallery'"
          :class="view_mode == 'list' ? '' : 'hide-toolbar'"
          :page_size="page_size"
          @load="load_search"
          ref="results"
        />
        <Gallery
          v-else
          :q="q"
          :req="req"
          :sort="sort"
          :page_size="page_size"
          ref="gallery"
        />
      </div>
    </v-card-text>
  </v-card>
</template>
    
<script>
import api from "../api";
import ResultsView from "./ResultsView";
import Gallery from "../gallery/Gallery";

export default {
  name: "SearchForm",
  components: { ResultsView, Gallery },
  data() {
    return {
      datasets: [],
      selected_datasets: [],
      open_datasets: [],
      selected_mongocollections: [],
      q: "",
      sort: "",
      querystr: "",
      req: "",
      selection_bundles: {},
      external_json: null,
      view_mode: "list",
      page_size: 50,
      cancel_source: api.cancel_source()
    };
  },
  mounted() {
    const search_params = api.querystring_parse(location.search);
    for (var k of ["q", "sort"])
      if (search_params[k]) this[k] = search_params[k];

    let config = api.load_config("main");
    if (config.view_mode) this.view_mode = config.view_mode;
    if (config.page_size) this.page_size = +config.page_size;

    api.get_datasets_hierarchy().then((data) => {
      this.datasets = data.hierarchy;
      this.selection_bundles = data.bundles;
      this.selected_datasets =
        search_params.selected_datasets || config.selected_datasets || [];
      if (this.q) this.search();
    });
  },
  methods: {
    datasets_req() {
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
      }

      var selected = this.selected_datasets.map(
          (sid) => this.selection_bundles[sid]
        ),
        req = "";

      if (selected.length > 0) {
        var datasets = selected
            .filter((x) => !x.source)
            .map((x) => escapeRegExp(x.name)),
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
    _start() {
      if (this.view_mode != "gallery") this.$refs.results.start();
      else this.$refs.gallery.start();
    },
    search() {
      api.save_config("main", {
        page_size: this.page_size,
        view_mode: this.view_mode,
        selected_datasets: this.selected_datasets,
      });

      this.external_json = null;
      if (this.selected_datasets.length == 0)
        this.selected_datasets = this.datasets.map((s) => s.id);

      this.req = this.datasets_req();
      this._start();

      history.pushState(
        "",
        "",
        api.querystring_stringify(Object.assign(api.querystring_parse(location.search), {
          q: this.q,
          selected_datasets: this.selected_datasets,
          sort: this.sort,
          selected_mongocollections: this.selected_mongocollections,
        }))
      );
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
      this.cancel_source.cancel();
      api
        .call("search", {
          q: this.q,
          req: this.req,
          sort: this.sort,
          mongocollections: this.selected_mongocollections,
          offset: e.offset,
          limit: e.limit,
        }, undefined, this.cancel_source)
        .then((data) => {
          if (data.result.query) {
            var reg = new RegExp(
              "(" +
                data.result.query
                  .split(/[.,/#!$%^&*;:{}=\-_`"'~()|]/g)
                  .filter((x) => x)
                  .join("|") +
                ")",
              "ig"
            );
            this.results = data.result.results.map((x) => {
              x.matched_content = x.content.replace(reg, "<em>$1</em>");
              return x;
            });
          }
          this.querystr = data.result.query;
          if (this.querystr && !this.querystr.match(/^\(.*\)$/) && this.req)
            this.querystr = "(" + this.querystr + ")";
          e.callback({
            result: data.result.results,
            offset: e.offset,
            total: data.result.total,
          });
        });
    },
    export_query(format, callback) {
      if (typeof callback !== "function")
        callback = (data) =>
          this.$router.push("/tasks/" + data.result).catch(() => {});
      api
        .put("tasks/", {
          datasource_config: {
            query: "?" + this.querystr + this.req,
            mongocollections: this.selected_mongocollections,
          },
          name: "搜索 " + this.querystr,
          pipeline: [
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
</style>

<style>
.vue-treeselect__control {
  border-radius: 0;
}
.theme--dark .vue-treeselect {
  color: rgba(0, 0, 0, 0.7) !important;
}
.hide-toolbar div:not(.paragraph) > p,
.hide-toolbar hr,
.hide-toolbar .v-btn {
  display: none;
}
</style>