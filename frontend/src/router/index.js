import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import HomeView from '@/views/HomeView.vue';
import AbstractAccountTool from '@/components/AbstractAccountTool.vue';
import TransactionInfoView from '@/views/TransactionInfoView.vue';
import DocsView from '@/views/DocsView.vue';

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
