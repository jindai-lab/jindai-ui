<template>
  <v-card flat>
    <v-card-title>{{ $t("search") }}</v-card-title>
    <v-card-text @drop.prevent="drop_json_file" @dragover.prevent>
      <v-row>
        <v-col>
          <v-text-field
            class="d-inline-block selector"
            :style="{ width: 'calc(100% - 120px)', 'min-width': '200px' }"
            dense
            v-model="q"
            @keyup.enter="search"
            :label="$t('query')"
          ></v-text-field>
          <v-combobox
            class="d-inline-block ml-5 selector"
            v-model="sort"
            :label="$t('sort')"
            dense
            :style="{ width: '100px' }"
            :items="[
              { text: $t('default'), value: '' },
              { text: $t('pdate'), value: 'pdate' },
              { text: $t('pdate-rev'), value: '-pdate' },
              { text: $t('source'), value: 'source' },
              { text: $t('random'), value: 'random' },
            ]"
          ></v-combobox>
        </v-col>
      </v-row>
      <v-row style="margin-top: -24px">
        <v-col>
          <treeselect
            :multiple="true"
            :options="datasets"
            v-model="selected_datasets"
            :placeholder="$t('dataset')"
          />
        </v-col>
      </v-row>
      <v-row class="ml-0 mb-3">
        <v-btn @click="search" color="primary">{{ $t("search") }}</v-btn>
        <span class="ml-5" style="line-height: 100%; vertical-align: middle">
          {{ $t("grouping") }}
          <v-combobox
            class="d-inline-block ml-1"
            style="width: 80px"
            dense
            flat
            :items="[
              { text: $t('none'), value: 'none' },
              { text: $t('group'), value: 'group' },
              { text: $t('source'), value: 'source' },
              { text: $t('author'), value: 'author' },
            ]"
            v-model="groups"
          />
        </span>
        <v-spacer></v-spacer>
        <v-btn @click="export_query" class="exports">
          <v-icon>mdi-clipboard-outline</v-icon> {{ $t("export-task") }}
        </v-btn>
        <v-btn @click="export_file('xlsx')" class="exports">
          <v-icon>mdi-file-excel</v-icon> {{ $t("export-excel") }}
        </v-btn>
        <v-btn @click="export_file('json')" class="exports">
          <v-icon>mdi-download</v-icon> {{ $t("export-json") }}
        </v-btn>
      </v-row>
      <ResultsView
        class="mt-5"
        :page_size="page_size"
        @load="load_search"
        ref="results"
      />
    </v-card-text>
  </v-card>
</template>
    
<script>
import api from "../api";
import ResultsView from "../components/ResultsView";

export default {
  name: "SearchForm",
  components: { ResultsView },
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
      page_size: 50,
      cancel_source: api.cancel_source(),
    };
  },
  mounted() {
    let config = api.config;
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
    search(pagenum_preserve) {
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
      var token = new Date().getTime() + Math.random();

      if (this.external_json) {
        e.callback({
          result: this.external_json.result.results.slice(
            e.offset,
            e.offset + e.limit
          ),
          offset: e.offset,
          total: this.external_json.result.total,
          token,
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
        groups:
          typeof this.groups === "object" ? this.groups.value : this.groups,
      };

      if (params.sort !== "random") api.config.sort = params.sort;

      api.call("search", params, this.cancel_source).then((data) => {
        if (!data) {
          console.log("WARNING: no data returned.");
          return;
        }
        if (data.result.query) {
          var reg = new RegExp(
            "(" +
              this.keyword_patterns(data.result.query)
                .filter((x) => x)
                .join("|") +
              ")",
            "ig"
          );
          this.results = data.result.results.map((x) => {
            x.matched_content = (x.content || "").replace(reg, "<em>$1</em>");
            return x;
          });
        }
        this.querystr = api.querify(data.result.query).replace(/^\(|\)$/g, "");
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
    keyword_patterns(query) {
      if (Array.isArray(query))
        return query
          .map((x) => this.keyword_patterns(x))
          .reduce((prev, curr) => (prev = prev.concat(curr)), []);
      if (["string", "number", "boolean"].includes(typeof query)) return [];
      return Object.entries(query)
        .map((kvpair) => {
          let key = kvpair[0],
            val = kvpair[1];
          if (key == "keywords") {
            if (typeof val == "string") return [api.escape_regex(val)];
            else if (typeof val.$regex == "string") return [val.$regex];
          }
          return this.keyword_patterns(val);
        })
        .reduce((prev, curr) => (prev = prev.concat(curr)), []);
    },
    export_query(format, callback) {
      if (typeof callback !== "function")
        callback = (data) =>
          this.$router.push("/tasks/" + data.result).catch(() => {});
      api
        .put("tasks/", {
          name: this.$t("search") + " " + this.querystr,
          pipeline: [
            [
              "DBQueryDataSource",
              {
                query: this.querystr,
                mongocollections: this.selected_mongocollections,
              },
            ],
            ["AccumulateParagraphs", {}],
            ["Export", { output_format: format }],
          ],
        })
        .then(callback);
    },
    export_file(fmt) {
      this.export_query(fmt, (data) => {
        api.put("queue/", { id: data.result }).then((ret) =>
          api.notify({
            title: this.$t("task-enqueued", { task: ret.result }),
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

.vue-treeselect__control {
  border-radius: 0;
}
.theme--dark .vue-treeselect {
  color: rgba(0, 0, 0, 0.7) !important;
}

.selector {
  vertical-align: bottom;
}

.exports {
  margin-right: 12px;
}
</style>