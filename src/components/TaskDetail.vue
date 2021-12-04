<template>
  <v-card flat>
    <v-card-text>
      <ParamInput v-model="task.name" :arg="{ name: '名称', type: '' }" />
      <span>ID: {{ task._id }}</span
      ><br />
      <v-btn color="primary" @click="enqueue">
        <v-icon>mdi-play</v-icon> 后台执行
      </v-btn>
      <v-row>
        <v-col>
          <v-checkbox
            label="忽略运行中间的错误"
            v-model="task.resume_next"
          ></v-checkbox>
        </v-col>
        <v-col>
          <v-select
            v-model="task.concurrent"
            :items="[
              { text: '不并行处理', value: 1 },
              { text: '并行处理', value: 3 },
            ]"
          >
          </v-select>
        </v-col>
      </v-row>
      <h2>数据源</h2>
      <div id="datasource" class="mui-panel">
        <v-autocomplete
          v-model="task.datasource"
          :items="datasource_items"
          flat
        >
        </v-autocomplete>
        <div id="datasource_args">
          <div v-for="arg in datasource_doc.args" :key="arg.name">
            <v-row>
              <v-col>
                {{ arg.description }}
                <ParamInput
                  :arg="arg"
                  v-model="task.datasource_config[arg.name]"
                  @validation="update_valid('ds_args_' + arg.name, $event)"
                />
              </v-col>
              <v-col cols="1">
                <v-btn
                  @click="
                    update_shortcut(
                      'datasource.' + arg.name,
                      arg.description || arg.name
                    )
                  "
                >
                  <v-icon>mdi-asterisk</v-icon> 快捷
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </div>
      </div>
      <div id="pipeline">
        <h2>处理流程</h2>
        <Pipeline
          v-model="task.pipeline"
          @shortcut="update_shortcut"
          :map_id="'pipeline'"
          @validation="update_valid('pipeline_main', $event)"
        />
      </div>

      <div id="shortcut_map">
        <h2>快捷参数</h2>
        <div class="mui-panel">
          <div v-for="(v, k) in task.shortcut_map" :key="k">
            <ParamInput
              :arg="{ name: k, type: 'str', default: '\'\'' }"
              v-model="task.shortcut_map[k]"
            />
          </div>
        </div>
      </div>
    </v-card-text>
    <v-card-actions>
        <v-btn
          @click="save().then(() => notify('保存成功'))"
          class="ml-5"
          color="primary"
        >
          <v-icon>mdi-check</v-icon> 保存
        </v-btn>
        <v-btn class="ml-3" color="error" @click="delete_task()">
          <v-icon>mdi-delete</v-icon> 删除
        </v-btn>
        <v-btn class="ml-3" @click="show_code = !show_code">
          <v-icon>mdi-code-braces</v-icon>
        </v-btn>
    </v-card-actions>
      <v-row class="ma-10">
        <v-textarea
          v-show="show_code"
          :value="querify(task)"
          readonly
        ></v-textarea>
      </v-row>
  </v-card>
</template>


<script>
import api from "../api";
import ParamInput from "./ParamInput.vue";
import Pipeline from "./Pipeline";

export default {
  name: "TaskDetail",
  components: {
    Pipeline,
    ParamInput,
  },
  props: ["id"],
  data() {
    return {
      datasources: {},
      task: {
        _id: "",
        datasource: "",
        datasource_config: {},
        name: "",
        shortcut_map: {},
        pipeline: [],
      },
      valid: [],
      show_code: false,
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
    datasource_items() {
      function _items(obj) {
        var items = [];
        for (var k in obj) {
          let x = obj[k];
          items.push({
            text: `${x.doc.split("\n")[0]} ${x.name}`,
            value: `${x.name}`,
          });
        }
        return items;
      }
      var items = [];
      for (var group in this.datasources) {
        items.push(
          {
            header: group,
          },
          ..._items(this.datasources[group])
        );
      }
      return items;
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
          this.$router.push("/tasks").catch(() => {});
        }
      });
    },
    save() {
      if (this.valid.length > 0) {
        alert("有错误的输入值，请检查");
        return;
      }
      for (var k in this.task.shortcut_map) {
        if (
          this.task.shortcut_map[k] === "" ||
          this.task.shortcut_map[k] === null
        )
          delete this.task.shortcut_map[k];
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
      this.save().then((id) =>
        api.put("queue/", { id }).then((data) => {
          this.notify(data.result + " 已成功加入后台处理队列。");
        })
      );
    },
    update_shortcut(shortcut_name, shortcut_description) {
      this.task.shortcut_map[shortcut_name] =
        shortcut_description || shortcut_name.split(".").slice(-1)[0];
      this.$forceUpdate();
    },
    querify() {
      return (
        "datasource=" +
        api.querify([[this.task.datasource, this.task.datasource_config]]) +
        ";\n" +
        api.querify(this.task.pipeline, "")
      );
    },
  },
};
</script>