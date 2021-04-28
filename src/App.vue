<template>
  <body id="app">
    <div id="sidedrawer" class="mui--no-user-select">
      <div>
        <h2 class="mui--appbar-line-height"><a href="/">近现代作家语料库</a></h2>
        <div class="mui-divider"></div>
      <ul>
        <li><router-link :to="'/'" id="search">搜索</router-link></li>
        <li><router-link :to="'/tasks'" id="tasks">任务</router-link></li>
      </ul>
      </div>
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

header a {
  color: white;
  text-decoration: none;
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
}

#sidedrawer > ul {
  padding-left: 0px;
}

#sidedrawer > ul > li:first-child {
  padding-top: 15px;
}

#sidedrawer strong {
  display: block;
  padding: 15px 22px;
  cursor: pointer;
}

#sidedrawer strong:hover {
  background-color: #E0E0E0;
}

#sidedrawer strong + ul > li {
  padding: 6px 0px;
}
</style>
