<template>
  <div class="stage">
    <div class="mui-select">
    <select v-model="value[0]" @change="update_stage_doc">
      <optgroup v-for="(sts, group) in stages" :key="group" :label="group">
        <option v-for="st in sts" :key="st" :value="st">
          {{ st }}
        </option>
      </optgroup>
    </select>
    </div>
    <blockquote>
      {{ stage_doc.doc }}
    </blockquote>
    <div class="stage-arg">
      <div v-for="arg in stage_doc.args" :key="arg.name">
        <ParamInput :arg="arg" v-model="value[1][arg.name]" />
        <blockquote>{{ arg.description }}</blockquote>
      </div>
    </div>
  </div>
</template>

<script>
import api from "../api";
import ParamInput from "./ParamInput";

export default {
  inheritAttrs: false,
  props: ["stages", "value"],
  components: { ParamInput },
  methods: {
    update_stage_doc() {
      api
        .call("pipelines/" + this.value[0])
        .then((resp) => (this.stage_doc = resp.data.result));
      this.update_input();
    },
    update_input() {
      this.$emit("input", this.value);
    },
  },
  mounted() {
    this.update_stage_doc();
  },
  data() {
    return {
      stage_doc: {},
    };
  },
  watch: {
    value () {
      this.update_stage_doc()
    }
  }
};
</script>
