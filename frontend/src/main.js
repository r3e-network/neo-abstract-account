import { createApp } from 'vue';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);
app.use(router);
app.use(Toast, {
  timeout: 3500,
  position: 'top-right'
});
app.mount('#app');
