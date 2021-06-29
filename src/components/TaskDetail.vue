<template>
  <div id="task">
    <div class="mui-panel">
      <ParamInput v-model="task.name" :arg="{ name: '名称', type: '' }" />
      <span>ID: {{ task._id }}</span
      ><br />
      <button class="mui-btn" @click="enqueue">
        <font-awesome-icon icon="play" /> 后台执行
      </button>
      <div class="mui-checkbox">
        <label>
        <input type="checkbox" v-model="task.resume_next">
          忽略运行中间的错误</label>
        <div class="mui-select">
          <select v-model="task.concurrent">
            <option :value="1">不并行处理</option>
            <option :value="3">并行处理</option>
          </select>
        </div>
      </div>
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
      <Pipeline v-model="task.pipeline" 
        @validation="update_valid('pipeline_main', $event)"
      />
    </div>
    <button
      @click="save().then(() => notify('保存成功'))"
      class="mui-btn mui-btn--primary"
    >
      <font-awesome-icon icon="check" /> 保存
    </button>
    <button @click="delete_task()" class="mui-btn mui-btn--danger">
      <font-awesome-icon icon="trash" /> 删除
    </button>
    <button @click="show_code = !show_code" class="mui-btn">
      <font-awesome-icon icon="code" />
    </button>
    <pre v-if="show_code">{{ querify(value) }}</pre>
  </div>
</template>


<script>
import api from "../api"
import ParamInput from './ParamInput.vue';
import Pipeline from "./Pipeline"

export default {
  name: "TaskDetail",
  components: {
    Pipeline,
    ParamInput
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
      show_code: false
    };
  },
  mounted() {
    api.call("help/datasources").then((data) => {
      this.datasources = data.result;
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
    delete_task() {
      if (!confirm("确认要删除此任务吗？")) return;
      api.delete("tasks/" + this.task._id).then((data) => {
        if (data.result.ok) {
          api.notify("删除成功");
          this.$router.push("./");
        }
      });
    },
    save() {
      if (this.valid.length > 0) {
        alert("有错误的输入值，请检查");
        return;
      }
      return api.call("tasks/" + this.task._id, this.task).then((data) => {
        var id = this.task._id;
        this.task = data.result.updated;
        this.task._id = id;
        return id;
      });
    },
    notify(title) {
      api.notify({ title });
    },
    enqueue() {
      this.save().then(id =>
        api.put("queue/", { id }).then((data) => {
          this.notify(data.result + " 已成功加入后台处理队列。");
        })
      );
    },
    querify() {
      function _values(x, indent) {
        if (Array.isArray(x)) {
          if (x.length > 0 && x.filter(y => y.length == 2).length == x.length)
            return '([]' + _querify(x, indent + '  ') + '\n' + indent + ')'
          return '([]' + (x.length > 0 ? ' => ' + x.map(_values).join(' => ') : '') + ')'
        } else if (typeof(x) === 'object') {
          return '(' + _params(x, indent + '  ') + ')'
        } else if (typeof(x) === 'string') {
          return '`' + JSON.stringify(x).replace(/^"|"$/g, '').replace(/`/g, '\\`') + '`'
        } else
          return JSON.stringify(x)
      }
      function _params(c, indent) {
        var r = []
        for (var k in c) {
          console.log(typeof(c[k]))
          if (typeof(c[k]) === 'undefined') continue
          r.push(indent + k + '=' + _values(c[k], indent))
        }
        r = r.join(',\n')
        if (r !== '') r = '\n' + r + '\n'
        return r
      }
      function _querify(v, indent) {
        var s = ''
        for (var i of v) {
          var c = _params(i[1], indent + '  ')
          if (c !== '') c += indent
          s += ' =>\n' + indent + i[0] + '(' + c + ')'
        }
        return s
      }
      return _querify([[this.task.datasource, this.task.datasource_config]], '').substr(4) + _querify(this.task.pipeline, '')
    },
  },
};
</script>