<template>
  <div class="ml-10">
    <v-btn @click="append_stage()" class="mb-5 mt-5">
      <v-icon>mdi-plus</v-icon>
    </v-btn>
    <draggable handle=".drag-handle" :list="value">
    <div
      v-for="(stage, index) in value"
      :key="index"
      class="stage-opers">
      <StageDetail
        :stages="stages"
        :map_id="map_id + '.' + index"
        v-model="value[index]"
        @validation="update_valid(map_id + '.' + index, $event)"
        @shortcut="e => $emit('shortcut', e)"
      />
      <div class="opers">
        <v-btn icon @click="remove_stage(index)" >
          <v-icon>mdi-delete</v-icon>
        </v-btn>
        <v-btn icon
          @click="move_stage(index, -1)"
          v-show="index > 0"
          
        >
          <v-icon>mdi-arrow-up</v-icon>
        </v-btn>
        <v-btn
          @click="move_stage(index, 1)"
          v-show="index < value.length - 1"
          icon
        >
          <v-icon>mdi-arrow-down</v-icon>
        </v-btn>
        <v-btn icon @click="append_stage(index+1)" >
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </div>
        <v-divider class="mb-5"></v-divider>
    </div>
    </draggable>
  </div>
</template>

<script>
import draggable from 'vuedraggable'

export default {
  name: "Pipeline",
  components: {
    StageDetail: () => import('./StageDetail.vue'),
    draggable
  },
  data() {
    return {
        stages: this.business.pipelines,
        show_code: false,
        valid: [],
        shortcut: {}
    }
  },
  props: ["value", "map_id"],
  watch: {
    value(val) {
      if (!val)
        this.$emit('input', [])
    }
  },
  methods: {
    update_valid(name, valid) {
      var l = this.valid.indexOf(name);
      if (l >= 0) this.valid.splice(l, 1);
      if (!valid) this.valid.push(name);
      this.$emit("validation", this.valid.length == 0)
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