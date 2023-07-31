<template>
  <v-card flat>
    <v-card-title>{{ $t("search") }}</v-card-title>
    <v-card-text @drop.prevent="drop_json_file" @dragover.prevent>
      <form autocapitalize="off" autocorrect="off" spellcheck="false">
        <v-row v-if="expert">
          <v-col>
            <ParamInput :arg="{ name: $t('query'), type: 'QUERY' }" v-model="q" ref="search_code"
              :style="{ width: '100%' }" @submit="search" class="mb-5 d-inline-block"></ParamInput>
          </v-col>
        </v-row>
        <v-row v-else>
          <v-col>
            <v-text-field class="d-inline-block selector cond-width" dense v-model="q" @keyup.enter="search"
              :label="$t('query')"></v-text-field>
            <v-combobox class="d-inline-block ml-5 selector" v-model="sort" :label="$t('sort')" dense
              :style="{ width: '100px' }" :items="[
                { text: $t('default'), value: 'id' },
                { text: $t('pdate'), value: 'pdate' },
                { text: $t('pdate-rev'), value: '-pdate' },
                { text: $t('source'), value: 'source' },
                { text: $t('latest-imported'), value: '-id' },
                { text: $t('random'), value: 'random' },
              ]"></v-combobox>
          </v-col>
        </v-row>
        <v-row style="margin-top: -24px">
          <v-col>
            <treeselect :multiple="true" :options="filtering" v-model="selected_datasets" :placeholder="$t('dataset')"
              :matchKeys="['label', 'tags']">
              <label slot="option-label" slot-scope="{ node }" class="treeselect-option-label">
                {{ node.label }} <span v-for="tag in node.raw.tags.split(', ')" :key="node.id + tag">{{ tag
                }}</span>
              </label>
            </treeselect>
          </v-col>
        </v-row>
        <v-row class="ml-0 mb-3">
          <v-btn @click="search" color="primary">{{ $t("search") }}</v-btn>
          <span class="ml-5" style="line-height: 100%; vertical-align: middle">
            {{ $t("grouping") }}
            <v-combobox class="d-inline-block ml-1" style="width: 80px" dense flat :items="[
              { text: $t('none'), value: 'none' },
              { text: $t('group'), value: 'group' },
              { text: $t('source'), value: 'source' },
              { text: $t('author'), value: 'author' },
            ]" v-model="groups" />
          </span>
          <span class="ml-5" style="line-height: 100%; vertical-align: middle">
            <v-checkbox class="d-inline-block ml-1" style="width: 80px" dense flat
              v-model="filter_by_tags"
              :label="$t('tag')"
            ></v-checkbox>
          </span>
          <v-spacer></v-spacer>
          <v-btn @click="export_query" class="exports">
            <v-icon>mdi-clipboard-outline</v-icon>
            {{ $t("export-task") }}
          </v-btn>
          <v-btn @click="export_file('xlsx')" class="exports">
            <v-icon>mdi-file-excel</v-icon>
            {{ $t("export-excel") }}
          </v-btn>
          <v-btn @click="export_file('json')" class="exports">
            <v-icon>mdi-download</v-icon>
            {{ $t("export-json") }}
          </v-btn>
        </v-row>
      </form>
      <ResultsView class="mt-5" :page_size="page_size" :load="external_json ?? load_search" ref="results" />
    </v-card-text>
  </v-card>
</template>

<script>
import ResultsView from "../components/ResultsView";
import ParamInput from "../components/ParamInput.vue";

export default {
  name: "SearchForm",
  components: { ResultsView, ParamInput },
  data() {
    return {
      datasets: [],
      tags: [],
      filter_by_tags: false,
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
      cancel_source: this.api.cancel_source(),
      expert: this.api.config.expert,
      ds_search: '',
    };
  },
  computed: {
    filtering() {
      return this.filter_by_tags ? this.tags : this.datasets;
    }
  },
  mounted() {
    let config = this.api.config;
    if (config.page_size) this.page_size = config.page_size;
    if (config.sort) this.sort = config.sort;
    if (config.groups) this.groups = config.groups;

    let search_params = this.api.querystring_parse(location.search);
    if (config.expert && search_params.q && search_params.q.startsWith("? "))
      search_params.q = search_params.q.replace(/^\? /, "");
    for (var k of ["q", "sort", "groups"])
      if (search_params[k]) this[k] = search_params[k];
    if (this.api.config.expert) this.$refs.search_code.refresh(this.q);

    this.api.get_datasets_hierarchy().then((data) => {
      this.datasets = data.hierarchy;
      this.tags = data.tags;
      this.selection_bundles = data.bundles;
      this.selected_datasets =
        search_params.selected_datasets || config.selected_datasets || [];
      if (this.q) this.search(true);
    });
  },
  methods: {
    datasets_req() {
      var selected = this.selected_datasets.map((sid) => this.selection_bundles[sid]),
        req = "";

      function combine(selection, field) {
        return Array.from(
          selection.map((x) =>
            typeof x[field] == 'string' ? new Set([x[field]]) :
              x[field]
          ).reduce((prev, curr) => {
            (curr || []).forEach(y => prev.add(y))
            return prev
          }, new Set()))
      }

      if (selected.length > 0) {
        var datasets = combine(selected
          .filter((x) => !x.source), 'dataset_name')
          .map((x) => this.api.escape_regex(x)),
          sourcefiles = selected
            .filter((x) => x.source)
            .map((x) => ({
              file: x.source.split(":", 2).pop(),
              dataset: x.dataset_name,
            })),
          req_datasets = "",
          req_sourcefiles = "";
        this.selected_mongocollections = combine(selected, 'mongocollection')

        if (datasets.length > 0) {
          req_datasets =
            "dataset%`^" + datasets.map((x) => (x == "" ? "$" : x)).join("|^") + "`";
        }
        if (sourcefiles.length > 0) {
          req_sourcefiles = sourcefiles
            .map((sf) => `(dataset='${sf.dataset}',source.file='${sf.file}')`)
            .join("|");
        }
        req =
          "(" +
          [req_datasets, req_sourcefiles].filter((x) => x.length > 0).join("|") +
          ")";
      }

      if (this.api.config.view_mode == "gallery") {
        req += (req ? "," : "") + "images!=[]";
      }
      return req;
    },
    search(pagenum_preserve) {
      this.external_json = null;

      if (!this.selected_datasets || this.selected_datasets.length == 0)
        this.selected_datasets = this.datasets.map((s) => s.id);

      this.req = this.datasets_req();

      document.title =
        this.api.meta.app_title +
        (this.q ? " - " + this.$t("search") + " " + this.q : "");

      if (pagenum_preserve !== true)
        history.pushState(
          "",
          "",
          this.api.querystring_stringify(
            Object.assign(this.api.querystring_parse(location.search), {
              q: this.q,
              selected_datasets: this.selected_datasets,
              sort: this.expert ? "" : this.sort,
              groups: this.groups,
              selected_mongocollections: this.selected_mongocollections,
            })
          )
        );

      this.$refs.results.start(pagenum_preserve === true ? undefined : 1);
    },
    load_search(e) {
      var token = new Date().getTime() + Math.random();
      const empty = new Promise((accept) =>
        accept({
          result: [],
          total: null,
        })
      );

      if (!this.q && !this.req) return empty;

      if (this.q.startsWith("file:")) {
        const json_path = this.q.substring(5).trim();
        return this.business.remote_json(json_path).then((data) => {
          this.external_json = data;
          this.$refs.results.start();
        });
      }

      if (this.cancel_source) this.cancel_source.cancel();
      this.cancel_source = this.api.cancel_source();

      var params = {
        q: (this.expert ? "? " : "") + this.q,
        req: this.req,
        sort: this.expert
          ? ""
          : typeof this.sort === "object"
            ? this.sort.value
            : this.sort,
        mongocollections: this.selected_mongocollections,
        offset: e.offset,
        limit: e.limit,
        groups: typeof this.groups === "object" ? this.groups.value : this.groups,
      };

      if (params.sort !== "random") this.api.config.sort = params.sort;
      this.api.config.groups = params.groups;

      return Promise.all([
        this.business.search(params, true, this.cancel_source).then((data) => {
            if (data.total != -1) return { token, total: data.total };
          }),

        this.business.search(params, false, this.cancel_source).then((data) => {
          if (!data) {
            console.log("WARNING: no data returned.");
            return;
          }
          if (data.query) {
            var reg = new RegExp(
              "(" +
              this.keyword_patterns(data.query)
                .filter((x) => x)
                .join("|") +
              ")",
              "gi"
            );
            this.results = data.results;
            if (reg != "/()/gi") {
              this.results = this.results.map((x) => {
                x.matched_content = (x.content || "").replace(reg, "<em>$1</em>");
                return x;
              });
            }
          }
          this.querystr = this.api.querify(data.query).replace(/^\(|\)$/g, "");
          return {
            token,
            results: data.results,
            offset: e.offset,
          };
        }),
      ]).then((results) => Object.assign(...results));
    },
    keyword_patterns(query) {
      if (Array.isArray(query))
        return query
          .map((x) => this.keyword_patterns(x))
          .reduce((prev, curr) => (prev = prev.concat(curr)), []);
      if (["string", "number", "boolean"].includes(typeof query) || query === null)
        return [];
      return Object.entries(query)
        .map((kvpair) => {
          let key = kvpair[0],
            val = kvpair[1];
          if (key == "keywords") {
            if (typeof val == "string") return [this.api.escape_regex(val)];
            else if (typeof val.$regex == "string") return [val.$regex];
          }
          return this.keyword_patterns(val);
        })
        .reduce((prev, curr) => (prev = prev.concat(curr)), []);
    },
    export_query(format, callback) {
      if (typeof callback !== "function")
        callback = (data) => this.$router.push("/tasks/" + data.task_id).catch(() => { });
      this.business.tasks({creation:
        {
          name:
            this.$t("search") + " " + new Date().toLocaleString().replace(/[^\d]/g, ""),
          pipeline: [
            [
              "DBQueryDataSource",
              {
                query: this.q,
                req: this.req,
                mongocollections: this.selected_mongocollections,
              },
            ],
            ["AccumulateParagraphs", {}],
            ["Export", { output_format: format }],
          ],
        }})
        .then(callback);
    },
    async export_file(fmt) {
      var {bundle} = await this.export_query(fmt) 
      var {job} = await this.business.enqueue(bundle.task_id)
      this.$notify("job-enqueued", { job })
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

.cond-width {
  width: calc(100% - 120px);
  min-width: 200px;
}

.treeselect-option-label span {
  font-size: 10px;
  color: #039be5;
  background-color: #e3f2fd;
  margin-left: 2px;
}
</style>
