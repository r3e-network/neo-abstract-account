import { createRouter, createWebHistory } from 'vue-router';
import AbstractAccountTool from '@/components/AbstractAccountTool.vue';
import TransactionInfoView from '@/views/TransactionInfoView.vue';

const routes = [
  {
    path: '/',
    name: 'abstract-account-studio',
    component: AbstractAccountTool
  },
  {
    path: '/transaction-info/:txid',
    name: 'transaction-info',
    component: TransactionInfoView,
    props: true
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
