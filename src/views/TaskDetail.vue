<template>
  <div>
    <v-card flat>
      <v-card-text>
        <ParamInput v-model="task.name" :arg="{ name: $t('name'), type: '' }" />
        <span
          >ID: {{ task._id }} {{ $t("created-by") }}: {{ task.creator }}</span
        >
        <v-row>
          <v-col>
            <v-checkbox
              class="d-inline-block"
              :label="$t('shared')"
              v-model="task.shared"
              :disabled="task.creator !== user"
            ></v-checkbox>
            <v-checkbox
              class="d-inline-block ml-5"
              :label="$t('resume-next')"
              v-model="task.resume_next"
            ></v-checkbox>
            <v-text-field
              class="d-inline-block ml-5"
              :label="$t('concurrent')"
              v-model="task.concurrent"
              type="number"
              :rules="[
                (v) =>
                  (v >= 1 && v <= 10 && v == parseInt(v)) || $t('number-1-10'),
              ]"
              @input="(v) => (task.concurrent = parseInt(v))"
            >
            </v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-btn color="primary" @click="enqueue">
              <v-icon>mdi-play</v-icon> {{ $t("run-background") }}
            </v-btn></v-col
          ></v-row
        >
        <v-divider class="mt-5 mb-5"></v-divider>
        <div id="pipeline">
          <h2>
            {{ $t("pipeline") }}
              <v-btn class="ml-3" @click="show_code = !show_code; if (show_code) querify(); else parse();" :color="show_code ? 'secondary' : ''">
                <v-icon>mdi-code-braces</v-icon>
              </v-btn>
          </h2>
          <Pipeline
            v-show="!show_code"
            v-model="task.pipeline"
            @shortcut="update_shortcut"
            :map_id="'pipeline'"
            @validation="update_valid('pipeline_main', $event)"
            style="margin-left: 0 !important"
          />
          <ParamInput
            v-model="code"
            v-show="show_code"
            :arg="{name: '', type: 'QUERY'}"
            ref="code"
            class="mb-10 mt-10"
          />
        </div>

        <div id="shortcut_map">
          <h2>{{ $t("shortcut-params") }}</h2>
          <div>
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
          @click="save().then(() => notify($t('saved')))"
          class="ml-5"
          color="primary"
        >
          <v-icon>mdi-check</v-icon> {{ $t("save") }}
        </v-btn>
        <v-btn class="ml-3" color="error" @click="delete_task()">
          <v-icon>mdi-delete</v-icon> {{ $t("delete") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>


<script>
import dialogs from "../dialogs"
import ParamInput from "../components/ParamInput.vue";
import Pipeline from "../components/Pipeline";

export default {
  name: "TaskDetail",
  components: {
    Pipeline,
    ParamInput,
  },
  props: ["id"],
  data() {
    return {
      task: {
        _id: "",
        name: "",
        shortcut_map: {},
        pipeline: [],
      },
      show_code: false,
      pipelines: this.business.pipelines,
      valid: [],
      code: '',
      tasks: [],
    };
  },
  async mounted() {
    this.task = await this.business.tasks({id: this.id})
    this.tasks = await this.business.tasks()
  },
  computed: {
    user() {
      return this.api.user;
    },
  },
  methods: {
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
    },
    delete_task() {
      dialogs.confirm({title: this.$t("confirm-delete")}).then(() => {
        this.api.delete("tasks/" + this.task._id).then((data) => {
          if (data.success) {
            this.$notify(this.$t("deleted"));
            this.$router.push("/tasks").catch(() => {});
          }
        });
      });
    },
    save() {
      if (this.valid.length > 0) {
        alert(this.$t("invalid-input"));
        return;
      }
      for (var k in this.task.shortcut_map) {
        if (
          this.task.shortcut_map[k] === "" ||
          this.task.shortcut_map[k] === null
        )
          delete this.task.shortcut_map[k];
      }
      return this.business.tasks({update: this.task}).then((data) => {
        var id = this.task._id;
        this.task = data;
        this.task._id = id;
        return id;
      });
    },
    enqueue() {
      this.save().then((id) =>
        this.api.put("queue/", { id }).then((data) => {
          this.$notify(this.$t("task-enqueued", { task: data }));
        })
      );
    },
    update_shortcut(shortcut_name, shortcut_description) {
      this.task.shortcut_map[shortcut_name] =
        shortcut_description || shortcut_name.split(".").slice(-1)[0];
      this.$forceUpdate();
    },
    querify() {
      var code = '', indent = ''
      for (var line of this.api.querify(this.task.pipeline).split('\n')) {
        line = line.trim()
        if (line.match(/^\}.*\{$/)) {
          indent = indent.substring(0, indent.length-2)
          code += indent + line + '\n'
          indent += '  ';
        } else if (line.startsWith('}')) {
          indent = indent.substring(0, indent.length-2)
          code += indent + line + '\n'
        } else if (line.endsWith('{')) {
          code += indent + line + '\n'
          indent += '  ';
        } else {
          code += indent + line + '\n'
        }
      }
      this.code = code
    },
    async parse() {
      var result = await this.business.qx(this.code)
      console.log(result)
      this.task.pipeline = result
    }
  },
};
</script>