<template>
  <div>
    <a
      link
      style="color: white; text-decoration: none"
      @click="show_detail = true"
    >
      <v-badge
        :value="data.finished.length > 0"
        :content="data.finished.length"
        color="green"
      >
        {{ $t("finished") }}
      </v-badge>
      <v-badge
        class="ml-5 mr-5"
        :value="data.waiting.length > 0"
        :content="data.waiting.length"
      >
        {{ $t("waiting") }}
      </v-badge>
      <v-badge
        color="orange"
        :value="data.running.length > 0"
        :content="data.running.length"
      >
        {{ $t("running") }}
      </v-badge>
    </a>
    <v-dialog v-model="show_detail" width="80%">
      <v-card>
        <v-card-title
          >{{ $t("finished-tasks") }}
          <v-spacer></v-spacer>
          <v-btn icon @click="clear_not_viewable">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <v-btn icon @click="show_detail = false"
            ><v-icon>mdi-close</v-icon></v-btn
          >
        </v-card-title>
        <v-card-text v-if="data.finished.length > 0">
          <div v-for="task in data.finished" :key="task.key">
            <h4>{{ task.name }}</h4>
            <span>{{ task.key }}</span>
            {{ $t("run-at") }}: {{ task.queued_at }}<br />
            <v-btn
              :href="download_link(task)"
              v-if="downloadable(task)"
              target="_blank"
            >
              <v-icon>mdi-download</v-icon>
            </v-btn>
            <v-btn
              class="ml-3"
              @click="view_result(task)"
              v-if="viewable(task)"
            >
              <v-icon>mdi-eye</v-icon>
            </v-btn>
            <v-btn class="ml-3" @click="delete_result(task)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
            <v-btn class="ml-3" @click="view_log(task)">
              <v-icon>mdi-comment-outline</v-icon>
            </v-btn>
            <v-divider class="mt-5"></v-divider>
          </div>
        </v-card-text>
        <v-card-text v-else>{{ $t("no-available") }}</v-card-text>
        <v-card-title>{{ $t("running-tasks") }}</v-card-title>
        <v-card-text>
          <div v-for="task in data.running" :key="task.key" class="mb-5">
            <span>{{ task.key }}</span>
            {{ $t("run-at") }}: {{ task.queued_at }}<br />
            <v-btn @click="delete_result(task)"
              ><v-icon>mdi-stop</v-icon></v-btn
            >
          </div>
        </v-card-text>
        <v-card-title>{{ $t("waiting-tasks") }}</v-card-title>
        <v-card-text>
          <div v-for="task in data.waiting" :key="task.key" class="mb-5">
            <span>{{ task.key }}</span>
            {{ $t("run-at") }}: {{ task.queued_at }}<br />
            <v-btn @click="delete_result(task)"
              ><v-icon>mdi-stop</v-icon></v-btn
            >
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">

import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      show_detail: false,
    };
  },
  props: ["data"],
  methods: {
    download_link(task) {
      return "/api/queue/" + encodeURIComponent(task.key);
    },
    delete_result(task) {
      var id = encodeURIComponent(task.key);
      this.api.delete("queue/" + id).then(() => {
        notify(this.$t('deleted'));
        this.$emit("updated", {});
      });
    },
    clear_not_viewable() {
      for (var task of this.data.finished) {
        var id = encodeURIComponent(task.key);
        this.api.delete("queue/" + id).then(() => {
          this.$emit("updated", {});
        });
      }
    },
    view_result(task) {
      var id = encodeURIComponent(task.key);
      this.$router.push("/results/" + id).catch(() => {});
      this.show_detail = false;
    },
    downloadable(task) {
      switch (task.result_type) {
        case "list":
        case "dict":
        case "file":
          return true;
        default:
          return false;
      }
    },
    viewable(task) {
      switch (task.result_type) {
        case "list":
        case "redirect":
        case "exception":
          return true;
        default:
          return false;
      }
    },
    view_log(task) {
      var id = encodeURIComponent(task.key);
      this.$router.push("/logs/" + id).catch(() => {});
      this.show_detail = false;
    }
  },
};
</script>

<style scoped>
.click-here > span {
  border-radius: 5px;
  line-height: 100%;
  text-align: center;
  min-width: 14px;
  background-color: green;
  display: inline-block;
}
</style>