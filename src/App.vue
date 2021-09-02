<template>
  <body id="app">
    <div id="sidedrawer" class="mui--no-user-select" v-if="!viewer">
      <h2 class="fs22 mui--appbar-line-height">
        <a href="/">多语种文献利用平台</a>
      </h2>
      <div class="mui-divider"></div>
      <ul @click="nav_click">
        <li>
          <strong>文献</strong>
          <ul>
            <li to="/">搜索</li>
            <li to="/tasks">任务</li>
            <li to="/gallery">图集</li>
          </ul>
        </li>
        <li>
          <strong>快捷任务</strong>
          <ul>
            <li v-for="s in shortcuts" :to="'/tasks/shortcut/' + s._id" :key="s._id">{{ s.name }}</li>
          </ul>
        </li>
        <li>
          <strong>用户</strong>
          <ul>
            <li to="/security">账户</li>
            <li to="/history">历史</li>
          </ul>
        </li>
        <li v-if="admin">
          <strong>管理</strong>
          <ul>
            <li to="/storage">文件</li>
            <li to="/collections">数据集</li>
            <li to="/users">用户</li>
            <li to="/dbconsole">控制台</li>
          </ul>
        </li>
      </ul>
    </div>

    <header id="header" v-if="!viewer">
      <div class="mui-appbar mui--appbar-line-height">
        <div class="mui-container-fluid">
          <QueueView />
        </div>
      </div>
    </header>

    <div :id="viewer ? 'viewer' : 'content-wrapper'">
      <keep-alive :include="['SearchForm', 'ResultsView']">
        <router-view @logined="$emit('logined')" :key="$route.fullPath" />
      </keep-alive>
    </div>

    <div style="height: 40px"></div>

    <notifications group="sys" />

    <div class="loading">
      <Spinner />
    </div>

    <footer :id="viewer ? '' : 'footer'">
      <div class="mui-container-fluid">
        <br />
        文献利用平台<br />
        &copy; 2018-{{ new Date().getFullYear() }} 科技人文研究室 &amp;
        contributors
      </div>
    </footer>
  </body>
</template>

<script>
import QueueView from "./components/QueueView";
import Notifications from "vue-notification";
import Spinner from "vue-simple-spinner";
import Vue from "vue";
import api from "./api";

Vue.use(Notifications);

export default {
  name: "app",
  components: {
    QueueView,
    Spinner,
  },
  created() {
    this.$on("logined", () => {
      api
        .logined()
        .then((data) => (this.admin = data.result.roles.indexOf("admin") >= 0))
        .then(() => {
          api.call("tasks/shortcuts").then(data => this.shortcuts = data.result)
        })
        .catch(() => (localStorage.token = ""));
    });
  },
  mounted() {
    this.$emit("logined");
  },
  computed: {
    viewer() {
      return location.href.indexOf("/view/") > 0;
    },
  },
  data() {
    return {
      admin: false,
      shortcuts: []
    };
  },
  methods: {
    nav_click(e) {
      this.$router.push(e.target.getAttribute("to"));
    },
  },
};
</script>

<style>
/**
 * Body CSS
 */
html,
body {
  height: 100%;
  background-color: #eee;
}

html,
body,
input,
textarea,
button {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.004);
}

.fs22 {
  font-size: 22px;
}

/**
 * Layout CSS
 */
#header {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 2;
  transition: left 0.2s;
}

#sidedrawer {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 200px;
  left: -200px;
  overflow: auto;
  z-index: 2;
  background-color: #fff;
  transition: transform 0.2s;
}

#content-wrapper {
  min-height: 100%;
  overflow-x: hidden;
  margin-left: 0px;
  transition: margin-left 0.2s;
  margin-top: 80px;
  padding-left: 20px;
  padding-right: 20px;
  /* sticky bottom */
  margin-bottom: -160px;
  padding-bottom: 160px;
}

#footer {
  height: 160px;
  margin-left: 0px;
  transition: margin-left 0.2s;
}

header > div > div > div > a {
  color: white;
  text-decoration: none;
}

.mui-btn {
  box-shadow: 0 0 4px rgb(0 0 0 / 12%), 1px 3px 4px rgb(0 0 0 / 20%);
}

.mui-select__menu {
  top: 0 !important;
  max-height: 400px;
}

@media (min-width: 768px) {
  #header {
    left: 200px;
  }

  #sidedrawer {
    transform: translate(200px);
  }

  #content-wrapper {
    margin-left: 200px;
  }

  #footer {
    margin-left: 200px;
  }

  body.hide-sidedrawer #header {
    left: 0;
  }

  body.hide-sidedrawer #sidedrawer {
    transform: translate(0px);
  }

  body.hide-sidedrawer #content-wrapper {
    margin-left: 0;
  }

  body.hide-sidedrawer #footer {
    margin-left: 0;
  }
}

/**
 * Toggle Side drawer
 */
#sidedrawer.active {
  transform: translate(200px);
}

/**
 * Header CSS
 */
.sidedrawer-toggle {
  color: #fff;
  cursor: pointer;
  font-size: 20px;
  line-height: 20px;
  margin-right: 10px;
}

.sidedrawer-toggle:hover {
  color: #fff;
  text-decoration: none;
}

/**
 * Footer CSS
 */
#footer {
  background-color: #0288d1;
  color: #fff;
}

#footer a {
  color: #fff;
  text-decoration: underline;
}

#sidedrawer-brand {
  padding-left: 20px;
}

#sidedrawer ul {
  list-style: none;
  padding-left: 0px;
}

#sidedrawer > ul > li:first-child {
  padding-top: 15px;
}

#sidedrawer > ul > li > ul > li {
  padding-left: 40px;
}

#sidedrawer strong {
  display: block;
  padding: 15px 22px;
  cursor: pointer;
}

#slidedrawer a,
#sidedrawer a:hover {
  text-decoration: none;
}

#sidedrawer strong:hover,
#sidedrawer > ul > li > ul > li:hover {
  background-color: #e0e0e0;
  cursor: pointer;
}

#sidedrawer strong + ul > li {
  padding: 6px 0px;
}

#viewer {
  max-width: 80%;
  margin: 0 auto;
}

em {
  background-color: yellow;
  font-style: normal;
}

.loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  background: rgba(255, 255, 255, 0.6);
  margin: 0 auto;
  display: none;
}

.loading > div {
  position: absolute;
  top: 50%;
  left: 50%;
}
</style>
