import Vue from "vue";
import App from "./App";
import vuetify from "./plugins/vuetify";
import moment from 'moment';

// use vue-router
import VueRouter from "vue-router";
Vue.use(VueRouter);

Vue.filter("dateSafe", function (value) {
  if (!value) return "";
  if (
    (typeof value === "number" && value < 10000) ||
    ("" + value).match(/^\d{4}(-\d{1,2})?$|[^/.\-\d:\sTZ]/)
  )
    return value;
  var ds = moment("" + value).format("YYYY-MM-DD HH:mm:ss");
  if (ds === "Invalid date") return value;
  return ds;
});

// v-viewer
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'
Vue.use(VueViewer, {
  defaultOptions: {
    inline: true,
    button: false,
    navbar: false,
    title: false,
    toolbar: true,
    loading: false,
    tooltip: false,
    movable: true,
    zoomable: true,
    scalarable: false,
    rotatable: true,
    fullscreen: true,
    transition: false,
    keyboard: false,
    backdrop: false,
  }
})

// use vue-treeselect
import Treeselect from "@riophae/vue-treeselect";
Vue.component("treeselect", Treeselect);
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

// load components
const SearchForm = () => import( "./views/SearchForm.vue" );
const TaskDetail = () => import( "./views/TaskDetail.vue" );
const TaskShortcut = () => import( "./views/TaskShortcut.vue" );
const TaskList = () => import( "./views/TaskList.vue" );
const PageView = () => import( "./views/PageView.vue" );
const DatasetList = () => import( "./views/DatasetList.vue" );
const History = () => import( "./views/History.vue" );
const Login = () => import( "./views/Login.vue" );
const QueueResult = () => import( "./views/QueueResult.vue" );
const QueueLog = () => import( "./views/QueueLog.vue" );
const StorageList = () => import( "./views/StorageList.vue" );
const SystemAdmin = () => import( "./views/SystemAdmin.vue" );
const Preferences = () => import( "./views/Preferences.vue" );
const DbConsole = () => import( "./views/DbConsole.vue" );
const AutoTags = () => import( "./views/AutoTags.vue" );
const Shortcuts = () => import( "./views/Shortcuts.vue" );

// install api and dialogs
import api from "./api"
Vue.prototype.api = api
import dialogs from "./dialogs"
dialogs; // supress error

// configure routes
const routes = [{
  path: "*",
  component: SearchForm,
},
{
  path: "/login",
  component: Login,
  name: "Login",
},
{
  path: "/view/:path(.*)",
  component: PageView,
  name: "PageView",
  props: true
},
{
  path: "/tasks/shortcut/:id",
  component: TaskShortcut,
  props: true,
},
{
  path: "/tasks/:id",
  component: TaskDetail,
  props: true,
},
{
  path: "/tasks",
  component: TaskList,
},
{
  path: "/datasets",
  component: DatasetList,
},
{
  path: "/history",
  component: History,
},
{
  path: "/results/:id(.*)",
  component: QueueResult,
  props: true,
},
{
  path: "/logs/:id(.*)",
  component: QueueLog,
  props: true,
},
{
  path: "/storage",
  component: StorageList,
},
{
  path: "/admin",
  component: SystemAdmin,
},
{
  path: "/preferences",
  component: Preferences,
},
{
  path: "/dbconsole",
  component: DbConsole,
},
{
  path: "/autotags",
  component: AutoTags,
},
{
  path: "/shortcuts",
  component: Shortcuts,
}
];

const router = new VueRouter({
  routes,
  mode: "history",
  scrollBehavior() {
    return {
      x: 0,
      y: 0,
    };
  },
});

router.beforeEach((to, from, next) => {
  if (to.name !== "Login" && !localStorage.token)
    next({
      name: "Login",
    });
  else next();
  document.title = api.meta.app_title
});

import i18n from "./locales";
import business from "./business";

Promise.all([api.get_meta(), business.initialized]).finally(()=>{
  new Vue({
    vuetify,
    router,
    i18n,
    render: (h) => h(App),
  }).$mount("#app");
})