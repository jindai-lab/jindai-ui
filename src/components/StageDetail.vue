<template>
  <div class="stage">
    <div class="drag-handle">
      {{ stage_doc.doc }}
      <v-autocomplete
        :items="stage_options"
        :disable-branch-nodes="true"
        :flatten-search-results="true"
        v-model="value[0]"
        @change="update_input"
      ></v-autocomplete>
    </div>
    <blockquote></blockquote>
    <div class="stage-arg">
      <div v-for="arg in stage_doc.args" :key="arg.name">
        <div v-if="arg.type !== 'pipeline'">
          <v-row>
            <v-col>
              <div class="stage-input">
                {{ arg.description.replace("%1", arg.name)
                }}<ParamInput
                  :arg="arg"
                  :map_id="map_id"
                  @shortcut="e => $emit('shortcut', e)"
                  v-model="value[1][arg.name]"
                  @validation="update_valid('stage_' + arg.name, $event)"
                />
              </div>
              <div class="asterisk">
                <v-btn
                  @click="
                    $emit('shortcut', {
                      name: map_id + '.' + arg.name,
                      description: arg.description || arg.name
                    });
                  "
                  icon
                >
                  <v-icon>mdi-asterisk</v-icon>
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </div>
        <div v-else>
          <label>{{ arg.name }}</label>
          {{ arg.description }}
          <Pipeline
            v-model="value[1][arg.name]"
            :map_id="map_id + '.' + arg.name"
            @validation="update_valid('pipeline_' + arg.name, $event)"
            @shortcut="e => $emit('shortcut', e)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ParamInput from "./ParamInput";
import Pipeline from "./Pipeline";

export default {
  name: "StageDetail",
  inheritAttrs: false,
  props: ["value", "map_id"],
  components: { ParamInput, Pipeline },
  events: ["validation"],
  data() {
    return { valid: [], shortcut: {} };
  },
  methods: {
    update_input() {
      this.$emit("input", this.value);
    },
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
      this.$emit("validation", this.valid.length == 0);
    },
  },
  computed: {
    stage_doc() {
      for (var name in this.business.pipelines) {
        let x = this.business.pipelines[name]
        if (x[this.value[0]]) {
          var res = {... x[this.value[0]]};
          res.args = [... res.args, {name: 'disabled', type: 'bool', default: false, description: this.$t('disabled')}]
          return res;
        }
      }
      return {};
    },
    stage_options() {
      var opts = [];
      for (var group in this.business.pipelines) {
        opts.push({ header: group });
        for (var stname in this.business.pipelines[group]) {
          const s = this.business.pipelines[group][stname];
          opts.push({
            value: stname,
            text: stname + " " + s.doc.split("\n")[0],
          });
        }
      }
      return opts;
    },
  },
  watch: {
    value() {
      this.update_input();
    },
  },
};
</script>

<style scoped>
.stage-input {
  width: calc(100% - 60px);
  display: inline-block;
}
.asterisk {
  width: 50px;
  margin-left: 10px;
  display: inline-block;
}
</style>