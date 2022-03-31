<template>
  <div class="fabs">
    <v-badge
      bordered
      color="green darken-2"
      :content="'' + selection_count"
      :value="selection_count > 0"
      overlap
    >
      <v-btn
        fab
        small
        @click="$emit('toggle-selection')"
        @dblclick="$emit('clear-selection')"
      >
        <v-icon>mdi-select-all</v-icon>
      </v-btn>
    </v-badge>

    <v-btn fab small @click="$emit('tag')">
      <v-icon>mdi-tag</v-icon>
    </v-btn>

    <v-btn fab small @click="$emit('rating')">
      <v-icon>mdi-heart</v-icon>
    </v-btn>

    <v-btn fab small @click="$emit('group')">
      <v-icon>mdi-group</v-icon>
    </v-btn>

    <v-menu>
      <template v-slot:activator="{ on, attrs }">
        <v-btn fab small v-bind="attrs" v-on="on">
          <v-icon>mdi-dots-horizontal</v-icon>
        </v-btn>
      </template>

      <v-list>
        <v-list-item>
          <v-list-item-title @click="update_interval">播放</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-title @click="$emit('merge')">合并</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-title @click="$emit('split')">分离</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-title @click="$emit('delete')">
            删除 
            <!-- <v-icon>mdi-delete</v-icon> -->
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
export default {
  name: "QuickActionButtons",
  props: {
    selection_count: {
      type: Number,
      default: 0,
    },
    playing_interval: {
      default: 1000,
    },
  },
  methods: {
    update_interval() {
      var val = prompt("间隔时间:", this.playing_interval);
      if (val && +val > 0) {
        this.$emit("playing-interval", +val);
        this.$emit("play");
      }
    },
  },
};
</script>

<style scoped>
.fabs {
  position: fixed;
  z-index: 300;
  bottom: 30px;
  right: 30px;
}
.fabs > * {
  margin: 5px;
  clear: both;
  display: block;
}
</style>