import { createApp } from 'vue';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  console.error('[App Error]', err, info);
};

app.use(router);
app.use(Toast, {
  timeout: 3500,
  position: 'top-right'
});
app.mount('#app');
