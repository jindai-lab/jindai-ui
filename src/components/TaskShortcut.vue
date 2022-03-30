<template>
  <v-sheet>
    <v-card flat>
      <v-card-title>快捷任务 {{ task.name }}</v-card-title>
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
          立即执行
        </v-btn>
        <v-btn @click="enqueue"> <v-icon>mdi-play</v-icon> 队列执行 </v-btn>
        <v-btn color="primary" @click="$router.push('/tasks/' + id)">
          <v-icon>mdi-file-edit-outline</v-icon>
          编辑
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-card flat>
      <v-card-title>运行结果</v-card-title>
      <v-card-text>
        <ResultsView :total="total" @load="load_search" ref="results" />
      </v-card-text>
    </v-card>
  </v-sheet>
</template>


<script>
import api from "../api";
import ParamInput from "./ParamInput.vue";
import ResultsView from "./ResultsView.vue";

export default {
  name: "TaskShortcut",
  components: {
    ParamInput,
    ResultsView,
  },
  props: ["id"],
  data() {
    return {
      stages: {},
      task: {
        _id: "",
        name: "",
        shortcut_map: {},
        pipeline: [],
      },
      shortcut_params: {},
      results: [],
      total: 0,
      valid: [],
    };
  },
  watch: {
    id() {
      this.shortcut_params = {}
      this.results = []
      this.total = 0
      this.valid = []
    }
  },
  mounted() {
    api.call("help/pipelines").then((data) => {
      for (var k in data.result) {
        Object.assign(this.stages, data.result[k]);
      }
      api.call("tasks/" + this.id).then((data) => {
        this.task = data.result;
        for (var k in this.task.shortcut_map) {
          this.shortcut_params[k] = this.get_map_val(k)
        }
      });
    });
  },
  methods: {
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
    },
    notify(title) {
      api.notify({ title });
    },
    update_params() {
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
      this.update_params();
      api
        .call("quicktask", {
          pipeline: this.querify(),
        })
        .then((data) => {
          if (Array.isArray(data.result)) {
            this.results = data.result;
            this.$refs.results.start();
          } else if (
            typeof data.result === "object" &&
            data.result !== null &&
            data.result.__file_ext__
          ) {
            const b64toBlob = (b64Data, contentType = "", sliceSize = 512) => {
              const byteCharacters = atob(b64Data);
              const byteArrays = [];

              for (
                let offset = 0;
                offset < byteCharacters.length;
                offset += sliceSize
              ) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);

                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                  byteNumbers[i] = slice.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
              }

              const blob = new Blob(byteArrays, { type: contentType });
              return blob;
            };
            api.blob_download(
              b64toBlob(data.result.data),
              this.task.name + "." + data.result.__file_ext__
            );
          }
        });
    },
    enqueue() {
      this.update_params();

      if (this.valid.length > 0) {
        alert("有错误的输入值，请检查");
        return;
      }
      for (var k in this.task.shortcut_map) {
        if (
          typeof this.task.shortcut_map[k] === 'undefined' ||
          this.task.shortcut_map[k] === "" ||
          this.task.shortcut_map[k] === null
        )
          delete this.task.shortcut_map[k];
      }

      api
        .call("tasks/" + this.task._id, this.task)
        .then((data) => {
          var id = this.task._id;
          this.task = data.result.updated;
          this.task._id = id;
          return id;
        })
        .then((id) =>
          api.put("queue/", { id }).then((data) => {
            this.notify(data.result + " 已成功加入后台处理队列。");
          })
        );
    },
    querify() {
      var s = api.querify(this.task.pipeline, "")
      if (this.task.pipeline.length == 1)
        return '[];' + s
      return s
    },
    get_map_arg(v) {
      v = v.split(".");
      var arg = {};
      arg = this.stages[this.task.pipeline[+v[1]][0]].args.filter(
        (x) => x.name == v[2]
      )[0];
      return arg;
    },
    get_map_val(v) {
      v = v.split(".");
      var arg = null;
      arg = this.task.pipeline[+v[1]][1][v[2]];
      return arg;
    },
    load_search(e) {
      this.total = this.results.length;
      e.callback({ result: this.results, offset: 0 });
    },
  },
};
</script>