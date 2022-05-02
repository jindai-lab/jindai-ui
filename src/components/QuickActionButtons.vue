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

    <v-menu top>
      <template v-slot:activator="{ on, attrs }">
        <v-btn fab small v-bind="attrs" v-on="on">
          <v-icon>mdi-dots-horizontal</v-icon>
        </v-btn>
      </template>

      <v-list class="pointer">
        <v-list-item
          v-for="item in ['play', 'merge', 'split', 'reset-storage', 'task']"
          :key="item"
        >
          <v-list-item-title @click="$emit(item)">{{
            $t(item)
          }}</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-title @click="$emit('delete')">
            <v-icon>mdi-delete</v-icon>
            {{ $t("delete") }}
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
};
</script>

<style scoped>
.fabs {
  position: fixed;
  z-index: 300;
  bottom: 50px;
  right: 10px;
}
.fabs > * {
  margin: 5px;
  clear: both;
  display: block;
}
</style>