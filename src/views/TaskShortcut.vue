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
                <ParamInput :arg="get_map_arg('' + v)" v-model="shortcut_params[v]"
                  @validation="update_valid('shortcut_param_' + v, $event)" @input="$forceUpdate()" />
              </v-list-item-subtitle>
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
        <ResultsView :data="results" ref="results" :view_mode="view_mode" />
        {{ result_plain }}
      </v-card-text>
    </v-card>
  </v-sheet>
</template>


<script lang="ts">
import { Paragraph, PipelineArgument, TaskDBO } from "@/api/dbo";
import { call } from "@/api/net";
import remoteConfig from "@/api/remoteConfig";
import { downloadBlob, qsparse, querify } from "@/api/ui";
import { notify } from "@/dialogs";
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
      stages: remoteConfig.piplineDirectory,
      task: {
        _id: "",
        name: "",
        shortcut_map: {},
        pipeline: [],
      } as Partial<TaskDBO>,
      view_mode: "list",
      shortcut_params: {} as { [key: string]: any },
      results: [] as Paragraph[],
      result_plain: "",
      valid: [] as string[],
    };
  },
  watch: {
    id() {
      this.shortcut_params = {};
      this.results = [];
      this.valid = [];
      this.result_plain = "";
    },
  },
  mounted() {
    var params = qsparse(location.search.substring(1));
    this.stages = Object.assign(
      {},
      ...Object.entries(remoteConfig.pipelines).map((kv) => kv[1])
    );

    call<TaskDBO>("tasks/" + this.id).then((data) => {
      this.task = data;
      for (var k in this.task.shortcut_map) {
        this.shortcut_params[k] =
          typeof params[k] === "undefined" ? this.get_map_val(k) : params[k];
      }
    });
  },
  methods: {
    update_valid(name: string, valid?: string) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
    },
    apply_params() {
      for (var k in this.shortcut_params) {
        const v = this.shortcut_params[k];
        const mapped_to = k.split(".");
        var target = this.task?.pipeline as { [id: string | number]: any };
        if (target) {
          for (var seg of mapped_to.slice(1, -1)) {
            target = seg.match(/^\d+$/) ? target[+seg][1] : target[seg];
          }
          target[mapped_to.slice(-1)[0] as never] = v;
        }
      }
    },
    quicktask() {
      this.apply_params();
      this.result_plain = "";
      call("quicktask", 'post', {
        pipeline: this.task.pipeline,
      })
        .then((data) => {
          if (Array.isArray(data)) {
            this.results = data;
            this.result_plain = "";
          } else if (
            typeof data === "object" &&
            data !== null &&
            '__file_ext__' in data &&
            'data' in data
          ) {
            const b64toBlob = (b64Data: string, contentType = "", sliceSize = 512) => {
              const byteCharacters = Buffer.from(b64Data, 'base64');
              const byteArrays = []
              const bytes = Uint8Array.from(byteCharacters);

              for (
                let offset = 0;
                offset < byteCharacters.length;
                offset += sliceSize
              ) {
                const slice = bytes.slice(offset, offset + sliceSize);
                byteArrays.push(slice);
              }

              const blob = new Blob(byteArrays, { type: contentType });
              return blob;
            };
            downloadBlob(
              b64toBlob(data.data as string),
              this.task.name + "." + data.__file_ext__
            );
          } else {
            this.result_plain = JSON.stringify(data);
            this.results = [];
          }
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

      call<TaskDBO>("tasks/" + this.task._id, 'post', this.task)
        .then((data: TaskDBO) => {
          var id = this.task._id;
          this.task = data;
          this.task._id = id;
          return id || '';
        })
        .then((id: string) =>
          call("queue/", 'put', { id }).then((data) => {
            notify(this.$t("task-enqueued", { task: data }));
          })
        );
    },
    querify_task() {
      var s = querify(this.task.pipeline);
      if (this.task.pipeline?.length == 1) return "[];" + s;
      return s;
    },
    get_map_arg(v: string) {
      const vals = v.split(".");
      var arg = {},
        target = this.task.pipeline as { [id: string | number]: any };
      for (var seg of vals.slice(1, -1)) {
        target = seg.match(/^\d+$/) ? target[+seg] : target[1][seg];
      }
      var argname = vals.pop();
      arg = this.stages[target[0] as string].args.filter((x) => x.name == argname)[0];
      return arg as PipelineArgument;
    },
    get_map_val(v: string) {
      const vals = v.split(".");
      var target = this.task.pipeline as { [id: string | number]: any };
      for (var seg of vals.slice(1)) {
        target = seg.match(/^\d+$/) ? target[+seg][1] : target[seg];
      }
      return target;
    },
  },
};
</script>
