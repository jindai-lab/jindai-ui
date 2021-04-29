import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router'

import SearchForm from './components/SearchForm.vue'
import TaskDetail from './components/TaskDetail.vue'
import TaskList from './components/TaskList.vue'
import CollectionList from './components/CollectionList.vue'
import PageView from './components/PageView.vue'
import History from './components/History.vue'

Vue.use(VueRouter)

const routes = [
  { path: '/', component: SearchForm },
  { path: '/tasks/:id', component: TaskDetail, props: true },
  { path: '/tasks', component: TaskList, props: true },
  { path: '/collections', component: CollectionList, props: true },
  { path: '/history', component: History, props: true },
  { path: '/view/:pdffile/:pdfpage', component: PageView, props: true },
]

const router = new VueRouter({
  routes, 
  mode: 'history',
  scrollBehavior () {
    return { x: 0, y: 0 }
  }
})

new Vue({
  render: h => h(App),
  router
}).$mount('body')
