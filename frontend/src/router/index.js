import { createRouter, createWebHistory } from 'vue-router';

const MainLayout = () => import('@/components/layout/MainLayout.vue');
const HomeView = () => import('@/views/HomeView.vue');
const AbstractAccountTool = () => import('@/components/AbstractAccountTool.vue');
const TransactionInfoView = () => import('@/views/TransactionInfoView.vue');
const DocsView = () => import('@/views/DocsView.vue');

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: HomeView
      },
      {
        path: 'studio',
        name: 'abstract-account-studio',
        component: AbstractAccountTool
      },
      {
        path: 'docs',
        name: 'documentation',
        component: DocsView
      },
      {
        path: 'transaction-info/:txid',
        name: 'transaction-info',
        component: TransactionInfoView,
        props: true
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
