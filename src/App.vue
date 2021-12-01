<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app v-if="!viewer">
      <v-list nav>
        <v-list-group :value="true">
          <template v-slot:activator>
            <v-list-item-title>文献</v-list-item-title>
          </template>
          <v-list-item link @click="$router.push('/')">
            <v-list-item-title
              >搜索</v-list-item-title
            >
          </v-list-item>
          <v-list-item link @click="$router.push('/tasks')">
            <v-list-item-title
              >工作流</v-list-item-title
            >
          </v-list-item>
          <v-list-item link @click="$router.push('/gallery')">
            <v-list-item-title
              >图集</v-list-item-title
            >
          </v-list-item>
        </v-list-group>

        <v-list-group v-show="shortcuts">
          <template v-slot:activator>
            <v-list-item-title>快捷方式</v-list-item-title>
          </template>
          <v-list-item link v-for="s in shortcuts || [{_id: '', name: '快捷方式'}]" :key="s._id"
              @click="$router.push('/tasks/shortcut/' + s._id)">
            <v-list-item-title
              >{{ s.name }}</v-list-item-title
            >
          </v-list-item>
        </v-list-group>

        <v-list-group>
          <template v-slot:activator>
            <v-list-item-title>用户</v-list-item-title>
          </template>
          <v-list-item link @click="$router.push('/security')">
            <v-list-item-title
              >账户</v-list-item-title
            >
          </v-list-item>
          <v-list-item link @click="$router.push('/history')">
            <v-list-item-title 
              >历史</v-list-item-title
            >
          </v-list-item>
        </v-list-group>

        <v-list-group>
          <template v-slot:activator>
            <v-list-item-title>管理</v-list-item-title>
          </template>
          <v-list-item link @click="$router.push('/storage')">
            <v-list-item-title
              >文件</v-list-item-title
            >
          </v-list-item>
          <v-list-item link @click="$router.push('/collections')">
            <v-list-item-title
              >数据集</v-list-item-title
            >
          </v-list-item>
          <v-list-item link @click="$router.push('/dbconsole')">
            <v-list-item-title
              >控制台</v-list-item-title
            >
          </v-list-item>
          <v-list-item link @click="$router.push('/users')">
            <v-list-item-title
              >权限</v-list-item-title
            >
          </v-list-item>
        </v-list-group>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app color="primary" dark v-if="!viewer">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>文献利用平台</v-toolbar-title>
      <v-spacer></v-spacer>
      <queue-view :data="queue" @updated="queue = $event"></queue-view>
    </v-app-bar>

    <v-main>
      <div :id="viewer ? 'viewer' : 'content-wrapper'">
        <keep-alive :include="['SearchForm', 'ResultsView']">
          <router-view @logined="$emit('logined')" :key="$route.fullPath" />
        </keep-alive>
      </div>

      <div style="height: 40px"></div>

      <notifications group="sys" />

      <v-footer :id="viewer ? '' : 'footer'">
        <br />
        文献利用平台<br />
        &copy; 2018-{{ new Date().getFullYear() }} 科技人文研究室 &amp;
        contributors
      </v-footer>
    </v-main>
    <v-progress-linear indeterminate v-show="loading"></v-progress-linear>
  </v-app>
</template>

<script>
import QueueView from "./components/QueueView";
import api from "./api";

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
        waiting: "...",
        running: "...",
      },
      admin: false,
      shortcuts: [],
    };
  },
  created() {
    api.bus.$on("loading", (loading_num) => (this.loading = loading_num > 0));
    this.$on("logined", () => {
      api
        .logined()
        .then((data) => (this.admin = data.result.roles.indexOf("admin") >= 0))
        .then(() => {
          api
            .call("tasks/shortcuts")
            .then((data) => (this.shortcuts = data.result));
          if (!this.viewer)
            setInterval(
              () => api.queue().then((queue) => (this.queue = queue)),
              10000
            );
        })
        .catch(() => (localStorage.token = ""));
    });
  },
  mounted() {
    this.$emit("logined");
    this.drawer = !this.viewer
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
</style>
