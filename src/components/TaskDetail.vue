<template>
  <div id="task">
    <div class="mui-panel">
      <ParamInput v-model="task.name" :arg="{ name: '名称', type: '' }" />
      <span>ID: {{ task._id }}</span
      ><br />
      <button class="mui-btn" @click="enqueue">
        <i class="fa fa-play"></i> 加入队列
      </button>
    </div>
    <h2>数据源</h2>
    <div id="datasource" class="mui-panel">
      <div class="mui-select">
        <select v-model="task.datasource">
          <optgroup
            v-for="(dss, group) in datasources"
            :label="group"
            :key="group"
          >
            <option v-for="ds in dss" :key="ds.name" :value="ds.name">
              {{ ds.name }} {{ ds.doc }}
            </option>
          </optgroup>
        </select>
      </div>
      <blockquote id="datasource_explanation">
        {{ datasource_doc.doc }}
      </blockquote>
      <div id="datasource_args">
        <div v-for="arg in datasource_doc.args" :key="arg.name">
          <ParamInput
            :arg="arg"
            v-model="task.datasource_config[arg.name]"
            @validation="update_valid('ds_args_' + arg.name, $event)"
          />
          <blockquote>{{ arg.description }}</blockquote>
        </div>
      </div>
    </div>
    <div id="pipeline">
      <h2>处理流程</h2>
      <button @click="append_stage()" class="mui-btn">
        <i class="fa fa-plus"></i>
      </button>
      <div
        v-for="(stage, index) in task.pipeline"
        :key="index"
        class="stage-opers mui-panel"
      >
        <StageDetail
          :stages="stages"
          v-model="task.pipeline[index]"
          @validation="update_valid('stage_' + index, $event)"
        />
        <div class="opers">
          <button @click="remove_stage(index)" class="mui-btn">
            <i class="fa fa-trash"></i>
          </button>
          <button
            @click="move_stage(index, -1)"
            v-show="index > 0"
            class="mui-btn"
          >
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
    <button @click="save().then(notify('保存成功'))" class="mui-btn mui-btn--primary">
      <i class="fa fa-check"></i> 保存
    </button>
    <button @click="delete_task()" class="mui-btn mui-btn--danger">
      <i class="fa fa-trash"></i> 删除
    </button>
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
      datasources: {},
      stages: {},
      task: {
        _id: "",
        datasource: "",
        datasource_config: {},
        name: "",
        pipeline: [],
      },
      valid: [],
    };
  },
  mounted() {
    api.call("help/datasources").then((data) => {
      this.datasources = data.result;
    });
    api.call("help/pipelines").then((data) => {
      this.stages = data.result;
    });
    api.call("tasks/" + this.id).then((data) => {
      this.task = data.result;
    });
  },
  computed: {
    datasource_doc() {
      for (var x in this.datasources)
        if (this.datasources[x][this.task.datasource])
          return this.datasources[x][this.task.datasource];
      return {};
    },
  },
  methods: {
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
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
    delete_task() {
      if (!confirm('确认要删除此任务吗？')) return
      api.delete('tasks/' + this.task._id).then(data => {
        if (data.result.ok) {
          api.notify('删除成功')
          this.$router.push('./')
        }
      })
    },
    save() {
      if (this.valid.length > 0) {
        alert("有错误的输入值，请检查");
        return;
      }
      return new Promise((resolve, reject) =>
        api
          .call("tasks/" + this.task._id, this.task)
          .then((data) => {
            var id = this.task._id;
            this.task = data.result.updated;
            this.task._id = id;            
            resolve(id);
          })
          .catch(reject)
      );
    },
    notify(title) {
      api.notify({title})
    },
    enqueue() {
      this.save().then(
        api.put("queue/", { id: this.task._id }).then((data) => {
          this.notify(data.result + " 已成功加入后台处理队列。");
        })
      );
    },
  },
};
</script>

<style scoped>
.opers {
  visibility: hidden;
}

.stage-opers:hover .opers {
  visibility: visible;
}
</style>