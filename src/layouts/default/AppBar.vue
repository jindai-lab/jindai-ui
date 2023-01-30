<template>
  <v-app-bar flat>
    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon @click="$emit('input', !value)"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ remoteConfig.meta.app_title }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <queue-view :data="queue"></queue-view>
    </v-app-bar>
  </v-app-bar>
</template>

<script lang="ts" setup>
import {QueueJob} from "@/api/dbo"
import remoteConfig from "@/api/remoteConfig";

defineProps({
  value: Boolean,
  queue: Array<QueueJob>
})

defineEmits([
  'input'
])
</script>
