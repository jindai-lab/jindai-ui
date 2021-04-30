import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router'

import SearchForm from './components/SearchForm.vue'
import TaskDetail from './components/TaskDetail.vue'
import TaskList from './components/TaskList.vue'
import CollectionList from './components/CollectionList.vue'
import History from './components/History.vue'
import Login from './components/Login.vue'
import QueueResult from './components/QueueResult.vue'

Vue.use(VueRouter)

const routes = [
  { path: '*', component: SearchForm },
  { path: '/login', component: Login, name: 'Login' },
  { path: '/tasks/:id', component: TaskDetail, props: true },
  { path: '/tasks', component: TaskList },
  { path: '/collections', component: CollectionList },
  { path: '/history', component: History },
  { path: '/results/:id(.*)', component: QueueResult, props: true },
]

const router = new VueRouter({
  routes, 
  mode: 'history',
  scrollBehavior () {
    return { x: 0, y: 0 }
  }
})

router.beforeEach((to, from, next) => {
  if (to.name !== 'Login' && !localStorage.token) next({ name: 'Login' })
  else next()
})

router.afterEach(() => {
  try {
    window.mui.tabs.activate('pane-main')
  } catch {
    console.log('init')
  }
})

new Vue({
  render: h => h(App),
  router
}).$mount('body')
