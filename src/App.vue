<template>
  <body id="app">
    <div id="sidedrawer" class="mui--no-user-select">
      <h2 class="mui--appbar-line-height"><a href="/">近现代作家语料库</a></h2>
      <div class="mui-divider"></div>
      <ul>
        <li>
          <strong>文献</strong>
          <ul>
            <li><router-link :to="'/'" id="search">搜索</router-link></li>
            <li><router-link :to="'/tasks'" id="tasks">任务</router-link></li>
          </ul>
        </li>
        <li>
          <strong>用户</strong>
          <ul>
            <li><router-link :to="'/security'">账户</router-link></li>
            <li><router-link :to="'/history'">历史</router-link></li>
          </ul>
        </li>
        <li>
          <strong>管理</strong>
          <ul>
            <li><router-link :to="'/collections'" id="tasks">文献集</router-link></li>
          </ul>
        </li>
      </ul>
    </div>

    <header id="header">
      <div class="mui-appbar mui--appbar-line-height">
        <div class="mui-container-fluid">
          <QueueView />
        </div>
      </div>
    </header>

    <div id="content-wrapper">
      <router-view></router-view>
    </div>

    <div style="height: 40px"></div>

    <footer id="footer">
      <div class="mui-container-fluid">
        <br />
        近现代作家语料库 - 文献利用系统<br>
        &copy; 2018-{{ new Date().getFullYear() }} 科技人文研究室 &amp; contributors
      </div>
    </footer>
  </body>
</template>

<script>
import QueueView from "./components/QueueView.vue";

export default {
  name: "app",
  components: {
    QueueView,
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

header>div>div>div>a {
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

#slidedrawer a, #sidedrawer a:hover {
  text-decoration: none;
}

#sidedrawer strong:hover, #sidedrawer>ul>li>ul>li:hover {
  background-color: #E0E0E0;
  cursor: pointer;
}

#sidedrawer strong + ul > li {
  padding: 6px 0px;
}

em {
  background-color: yellow;
  font-style: normal;
}
</style>
