<template>
  <v-card flat>
    <v-card-title>{{ $t("search") }}</v-card-title>
    <v-card-text @drop.prevent="drop_json_file" @dragover.prevent>
      <form autocapitalize="off" autocorrect="off" spellcheck="false">
        <v-row v-if="expert">
          <v-col>
            <ParamInput :arg="{ name: $t('query'), type: 'QUERY', default: '', description: '' }" v-model="q" ref="search_code"
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
            <treeselect :multiple="true" :options="datasets" v-model="selected_datasets" :placeholder="$t('dataset')" />
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
      <ResultsView class="mt-5" :page_size="page_size" :load="load_search" ref="results" />
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import ResultsView from "../components/ResultsView.vue";
import ParamInput from "../components/ParamInput.vue";
import { cancel_source, call } from "@/api/net";
import { escape_regex, qsparse, qstringify, querify, UpdaterOptions } from "@/api/ui";
import localConfig from "@/api/localConfig";
import { DatasetHierarchy, UIDataset, UIParagraph } from "@/api";
import remoteConfig from "@/api/remoteConfig";
import { Paragraph } from "@/api/dbo";
import { notify } from "@/dialogs";

export default {
  name: "SearchForm",
  components: { ResultsView, ParamInput },
  data() {
    return {
      datasets: [] as DatasetHierarchy[],
      selected_datasets: [] as string[],
      open_datasets: [] as string[],
      selected_mongocollections: [] as string[],
      q: "",
      groups: "none" as (string | {value: string, text: string}),
      sort: "" as (string | {value: string, text: string}),
      querystr: "",
      req: "",
      selection_bundles: {} as {[id:string]: any},
      external_json: null as ({results: Paragraph[], total: number} | null),
      page_size: 50,
      cancel_source: cancel_source(),
      expert: localConfig.expert,
      results: [] as Paragraph[]
    };
  },
  mounted() {
    if (localConfig.page_size) this.page_size = localConfig.page_size;
    if (localConfig.sort) this.sort = localConfig.sort;
    if (localConfig.groups) this.groups = localConfig.groups;

    let search_params = qsparse(location.search);
    if (localConfig.expert && search_params.q && search_params.q.startsWith("? "))
      search_params.q = search_params.q.replace(/^\? /, "");
    for (var k in search_params)
      if (!["q", "sort", "groups"].includes(k))
        delete search_params[k]

    Object.assign(this, search_params)
    UIDataset.get_datasets_hierarchy().then(data => {
      this.datasets = data.hierarchy;
      this.selection_bundles = data.bundles;
      this.selected_datasets =
        search_params.selected_datasets || localConfig.selected_datasets
      if (this.q) this.search(true);
    })
  },
  methods: {
    datasets_req() {
      var selected = this.selected_datasets.map((sid) => this.selection_bundles[sid]),
        req = "";

      if (selected.length > 0) {
        var datasets = selected
          .filter((x) => !x.source)
          .map((x) => escape_regex(x.dataset_name)),
          sourcefiles = selected
            .filter((x) => x.source)
            .map((x) => ({
              file: x.source.split(":", 2).pop(),
              dataset: x.dataset_name,
            })),
          req_datasets = "",
          req_sourcefiles = "";
        this.selected_mongocollections = Array.from(
          new Set(selected.map((x) => x.mongocollection))
        );

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

      if (localConfig.view_mode == "gallery") {
        req += (req ? "," : "") + "images!=[]";
      }
      return req;
    },
    search(pagenum_preserve?: boolean) {
      this.external_json = null;

      if (!this.selected_datasets || this.selected_datasets.length == 0)
        this.selected_datasets = this.datasets.map((s) => s.id);

      this.req = this.datasets_req();

      document.title = remoteConfig.meta.app_title + " " + this.q;

      if (pagenum_preserve !== true)
        history.pushState(
          "",
          "",
          qstringify(
            Object.assign(qsparse(location.search), {
              q: this.q,
              selected_datasets: this.selected_datasets,
              sort: this.expert ? "" : this.sort,
              groups: this.groups,
              selected_mongocollections: this.selected_mongocollections,
            })
          )
        );

      // this.$refs.results.start(pagenum_preserve === true ? undefined : 1);
    },
    async load_search(e: UpdaterOptions):Promise<({ total:Number, result:Paragraph[]})> {
      var token = new Date().getTime() + Math.random();
    
      if (!this.q && !this.req) return {
          result: [],
          total: -1,
        };

      if (this.q.startsWith("file:")) {
        const json_path = this.q.substring(5).trim();
        return await call<string>("image?file=" + json_path).then((data) => {
          return JSON.parse(data);
        });
      }

      if (this.cancel_source) this.cancel_source.cancel();
      this.cancel_source = cancel_source();

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

      if (params.sort !== "random") localConfig.sort = params.sort;
      localConfig.groups = params.groups;

      let results = await Promise.all([
        call("search", 'post', Object.assign({ count: true }, params, this.cancel_source.token))
          .then((data) => {
            if (typeof data !== "undefined") return { token, total: data };
          }),
        call<{query: string[], results: Paragraph[]}>("search",'post', params, this.cancel_source.token).then((data) => {
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
            if (reg.toString() != "/()/gi") {
              this.results = this.results.map((x) => {
                var p = new UIParagraph(x);
                p.matched_content = (p.content || "").replace(reg, "<em>$1</em>");
                return p
              });
            }
          }
          this.querystr = querify(data.query).replace(/^\(|\)$/g, "");
          return {
            token,
            result: data.results,
            offset: e.offset,
          };
        }),
      ])
      
      let result = {token:0, total:-1, result:[] as UIParagraph[]}
      Object.assign(result, ...results)
      return result
    },
    keyword_patterns(query: any): string[] {
      if (Array.isArray(query))
        return query
          .map((x) => this.keyword_patterns(x))
          .reduce((prev, curr) => (prev = prev.concat(curr)), []);
      if (["string", "number", "boolean"].includes(typeof query) || query === null)
        return [];
      return Object.entries(query)
        .map((kvpair: [key: string, val: any]) => {
          let [key, val] = kvpair
          if (key == "keywords") {
            if (typeof val == "string") return [escape_regex(val)];
            else if ('$regex' in (val as object) && typeof val.$regex == "string") return [val.$regex as string];
          }
          return this.keyword_patterns(val);
        })
        .reduce((prev, curr) => (prev = prev.concat(curr)), []);
    },
    export_query(format: string, callback: ((task_id: string) => any)) {
      if (typeof callback !== "function")
        callback = (task_id) => this.$router.push("/tasks/" + task_id).catch(() => { });
      call<string>("tasks/", 'put', {
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
        })
        .then(callback);
    },
    export_file(exportFormat: string) {
      this.export_query(exportFormat, (task_id) => {
        call<string>("queue/", 'put', { id: task_id })
          .then((ret) => notify("task-enqueued", { task: ret }));
      });
    },
    drop_json_file(e: InputEvent) {
      const files = e.dataTransfer?.files || []
      let droppedFiles = Array.from(files).filter((x) =>
        x.name.match(/\.json$/)
      );
      if (!droppedFiles.length) return;
      let file = droppedFiles[0];
      let reader = new FileReader();
      reader.onload = (f) => {
        this.external_json = JSON.parse(f.target?.result?.toString() || "{}");
        // this.$refs.results.start();
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
</style>
