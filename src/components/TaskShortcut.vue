<template>
  <div id="task">
    <div class="mui-panel">
      <h3>快捷任务：{{ task.name }}</h3>
    </div>
    <h2>任务参数</h2>
    <div class="mui-panel">
      <div>
        <div v-for="(k, v) in task.shortcut_map" :key="k">
          <ParamInput
            :arg="get_map_arg(v)"
            v-model="shortcut_params[v]"
            @validation="update_valid('shortcut_param_' + v, $event)"
          />
          <blockquote>{{ k }}</blockquote>
        </div>
      </div>
    </div>    
    <button class="mui-btn" @click="quicktask">
      <font-awesome-icon icon="forward" /> 立即执行
    </button>
    <h2>运行结果</h2>
    <ResultsView :total="total" @load="load_search" ref="results" />
  </div>
</template>


<script>
import api from "../api";
import ParamInput from "./ParamInput.vue";
import ResultsView from "./ResultsView.vue"

export default {
  name: "TaskShortcut",
  components: {
    ParamInput,
    ResultsView
  },
  props: ["id"],
  data() {
    return {
      datasources: {},
      stages: {},
      task: {
        _id: "",
        datasource: "",
        datasource_config: {},
        name: "",
        shortcut_map: {},
        pipeline: [],
      },
      shortcut_params: {},
      results: [],
      total: 0,
      valid: []
    };
  },
  mounted() {
    api.call("help/datasources").then((data) => {
      for (var k in data.result) {
        Object.assign(this.datasources, data.result[k])
      }
      api.call("help/pipelines").then((data) => {
        for (var k in data.result) {
          Object.assign(this.stages, data.result[k])
        }
        api.call("tasks/" + this.id).then((data) => {
          this.task = data.result;
        });
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
    quicktask() {
      for (var k in this.shortcut_params) {
        const v = this.shortcut_params[k];
        const mapped_to = k.split(".");
        var target =
          mapped_to[0] === "datasource"
            ? this.task.datasource_config
            : this.task.pipeline;
        for (var seg of mapped_to.slice(1, -1)) {
          target = seg.match(/^\d+$/) ? target[+seg] : target[seg];
        }
        target[mapped_to.slice(-1)[0]] = v;
      }
      console.log(this.task);
      api
        .call("quicktask", {
          query: this.querify(),
        })
        .then((data) => {
          if (Array.isArray(data.result)) {
            this.results = data.result
            this.$refs.results.start()
          } else if (typeof data.result === 'object' && data.result !== null && data.result.__file_ext__) {
            const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
              const byteCharacters = atob(b64Data);
              const byteArrays = [];

              for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);

                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                  byteNumbers[i] = slice.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
              }

              const blob = new Blob(byteArrays, {type: contentType});
              return blob;
            }
            api.blob_download(b64toBlob(data.result.data), this.task.name + '.' + data.result.__file_ext__)
          }
        });
    },
    querify() {
      return (
        "datasource=" +
        api.querify([[this.task.datasource, this.task.datasource_config]]) +
        ";\n" +
        api.querify(this.task.pipeline, "")
      );
    },
    get_map_arg(v) {
      v = v.split(".");
      // maping value shoud be like datasource.[arg name] or pipeline.[index].[arg name]
      var arg = {};
      if (v[0] === "datasource")
        arg = this.datasources[this.task.datasource].args.filter((x) => x.name == v[1])[0];
      else
        arg = this.stages[this.task.pipeline[+v[1]]].args.filter(
          (x) => x.name == v[2]
        )[0];
      return arg;
    },
    load_search(e) {
      this.total = this.results.length
      e.callback({ result: this.results, offset: 0 });
    }
  },
};
</script>