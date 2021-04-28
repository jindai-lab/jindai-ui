import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router'

import SearchForm from './components/SearchForm.vue'
import TaskDetail from './components/TaskDetail.vue'
import TaskList from './components/TaskList.vue'

Vue.use(VueRouter)

const routes = [
  { path: '/', component: SearchForm },
  { path: '/tasks/:id', component: TaskDetail, props: true },
  { path: '/tasks', component: TaskList, props: true },
]

const router = new VueRouter({
  routes, 
  mode: 'history'
})

new Vue({
  render: h => h(App),
  router
}).$mount('body')
