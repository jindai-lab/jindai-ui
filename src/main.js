import Vue from 'vue'
import App from './App'

// use vue-router
import VueRouter from 'vue-router'
Vue.use(VueRouter)

// use notifications
import Notifications from "vue-notification";
Vue.use(Notifications);

// load components
import SearchForm from './components/SearchForm.vue'
import TaskDetail from './components/TaskDetail.vue'
import TaskShortcut from './components/TaskShortcut.vue'
import TaskList from './components/TaskList.vue'
import PageView from './components/PageView.vue'
import CollectionList from './components/CollectionList.vue'
import History from './components/History.vue'
import Login from './components/Login.vue'
import QueueResult from './components/QueueResult.vue'
import StorageList from './components/StorageList.vue'
import UserList from './components/UserList.vue'
import AccountSecurity from './components/AccountSecurity.vue'
import ArticleCompletion from './components/ArticleCompletion.vue'
import DbConsole from './components/DbConsole.vue'
import vuetify from './plugins/vuetify'

// configure routes
const routes = [
    { path: '*', component: SearchForm },
    { path: '/login', component: Login, name: 'Login' },
    { path: '/view/:path(.*)', component: PageView, name: 'PageView' },
    { path: '/tasks/shortcut/:id', component: TaskShortcut, props: true },
    { path: '/tasks/:id', component: TaskDetail, props: true },
    { path: '/tasks', component: TaskList },
    { path: '/collections', component: CollectionList },
    { path: '/history', component: History },
    { path: '/results/:id(.*)', component: QueueResult, props: true },
    { path: '/storage', component: StorageList },
    { path: '/users', component: UserList },
    { path: '/security', component: AccountSecurity },
    { path: '/articlecompletion', component: ArticleCompletion },
    { path: '/dbconsole', component: DbConsole },
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
    render: h => h(App),
    vuetify,
    router
}).$mount('body#app')