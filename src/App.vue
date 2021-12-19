<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app v-if="!viewer">
      <v-list nav>
        <v-list-group :value="true">
          <template v-slot:activator>
            <v-list-item-title>文献</v-list-item-title>
          </template>
          <v-list-item link @click="$router.push('/')">
            <v-list-item-title>搜索</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="$router.push('/tasks')">
            <v-list-item-title>工作流</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="$router.push('/gallery')">
            <v-list-item-title>图集</v-list-item-title>
          </v-list-item>
        </v-list-group>

        <v-list-group v-show="shortcuts.length > 0">
          <template v-slot:activator>
            <v-list-item-title>快捷方式</v-list-item-title>
          </template>
          <v-list-item
            link
            v-for="s in shortcuts || [{ _id: '', name: '快捷方式' }]"
            :key="s._id"
            @click="$router.push('/tasks/shortcut/' + s._id)"
          >
            <v-list-item-title>{{ s.name }}</v-list-item-title>
          </v-list-item>
        </v-list-group>

        <v-list-group>
          <template v-slot:activator>
            <v-list-item-title>用户</v-list-item-title>
          </template>
          <v-list-item link @click="$router.push('/security')">
            <v-list-item-title>账户</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="$router.push('/history')">
            <v-list-item-title>历史</v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="
              log_out();
              $router.push('/login');
            "
          >
            <v-list-item-title>登出</v-list-item-title>
          </v-list-item>
        </v-list-group>

        <v-list-group>
          <template v-slot:activator>
            <v-list-item-title>管理</v-list-item-title>
          </template>
          <v-list-item link @click="$router.push('/storage')">
            <v-list-item-title>文件</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="$router.push('/collections')">
            <v-list-item-title>数据集</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="$router.push('/dbconsole')">
            <v-list-item-title>控制台</v-list-item-title>
          </v-list-item>
          <v-list-item link @click="$router.push('/users')">
            <v-list-item-title>权限</v-list-item-title>
          </v-list-item>
        </v-list-group>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app color="primary" dark v-if="!viewer">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ app_title }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <queue-view :data="queue" @updated="queue = $event"></queue-view>
    </v-app-bar>

    <v-main>
      <v-progress-linear
        indeterminate
        :style="{opacity: loading ? 1 : 0}"
        app
      ></v-progress-linear>
      <div :id="viewer ? 'viewer' : 'content-wrapper'">
        <keep-alive
          :include="['SearchForm', 'ResultsView', 'DbConsole', 'Gallery']"
        >
          <router-view @logined="$emit('logined')" :key="$route.fullPath" />
        </keep-alive>
      </div>

      <div style="height: 40px"></div>

      <v-card flat v-show="console_outputs.length > 0" ref="console">
        <v-btn small left bottom text class="ma-3" @click="console_outputs = []"
          ><v-icon>mdi-delete</v-icon> 清除</v-btn
        >
        <div class="console">
          <div v-for="(line, index) in console_outputs.slice(0, 50)" :key="index">
            {{ line }}
          </div>
        </div>
      </v-card>

      <v-footer :id="viewer ? '' : 'footer'">
        Powered by Jindai &copy; 2018-{{ new Date().getFullYear() }} zhuth &amp;
        contributors
      </v-footer>
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
import QueueView from "./components/QueueView";

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
    };
  },
  watch: {
    app_dark(val) {
      this.$vuetify.theme.dark = !!val;
    },
    app_title(val) {
      document.title = val;
    },
  },
  created() {
    api.bus
      .$on("loading", (loading_num) => (this.loading = loading_num > 0))
      .$on("console", (data) => {
        this.console_outputs.splice(0, 0, ...data.content.filter(x => x.trim()).map(x => `${data.key}|${x}`).reverse());
        if (this.console_outputs.length > 100) this.console_outputs.splice(50, this.console_outputs.length-50);
      })
      .$on("alert", (bundle) => {
        const message = bundle.title
          ? `${bundle.title}\n${bundle.text || ""}`.trim()
          : bundle;
        this.snackbars = this.snackbars
          .filter((x) => x.visible)
          .concat([
            {
              text: message,
              visible: true,
            },
          ]);
      })
      .$on("finish", (key) => {
        this.update_queue().then(() => { 
          if (this.logs[key]) delete this.logs[key]
        });
      });
    this.$on("logined", () => {
      this.update_queue()
      api
        .logined()
        .then((data) => (this.admin = data.result.roles.indexOf("admin") >= 0))
        .then(() => {
          api
            .call("tasks/shortcuts")
            .then((data) => (this.shortcuts = data.result));
          if (!this.viewer) setInterval(this.update_queue, 10000);
        })
        .catch(() => (localStorage.token = ""));
    });
  },
  mounted() {
    api.call("meta").then((data) => {
      Object.assign(this, data.result);
    });
    this.$emit("logined");

    if (this.viewer) return;
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
    log_out: api.log_out,
    update_queue() {
      return api.queue().then((queue) => {
        if (!queue) return;
        this.queue = queue;
        this.queue.running.forEach((k) => {
          if (!this.logs[k]) {
            api.fetch_logs(k);
            this.logs[k] = true;
          }
        });
      });
    },
  },
};
</script>

<style>
.fs22 {
  font-size: 22px;
}

#viewer {
  max-width: 80%;
  margin: 0 auto;
}

em {
  background-color: yellow;
  font-style: normal;
}

.toplogo {
  text-align: center;
}

.console {
  height: 200px;
  overflow-y: auto;
  font-size: 12px;
}
</style>
