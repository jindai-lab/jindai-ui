import Vue from 'vue'
import App from './App'
import vuetify from './plugins/vuetify'

// patch for Blockly
//Add unimported components to ignore list to prevent warnings.
Vue.config.ignoredElements = ['field','block','category','xml','mutation','value','sep']

// use vue-router
import VueRouter from 'vue-router'
Vue.use(VueRouter)

Vue.filter('dateSafe', function(value) {
    if (!value) return ''
    if ((typeof value === 'number' && value < 10000) || ('' + value).match(/^\d{4}(-\d{1,2})?$/)) return value;
    var ds = new Date(value).toLocaleString()
    if (ds === 'Invalid Date') return value;
    return ds;
})

// use vue-treeselect
import Treeselect from "@riophae/vue-treeselect";
Vue.component('treeselect', Treeselect)
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

// load components
import SearchForm from './components/SearchForm.vue'
import TaskDetail from './components/TaskDetail.vue'
import TaskShortcut from './components/TaskShortcut.vue'
import TaskList from './components/TaskList.vue'
import TaskScheduler from './components/TaskScheduler.vue'
import PageView from './components/PageView.vue'
import DatasetList from './components/DatasetList.vue'
import History from './components/History.vue'
import Login from './components/Login.vue'
import QueueResult from './components/QueueResult.vue'
import StorageList from './components/StorageList.vue'
import UserList from './components/UserList.vue'
import AccountSecurity from './components/AccountSecurity.vue'
import DbConsole from './components/DbConsole.vue'

// configure routes
const routes = [
    { path: '*', component: SearchForm },
    { path: '/login', component: Login, name: 'Login' },
    { path: '/view/:path(.*)', component: PageView, name: 'PageView' },
    { path: '/tasks/shortcut/:id', component: TaskShortcut, props: true },
    { path: '/tasks/:id', component: TaskDetail, props: true },
    { path: '/tasks', component: TaskList },
    { path: '/datasets', component: DatasetList },
    { path: '/history', component: History },
    { path: '/results/:id(.*)', component: QueueResult, props: true },
    { path: '/storage', component: StorageList },
    { path: '/users', component: UserList },
    { path: '/security', component: AccountSecurity },
    { path: '/dbconsole', component: DbConsole },
    { path: '/scheduler', component: TaskScheduler },
]

const router = new VueRouter({
    routes,
    mode: 'history',
    scrollBehavior() {
        return { x: 0, y: 0 }
    }
})

router.beforeEach((to, from, next) => {
    if (to.name !== 'Login' && !localStorage.token) next({ name: 'Login' })
    else next()
})

new Vue({
    vuetify,
    router,
    render: h => h(App),
}).$mount('#app')