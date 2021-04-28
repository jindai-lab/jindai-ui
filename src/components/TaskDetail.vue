<template>
  <div id="task">
    <h3>名称 <input type="text" size="20" v-model="task.name" /></h3>
    <span>ID: {{ task._id }}</span><br>
    <button class="mui-btn" @click="enqueue"><i class="fa fa-play"></i> 加入队列</button>
    <div id="datasource">
      <h2>数据源</h2>
      <div class="mui-select">
      <select v-model="task.datasource" @change="update_datasource_doc">
        <optgroup
          v-for="(dss, group) in datasources"
          :label="group"
          :key="group"
        >
          <option v-for="ds in dss" :key="ds" :value="ds">
            {{ ds }}
          </option>
        </optgroup>
      </select>
      </div>
      <blockquote id="datasource_explanation">
        {{ datasource_doc.doc }}
      </blockquote>
      <div id="datasource_args">
        <div v-for="arg in datasource_doc.args" :key="arg.name">
          <ParamInput :arg="arg" v-model="task.datasource_config[arg.name]" />
          <blockquote>{{ arg.description }}</blockquote>
        </div>
      </div>
    </div>
    <div id="pipeline">
      <h2>处理流程</h2>
      <button @click="append_stage()" class="mui-btn"><i class="fa fa-plus"></i></button>
      <div
        v-for="(stage, index) in task.pipeline"
        :key="index"
        class="stage-opers"
      >
        <StageDetail :stages="stages" v-model="task.pipeline[index]" />
        <div class="opers">
          <button @click="remove_stage(index)" class="mui-btn"><i class="fa fa-trash"></i></button>
          <button @click="move_stage(index, -1)" v-show="index > 0" class="mui-btn">
            <i class="fa fa-arrow-up"></i>
          </button>
          <button
            @click="move_stage(index, 1)"
            v-show="index < task.pipeline.length - 1"
            class="mui-btn"
          >
            <i class="fa fa-arrow-down"></i>
          </button>
        </div>
      </div>
    </div>
    <button @click="save" class="mui-btn mui-btn--primary"><i class="fa fa-check"></i> 保存</button>
  </div>
</template>


<script>
import api from "../api";
import ParamInput from "./ParamInput";
import StageDetail from "./StageDetail";

export default {
  name: "TaskDetail",
  components: {
    ParamInput,
    StageDetail,
  },
  props: ["id"],
  data() {
    return {
      datasources: [],
      stages: [],
      task: {
        _id: "",
        datasource: "",
        datasource_explanation: "",
        args: [],
        name: "",
        pipeline: [],
      },
      datasource_doc: {},
    };
  },
  mounted() {
    api.call("datasources/all").then((resp) => {
      this.datasources = resp.data.result;
    });
    api.call("pipelines/all").then((resp) => {
      this.stages = resp.data.result;
    });
    api.call("tasks/" + this.id).then((resp) => {
      this.task = resp.data.result;
      this.update_datasource_doc();
    });
  },
  methods: {
    update_datasource_doc() {
      api.call("datasources/" + this.task.datasource).then((resp) => {
        this.datasource_doc = resp.data.result;
      });
    },
    append_stage() {
      this.task.pipeline.push(["Passthrough", {}]);
    },
    remove_stage(current) {
      this.task.pipeline.splice(current, 1);
    },
    move_stage(current, inc) {
      var st = this.task.pipeline[current];
      this.task.pipeline.splice(current, 1);
      this.task.pipeline.splice(current + inc, 0, st);
    },
    save() {
      api.call('tasks/' + this.task._id, this.task).then((resp) => {
        var id = this.task._id
        this.task = resp.data.result.updated
        this.task._id = id
      })
    },
    enqueue() {
      api.put('queue/', {id: this.task._id}).then((resp) => {
        alert(resp.data.result + ' enqueued.')
      })
    }
  },
};
</script>

<style scoped>
.opers {
  visibility: hidden;
}
.stage-opers:hover {
  background-color: white;
}
.stage-opers:hover .opers {
  visibility: visible;
}
</style>