<template>
  <div class="stage">
    <div class="mui-select">
    <select v-model="value[0]" @change="update_input">
      <optgroup v-for="(sts, group) in stages" :key="group" :label="group">
        <option v-for="st in sts" :key="st.name" :value="st.name">
          {{ st.name }} {{ st.doc }}
        </option>
      </optgroup>
    </select>
    </div>
    <blockquote>
      {{ stage_doc.doc }}
    </blockquote>
    <div class="stage-arg">
      <div v-for="arg in stage_doc.args" :key="arg.name">
        <div v-if="arg.type !== 'pipeline'">
          <ParamInput :arg="arg" v-model="value[1][arg.name]" @validation="update_valid('stage_' + arg.name, $event)" />
          <blockquote>{{ arg.description }}</blockquote>
        </div>
        <div class="mui-textfield" v-else>
          <label>{{ arg.name }}</label>
          <blockquote>{{ arg.description }}</blockquote>
          <Pipeline v-model="value[1][arg.name]" />
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
  props: ["stages", "value"],
  components: { ParamInput, Pipeline },
  events: ["validation"],
  data () {
    return { valid: [] }
  },
  methods: {
    update_input() {
      this.$emit("input", this.value);
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
    }
  },
  watch: {
    value () {
      this.update_input()
    }
  }
};
</script>
