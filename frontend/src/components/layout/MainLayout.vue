<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-neo-200 selection:text-neo-900 transition-colors duration-300 relative overflow-hidden">
    <nav class="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 transition-all duration-300 gap-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center group">
              <router-link to="/" class="flex items-center gap-3">
                <div class="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-sm transform group-hover:scale-105 transition-transform duration-200">
                  N
                </div>
                <span class="font-bold text-lg text-slate-900 tracking-tight">{{ t('brand.name', 'Abstract Account') }}</span>
              </router-link>
            </div>
            <div class="hidden sm:-my-px sm:ml-10 sm:flex sm:space-x-8">
              <router-link to="/" class="border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-slate-900 text-slate-900">
                {{ t('nav.home', 'Home') }}
              </router-link>
              <router-link to="/docs" class="border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-slate-900 text-slate-900">
                {{ t('nav.docs', 'Docs') }}
              </router-link>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-1 bg-slate-100 rounded-md p-1 text-xs font-semibold text-slate-600">
              <button
                v-for="item in locales"
                :key="item.code"
                @click="setLocale(item.code)"
                :class="locale === item.code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                class="rounded px-2 py-1 transition-all duration-200"
              >
                {{ item.code === 'en' ? 'English' : '中文' }}
              </button>
            </div>
            <div v-if="isConnected" class="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-2 py-1 shadow-sm">
              <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-neo-50 text-neo-700 border border-neo-100">
                <span class="w-1.5 h-1.5 mr-1.5 bg-neo-500 rounded-full"></span>
                {{ truncatedAddress }}
              </span>
              <button @click="disconnect" class="text-xs text-slate-500 hover:text-red-600 font-medium px-1 transition-colors duration-200">{{ t('nav.disconnect', 'Disconnect') }}</button>
            </div>
            <div v-else class="animate-fade-in">
              <button @click="connect" class="btn-primary shadow-sm text-sm py-1.5 px-4 rounded-md">{{ t('nav.connect', 'Connect') }}</button>
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

    <footer class="bg-white border-t border-slate-200 mt-auto">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2 text-slate-400">
          <span class="font-medium text-xs">Neo N3</span>
        </div>
        <p class="text-center text-xs text-slate-500">
          &copy; {{ new Date().getFullYear() }} {{ t('footer.builtWith', 'Neo Abstract Account') }}
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
