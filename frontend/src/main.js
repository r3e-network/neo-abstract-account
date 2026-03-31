import './polyfills/buffer.js';
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
  timeout: 4000,
  position: 'top-right',
  maxToasts: 5,
  newestOnTop: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  closeOnClick: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  transition: 'Vue-Toastification__fade',
  toastDefaults: {
    success: { timeout: 3500 },
    error: { timeout: 6000 },
    warning: { timeout: 5000 },
    info: { timeout: 4000 },
  },
});
app.mount('#app');
