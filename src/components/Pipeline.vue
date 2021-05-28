<template>
  <div>
    <button @click="append_stage()" class="mui-btn">
      <font-awesome-icon icon="plus" />
    </button>
    <button @click="show_code = !show_code" class="mui-btn">
      <font-awesome-icon icon="code" />
    </button>
    <div
      v-for="(stage, index) in value"
      :key="index"
      class="stage-opers mui-panel"
    >
      <StageDetail
        :stages="stages"
        v-model="value[index]"
        @validation="update_valid('stage_' + index, $event)"
      />
      <div class="opers">
        <button @click="remove_stage(index)" class="mui-btn">
          <font-awesome-icon icon="trash" />
        </button>
        <button
          @click="move_stage(index, -1)"
          v-show="index > 0"
          class="mui-btn"
        >
          <font-awesome-icon icon="arrow-up" />
        </button>
        <button
          @click="move_stage(index, 1)"
          v-show="index < value.length - 1"
          class="mui-btn"
        >
          <font-awesome-icon icon="arrow-down" />
        </button>
      </div>
    </div>
    <pre v-show="show_code">{{ JSON.stringify(value, undefined, 2) }}</pre>
  </div>
</template>

<script>
import api from '../api'

export default {
  name: "Pipeline",
  components: {
    StageDetail: () => import('./StageDetail.vue')
  },
  data() {
    return {
        stages: {},
        show_code: false,
        valid: []
    }
  },
  props: ["value"],
  methods: {
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
      this.$emit("validation", this.valid.length == 0)
    },
    append_stage() {
        this.value.push(["Passthrough", {}]);
    },
    remove_stage(current) {
        this.value.splice(current, 1);
    },
    move_stage(current, inc) {
        var st = this.value[current];
        this.value.splice(current, 1);
        this.value.splice(current + inc, 0, st);
    }
  },
  mounted () {
    api.call("help/pipelines").then((data) => {
      this.stages = data.result;
    });
    if (!Array.isArray(this.value))
        this.$emit("input", []);
  }
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