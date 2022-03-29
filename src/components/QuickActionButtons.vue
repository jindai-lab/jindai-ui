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

    <v-btn fab small @dblclick="$emit('delete')">
      <v-icon>mdi-delete</v-icon>
    </v-btn>
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