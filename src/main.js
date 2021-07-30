import Vue from 'vue'
import App from './App'

// use vue-router
import VueRouter from 'vue-router'
Vue.use(VueRouter)

// use fontawesome icons
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
library.add(fas)
Vue.component('font-awesome-icon', FontAwesomeIcon)

// vue2-touch-events
import Vue2TouchEvents from 'vue2-touch-events'
Vue.use(Vue2TouchEvents)

// vue-treeselect
import Treeselect from '@riophae/vue-treeselect'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'
Vue.component('treeselect', Treeselect)

// load components
import SearchForm from './components/SearchForm.vue'
import TaskDetail from './components/TaskDetail.vue'
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

// configure routes
const routes = [
  { path: '*', component: SearchForm },
  { path: '/login', component: Login, name: 'Login' },
  { path: '/view/:path(.*)', component: PageView, name: 'PageView' },
  { path: '/tasks/:id', component: TaskDetail, props: true },
  { path: '/tasks', component: TaskList },
  { path: '/collections', component: CollectionList },
  { path: '/history', component: History },
  { path: '/results/:id(.*)', component: QueueResult, props: true },
  { path: '/storage', component: StorageList },
  { path: '/users', component: UserList },
  { path: '/security', component: AccountSecurity },
  { path: '/articlecompletion', component: ArticleCompletion },
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
  router
}).$mount('body#app')
