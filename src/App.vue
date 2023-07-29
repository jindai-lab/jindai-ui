<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      app
      v-if="!viewer"
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

    <v-app-bar app color="primary" dark v-if="!viewer">
      <v-app-bar-nav-icon
        @click="drawer = !drawer"
      ></v-app-bar-nav-icon>
      <v-toolbar-title>{{ api.meta.app_title }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <queue-view :data="queue"></queue-view>
    </v-app-bar>

    <v-main>
      <v-progress-linear
        indeterminate
        id="loadingBar"
        style="
           {
            opacity: 0;
          }
        "
        app
        fixed
      ></v-progress-linear>

      <div :id="viewer ? 'viewer' : 'content-wrapper'">
        <keep-alive :include="['SearchForm', 'ResultsView', 'DbConsole']">
          <router-view :key="$route.fullPath" />
        </keep-alive>
      </div>

      <div style="height: 40px"></div>

      <template v-if="!viewer">
        <event-console
          @queue="update_queue"
          :enabled="!this.viewer"
        ></event-console>
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
          <div v-html="api.meta.copyright"></div>
        </v-footer>
      </template>
    </v-main>
  </v-app>
</template>

<script>
import EventConsole from "./components/EventConsole.vue";
import QueueView from "./components/QueueView.vue";
import { setup } from "./locales";

export default {
  name: "app",
  components: {
    QueueView,
    EventConsole,
  },
  data() {
    return {
      loading: false,
      queue: {
        finished: [],
        waiting: 0,
        running: [],
      },
      logs: {},
      drawer: false,
      admin: false,
      shortcuts: [],
      ui_language: "",
      login_finished: false,
    };
  },
  watch: {
    ui_language(val) {
      setup(val);
      this.api.locale = val;
      this.$vuetify.lang.current = { zhs: "zhHans", zht: "zhHant" }[val] || val;
    },
  },
  created() {
    this.ui_language = this.$i18n.locale;
  },
  mounted() {
    this.drawer = this.api.config.drawer
    this.api.get_meta().then((meta) => {
      this.$vuetify.theme.dark = !!meta.app_dark;
      document.title = meta.app_title
    });
    this.api
      .authenticate()
      .then((data) => (this.admin = data.roles.indexOf("admin") >= 0))
      .then(async () => {
        this.login_finished = true;
        this.shortcuts = await this.business.get_shortcuts()
      });
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
      this.api.log_out();
    },
    update_queue(queue) {
      if (!queue) return;
      this.queue = {
        finished: queue.filter((x) => x.status == "stopped"),
        running: queue.filter((x) => x.status == "running"),
        waiting: queue.filter((x) => x.status == "pending"),
      };
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
