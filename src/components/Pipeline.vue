<template>
  <div>
    <button @click="append_stage()" class="mui-btn">
      <font-awesome-icon icon="plus" />
    </button>
    <div
      v-for="(stage, index) in value"
      :key="index"
      class="stage-opers mui-panel"
    >
      <StageDetail
        :stages="stages"
        :map_id="map_id + '.' + index"
        v-model="value[index]"
        @validation="update_valid(map_id + '.' + index, $event)"
        @shortcut="update_shortcut"
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
        <button @click="append_stage(index+1)" class="mui-btn">
          <font-awesome-icon icon="plus" />
        </button>
      </div>
    </div>
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
        valid: [],
        shortcut: {}
    }
  },
  props: ["value", "map_id"],
  methods: {
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
      this.$emit("validation", this.valid.length == 0)
    },
    update_shortcut(shortcut_name, arg_description) {
      this.$emit("shortcut", shortcut_name, arg_description)
    },
    append_stage(index) {
      if (typeof index === 'undefined')
        this.value.push(["Passthrough", {}]);
      else
        this.value.splice(index, 0, ["Passthrough", {}])
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