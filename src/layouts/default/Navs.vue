<template>
  <v-navigation-drawer
    v-bind="value"
    @input="$emit('input', $event)"
    app
    v-if="enabled"
    disable-resize-watcher
  >
    <v-list nav>
      <v-list-item link @click="$router.push('/')">
        <v-list-item-title>{{ $t("search") }}</v-list-item-title>
      </v-list-item>
      <v-list-group>
        <template v-slot:activator>
          <v-list-item-title>{{ $t("tasks") }}</v-list-item-title>
        </template>
        <v-list-item link @click="$router.push('/tasks')">
          <v-list-item-title>{{ $t("all") }}</v-list-item-title>
        </v-list-item>
        <v-list-item
          link
          v-for="s in taskShortcuts || [{ _id: '', name: $t('quick-task') }]"
          :key="s._id"
          @click="$router.push('/tasks/shortcut/' + s._id)"
        >
          <v-list-item-title>{{ s.name }}</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-list-group>
        <template v-slot:activator>
          <v-list-item-title>{{ $t("user") }}</v-list-item-title>
        </template>
        <v-list-item
          v-for="item in [
            ['preferences', 'preferences'],
            ['history', 'history'],
          ]"
          :key="item[0]"
          link
          @click="$router.push(`/${item[1]}`)"
        >
          <v-list-item-title>{{ $t(item[0]) }}</v-list-item-title>
        </v-list-item>
        <v-list-item link @click="emit('logout')">
          <v-list-item-title>{{ $t("log-out") }}</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-list-group v-show="admin">
        <template v-slot:activator>
          <v-list-item-title>{{ $t("admin") }}</v-list-item-title>
        </template>

        <v-list-item
          v-for="item in [
            ['file-storage', 'storage'],
            ['dataset', 'datasets'],
            ['console', 'dbconsole'],
            ['system-admin', 'admin'],
            ['auto-tagging', 'autotags'],
            ['shortcuts', 'shortcuts'],
          ]"
          :key="item[0]"
          link
          @click="$router.push(`/${item[1]}`)"
        >
          <v-list-item-title>{{ $t(item[0]) }}</v-list-item-title>
        </v-list-item>
      </v-list-group>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import remoteConfig from "@/api/remoteConfig";
const props = defineProps({
  enabled: Boolean,
  value: Boolean,
  admin: Boolean,
});

const emit = defineEmits(["logout", "input"]);

await remoteConfig.wait();
let taskShortcuts = remoteConfig.taskShortcuts;
</script>
