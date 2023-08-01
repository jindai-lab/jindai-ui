<template>
  <v-sheet>
    <v-card flat>
      <v-card-title>{{ $t("quick-task") }} {{ task.name }}</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item v-for="(k, v) in task.shortcut_map" :key="k">
            <v-list-item-content>
              <v-list-item-title>{{ k }}</v-list-item-title>
              <v-list-item-subtitle>
                <ParamInput
                  :arg="get_map_arg(v)"
                  v-model="shortcut_params[v]"
                  @validation="update_valid('shortcut_param_' + v, $event)"
                  @input="$forceUpdate()"
              /></v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="quicktask" class="ml-4">
          <v-icon>mdi-fast-forward</v-icon>
          {{ $t("run-now") }}
        </v-btn>
        <v-btn @click="enqueue">
          <v-icon>mdi-play</v-icon> {{ $t("run-background") }}
        </v-btn>
        <v-btn color="primary" @click="$router.push('/tasks/' + id)">
          <v-icon>mdi-file-edit-outline</v-icon>
          {{ $t("edit") }}
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-card flat>
      <v-card-title>{{ $t("results") }}</v-card-title>
      <v-card-text>
        <ResultsView :load="results" ref="results" :view_mode="view_mode" />
        {{ result_plain }}
      </v-card-text>
    </v-card>
  </v-sheet>
</template>


<script>
import ParamInput from "../components/ParamInput.vue";
import ResultsView from "../components/ResultsView.vue";

export default {
  name: "TaskShortcut",
  components: {
    ParamInput,
    ResultsView,
  },
  props: ["id"],
  data() {
    return {
      stages: this.business.pipelines,
      task: {
        _id: "",
        name: "",
        shortcut_map: {},
        pipeline: [],
      },
      view_mode: "list",
      shortcut_params: {},
      results: [],
      result_plain: "",
      valid: [],
    };
  },
  watch: {
    id() {
      this.shortcut_params = {};
      this.results = {};
      this.valid = [];
      this.result_plain = "";
    },
  },
  mounted() {
    var params = this.api.querystring_parse(location.search.substring(1));
    this.stages = Object.assign(
      {},
      ...Object.entries(this.business.pipelines).map((kv) => kv[1])
    );

    this.business.tasks({id: this.id}).then((data) => {
      this.task = data;
      for (var k in this.task.shortcut_map) {
        this.shortcut_params[k] =
          typeof params[k] === "undefined" ? this.get_map_val(k) : params[k];
      }
    });
  },
  methods: {
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
    },
    apply_params() {
      for (var k in this.shortcut_params) {
        const v = this.shortcut_params[k];
        const mapped_to = k.split(".");
        var target = this.task.pipeline;
        for (var seg of mapped_to.slice(1, -1)) {
          target = seg.match(/^\d+$/) ? target[+seg][1] : target[seg];
        }
        target[mapped_to.slice(-1)[0]] = v;
      }
    },
    quicktask() {
      this.apply_params();
      this.result_plain = "";
      this.business.quicktask({
          pipeline: this.task.pipeline,
        }).then((data) => {
          if (Array.isArray(data.results)) {
            this.results = data.results;
            this.result_plain = "";
          } else if (data) {
            this.result_plain = JSON.stringify(data);
            this.results = [];
          }
        }).then(() => {
          this.$refs.results.start(1);
        });
    },
    enqueue() {
      this.apply_params();

      if (this.valid.length > 0) {
        alert(this.$t("invalid-input"));
        return;
      }
      for (var k in this.task.shortcut_map) {
        if (
          typeof this.task.shortcut_map[k] === "undefined" ||
          this.task.shortcut_map[k] === "" ||
          this.task.shortcut_map[k] === null
        )
          delete this.task.shortcut_map[k];
      }

      this.business.tasks({
        update: this.task
      }).then((data) => {
          var id = this.task._id;
          this.task = data;
          this.task._id = id;
          return id;
        })
        .then((id) =>
          this.business.enqueue(id).then(({job}) => {
            this.$notify(this.$t("job-enqueued", { job }));
          })
        );
    },
    querify() {
      var s = this.api.querify(this.task.pipeline, "");
      if (this.task.pipeline.length == 1) return "[];" + s;
      return s;
    },
    get_map_arg(v) {
      v = v.split(".");
      var arg = {},
        target = this.task.pipeline;
      for (var seg of v.slice(1, -1)) {
        target = seg.match(/^\d+$/) ? target[+seg] : target[1][seg];
      }
      var argname = v.pop();
      arg = this.stages[target[0]].args.filter((x) => x.name == argname)[0];
      return arg;
    },
    get_map_val(v) {
      v = v.split(".");
      var target = this.task.pipeline;
      for (var seg of v.slice(1)) {
        target = seg.match(/^\d+$/) ? target[+seg][1] : target[seg];
      }
      return target;
    },
  },
};
</script>
