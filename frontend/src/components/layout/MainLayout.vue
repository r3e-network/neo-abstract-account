<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-neo-200 selection:text-neo-900 transition-colors duration-300 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div class="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vh] bg-neo-300/30 rounded-full blur-[120px] mix-blend-multiply animate-pulse-slow"></div>
      <div class="fixed top-[20%] right-[-5%] w-[35vw] h-[35vh] bg-blue-300/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse-slow" style="animation-delay: 1s;"></div>
      <div class="fixed bottom-[-10%] left-[20%] w-[50vw] h-[50vh] bg-teal-300/20 rounded-full blur-[140px] mix-blend-multiply animate-pulse-slow" style="animation-delay: 2s;"></div>
    </div>

    <nav class="sticky top-0 z-50 glass-panel border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 transition-all duration-300 gap-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center group">
              <router-link to="/" class="flex items-center gap-3">
                <div class="w-9 h-9 bg-gradient-to-br from-neo-500 to-neo-700 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  N
                </div>
                <span class="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">{{ t('brand.name', 'Abstract Account') }}</span>
              </router-link>
            </div>
            <div class="hidden sm:-my-px sm:ml-10 sm:flex sm:space-x-8">
              <router-link to="/" class="border-transparent text-slate-500 hover:text-neo-600 hover:border-neo-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-neo-500 text-neo-700">
                {{ t('nav.home', 'Home') }}
              </router-link>
              <router-link to="/docs" class="border-transparent text-slate-500 hover:text-neo-600 hover:border-neo-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-neo-500 text-neo-700">
                {{ t('nav.docs', 'Docs') }}
              </router-link>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-2 py-1 text-xs font-semibold text-slate-600">
              <span class="px-2 text-slate-400">{{ t('nav.language', 'Language') }}</span>
              <button
                v-for="item in locales"
                :key="item.code"
                @click="setLocale(item.code)"
                :class="locale === item.code ? 'bg-neo-600 text-white' : 'text-slate-600 hover:bg-slate-100'"
                class="rounded-full px-3 py-1 transition-colors duration-200"
              >
                {{ item.code === 'en' ? 'English' : '中文' }}
              </button>
            </div>
            <div v-if="isConnected" class="flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-full px-2 py-1 shadow-sm transition-all duration-300 hover:shadow-md">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-neo-100/80 text-neo-800">
                <span class="w-2 h-2 mr-2 bg-neo-500 rounded-full animate-pulse-slow shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                {{ truncatedAddress }}
              </span>
              <button @click="disconnect" class="text-sm text-slate-500 hover:text-red-600 font-medium px-2 transition-colors duration-200">{{ t('nav.disconnect', 'Disconnect') }}</button>
            </div>
            <div v-else class="animate-fade-in">
              <button @click="connect" class="btn-primary shadow-neo-500/30 shadow-lg">{{ t('nav.connect', 'Connect Wallet') }}</button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main class="flex-1 w-full animate-fade-in-up">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="bg-white/80 backdrop-blur-sm border-t border-slate-200 mt-auto">
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-slate-200 rounded-md flex items-center justify-center font-bold text-xs text-slate-600">
            N
          </div>
          <span class="font-bold text-sm text-slate-700">Neo N3</span>
        </div>
        <p class="text-center text-sm text-slate-500">
          &copy; {{ new Date().getFullYear() }} {{ t('footer.builtWith', 'Neo Abstract Account Workspace. Built with passion for Web3.') }}
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWalletConnection } from '@/composables/useWalletConnection';
import { useI18n } from '@/i18n';

const { isConnected, truncatedAddress, connect, disconnect } = useWalletConnection();
const { locale, locales, setLocale, t } = useI18n();
const activeLocale = computed(() => locale.value);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
