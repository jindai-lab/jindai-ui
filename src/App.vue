<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app v-if="!viewer">
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
            v-for="s in shortcuts || [{ _id: '', name: $t('quick-task') }]"
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
          <v-list-item
            link
            @click="
              log_out();
              $router.push('/login');
            "
          >
            <v-list-item-title>{{ $t("log-out") }}</v-list-item-title>
          </v-list-item>
        </v-list-group>

        <v-list-group>
          <template v-slot:activator>
            <v-list-item-title>{{ $t("admin") }}</v-list-item-title>
          </template>

          <v-list-item
            v-for="item in [
              ['schedule', 'scheduler'],
              ['file-storage', 'storage'],
              ['dataset', 'datasets'],
              ['console', 'dbconsole'],
              ['permissions', 'users'],
              ['auto-tagging', 'autotags'],
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

    <v-app-bar app color="primary" dark v-if="!viewer">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ app_title }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <queue-view :data="queue"></queue-view>
    </v-app-bar>

    <v-main>
      <v-progress-linear
        indeterminate
        :style="{ opacity: loading ? 1 : 0, 'z-index': 5 }"
        app
        fixed
      ></v-progress-linear>

      <div :id="viewer ? 'viewer' : 'content-wrapper'">
        <keep-alive :include="['SearchForm', 'ResultsView', 'DbConsole']">
          <router-view @logined="$emit('logined')" :key="$route.fullPath" />
        </keep-alive>
      </div>

      <div style="height: 40px"></div>

      <template v-if="!viewer">
        <v-card flat v-show="console_outputs.length > 0" ref="console">
          <v-btn
            small
            left
            bottom
            text
            class="ma-3"
            @click="console_outputs = []"
            ><v-icon>mdi-delete</v-icon>{{ $t("clear") }}</v-btn
          >
          <div class="console">
            <div
              v-for="(line, index) in console_outputs.slice(0, 50)"
              :key="index"
            >
              {{ line }}
            </div>
          </div>
        </v-card>

        <v-footer id="footer">
          <div class="language mr-5">
            <v-select
              dense
              flat
              single-line
              prepend-icon="mdi-web"
              v-model="ui_language"
              :items="
                Object.entries($i18n.messages).map((pair) => ({
                  value: pair[0],
                  text: pair[1]._lang,
                }))
              "
              :style="{
                width: '150px',
              }"
            ></v-select>
          </div>
          <div class="powered-by">
            Powered by Jindai &copy; 2018-{{ new Date().getFullYear() }} zhuth
            &amp; contributors
          </div>
          <div v-html="copyright"></div>
        </v-footer>
      </template>
    </v-main>

    <v-snackbar
      v-model="sb.visible"
      v-for="(sb, index) in snackbars"
      :key="`sb${index}`"
    >
      {{ sb.text }}
      <template v-slot:action="">
        <v-btn color="primary" text @click="snackbars.splice(index, 1)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script>
import api from "./api";
import QueueView from "./components/QueueView.vue";
import { setup } from "./locales";

export default {
  name: "app",
  components: {
    QueueView,
  },
  data() {
    return {
      drawer: true,
      loading: false,
      queue: {
        finished: [],
        waiting: 0,
        running: [],
      },
      logs: {},
      admin: false,
      shortcuts: [],
      snackbars: [],
      console_outputs: [],
      app_title: "Jindai",
      app_dark: false,
      copyright: "",
      ui_language: "",
    };
  },
  watch: {
    app_dark(val) {
      this.$vuetify.theme.dark = !!val;
    },
    app_title(val) {
      document.title = val;
    },
    ui_language(val) {
      setup(val);
      api.locale = val;
    },
  },
  created() {
    this.ui_language = this.$i18n.locale;
    api.bus
      .$on("loading", (loading_num) => (this.loading = loading_num > 0))
      .$on("alert", (bundle) => {
        const message = bundle.title
          ? `${bundle.title}\n${bundle.text || ""}`.trim()
          : bundle;
        this.snackbars = this.snackbars
          .filter((x) => x.visible)
          .concat([
            {
              text:
                typeof this.$i18n.messages.chs[message] !== "undefined"
                  ? this.$t(message)
                  : message,
              visible: true,
            },
          ]);
      })
      .$on("finish", (key) => {
        if (this.logs[key]) delete this.logs[key];
      });
    this.$on("logined", () => {
      api
        .logined()
        .then((data) => (this.admin = data.result.roles.indexOf("admin") >= 0))
        .then(() => {
          api
            .call("tasks/shortcuts")
            .then((data) => (this.shortcuts = data.result));
          if (!this.viewer) {
            this.queue_event();
          }
        })
        .catch(() => (localStorage.token = ""));
    });
  },
  mounted() {
    api.call("meta").then((data) => {
      Object.assign(this, data.result);
    });
    this.$emit("logined");
  },
  computed: {
    viewer() {
      return location.href.indexOf("/view/") > 0;
    },
  },
  methods: {
    nav_click(e) {
      this.$router.push(e.target.getAttribute("to")).catch(() => {});
    },
    log_out() {
      api.log_out();
    },
    update_queue(queue) {
      if (!queue || !queue.running) return;
      this.queue = queue;
    },
    queue_event() {
      api.queue().then((queue) => this.update_queue(queue));
      var source = new EventSource("/api/queue/events");
      source.onmessage = (event) => {
        var data = JSON.parse(event.data);
        if (data.log) {
          this.console_outputs.splice(0, 0, data.log);
          if (this.console_outputs.length > 100)
            this.console_outputs.splice(50, this.console_outputs.length - 50);
        } else this.update_queue(data);
      };
      source.onerror = () => setTimeout(() => this.queue_event(), 5000);
    },
  },
  sse: {
    cleanup: true,
  },
};
</script>

<style>
em {
  background-color: yellow;
  font-style: normal;
  color: black;
}

.console {
  height: 200px;
  overflow-y: auto;
  font-size: 12px;
}

.chip {
  border-radius: 20px;
  min-width: 30px;
  max-width: 120px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  text-align: center;
  background: #eee;
  color: #333 !important;
  text-decoration: none !important;
  padding: 4px;
  margin-top: 4px;
  display: inline-block;
  white-space: nowrap;
  vertical-align: middle;
}

.pointer {
  cursor: pointer;
}
</style>
