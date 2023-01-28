// Composables
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
      path: "*",
      component: () => import('@/views/SearchForm.vue'),
    },
    // {
    //   path: "/login",
    //   component: Login,
    //   name: "Login",
    // },
    // {
    //   path: "/view/:path(.*)",
    //   component: PageView,
    //   name: "PageView",
    // },
    // {
    //   path: "/tasks/shortcut/:id",
    //   component: TaskShortcut,
    //   props: true,
    // },
    // {
    //   path: "/tasks/:id",
    //   component: TaskDetail,
    //   props: true,
    // },
    // {
    //   path: "/tasks",
    //   component: TaskList,
    // },
    // {
    //   path: "/datasets",
    //   component: DatasetList,
    // },
    // {
    //   path: "/history",
    //   component: HistoryList,
    // },
    // {
    //   path: "/results/:id(.*)",
    //   component: QueueResult,
    //   props: true,
    // },
    // {
    //   path: "/logs/:id(.*)",
    //   component: QueueLog,
    //   props: true,
    // },
    // {
    //   path: "/storage",
    //   component: StorageList,
    // },
    // {
    //   path: "/admin",
    //   component: SystemAdmin,
    // },
    // {
    //   path: "/preferences",
    //   component: Preferences,
    // },
    // {
    //   path: "/dbconsole",
    //   component: DbConsole,
    // },
    // {
    //   path: "/autotags",
    //   component: AutoTags,
    // },
    // {
    //   path: "/shortcuts",
    //   component: Shortcuts,
    // },
    // {
    //   path: "/querytest",
    //   component: QueryFormTest,
    // },
    ],
  },
  {
    path: '/view',
    component: () => import('@/layouts/default/Viewer.vue'),
    children: [
      {path: '*', component: import('@/views/PageView.vue')}
    ]
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

export default router
