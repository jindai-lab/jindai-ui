<template>
  <v-app>
    <default-bar v-model="localConfig.drawer" :queue="queue" />
    <suspense>
      <default-navs />
    </suspense>
    <v-main>
      <router-view />
      <event-console @queue="queue = $event"></event-console>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
import DefaultBar from "./AppBar.vue";
import DefaultNavs from "./Navs.vue";
import EventConsole from "@/components/EventConsole.vue";
import localConfig from "@/api/localConfig";
import { QueueJob } from "@/api/dbo";

const queue = [] as QueueJob[];
</script>
