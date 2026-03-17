import { createRouter, createWebHistory } from 'vue-router';

const MainLayout = () => import('@/components/layout/MainLayout.vue');
const AbstractAccountTool = () => import('@/components/AbstractAccountTool.vue');
const HomeView = () => import('@/views/HomeView.vue');
const AddressMarketView = () => import('@/views/AddressMarketView.vue');
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
        path: 'app',
        name: 'app-workspace',
        component: AbstractAccountTool
      },
      {
        path: 'market',
        name: 'address-market',
        component: AddressMarketView
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
      },
      {
        path: 'tx/:draftId',
        name: 'transaction-draft',
        component: TransactionInfoView,
        props: (route) => ({ draftId: route.params.draftId })
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
