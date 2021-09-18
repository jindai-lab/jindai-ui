<template>
  <div class="stage">
    <div class="mui-select">
    <treeselect
      :options="stage_options"
      :disable-branch-nodes="true"
      :flatten-search-results="true"
      v-model="value[0]"
      @change="update_input"
    />
    </div>
    <blockquote>
      {{ stage_doc.doc }}
    </blockquote>
    <div class="stage-arg">
      <div v-for="arg in stage_doc.args" :key="arg.name">
        <div v-if="arg.type !== 'pipeline'">
          <div class="mui-row">
            <div class="mui-col-md-10">
              <ParamInput :arg="arg" v-model="value[1][arg.name]" @validation="update_valid('stage_' + arg.name, $event)" />
            </div>
            <div class="mui-col-md-1">
              <button @click="update_shortcut(map_id + '.' + arg.name, arg.description || arg.name)" class="mui-btn">
                <font-awesome-icon icon="asterisk"></font-awesome-icon> 快捷
              </button>
            </div>
          </div>
          <blockquote>{{ arg.description }}</blockquote>
        </div>
        <div class="mui-textfield" v-else>
          <label>{{ arg.name }}</label>
          <blockquote>{{ arg.description }}</blockquote>
          <Pipeline v-model="value[1][arg.name]" :map_id="map_id + '.' + arg.name" @validation="update_valid('pipeline_' + arg.name, $event)" @shortcut="update_shortcut" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ParamInput from "./ParamInput"
import Pipeline from './Pipeline'

export default {
  name: 'StageDetail',
  inheritAttrs: false,
  props: ["stages", "value", "map_id"],
  components: { ParamInput, Pipeline },
  events: ["validation"],
  data () {
    return { valid: [], shortcut: {} }
  },
  methods: {
    update_input() {
      this.$emit("input", this.value);
    },
    update_shortcut(map_name, map_description) {
      this.$emit("shortcut", map_name, map_description);
    },
    update_valid(name, valid) {
      var l = this.valid.indexOf(name)
      if (l >= 0)
        this.valid.splice(l, 1)
      if (!valid)
        this.valid.push(name)
      this.$emit("validation", this.valid.length == 0)
    }
  },
  computed: {
    stage_doc () {
      for (var x in this.stages) 
        if (this.stages[x][this.value[0]])
          return this.stages[x][this.value[0]]
      return {}
    },
    stage_options () {
      var opts = []
      for (var group in this.stages) {
        var children = []
        for (var stname in this.stages[group]) {
          const s = this.stages[group][stname]
          children.push({
            id: stname,
            label: stname + ' ' + s.doc.split('\n')[0]
          })
        }
        opts.push({
          id: 'group:' + group,
          label: group,
          children: children.sort((a, b) => a.label.localeCompare(b.label))
        })
      }
      return opts
    }
  },
  watch: {
    value () {
      this.update_input()
    }
  }
};
</script>
