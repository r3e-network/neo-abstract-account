<template>
  <div class="min-h-screen bg-biconomy-dark flex flex-col font-sans text-biconomy-text selection:bg-biconomy-lightOrange selection:text-white transition-colors duration-300 relative overflow-hidden">
    <nav class="sticky top-0 z-50 bg-biconomy-dark/90 backdrop-blur-md border-b border-biconomy-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 transition-all duration-300 gap-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center group">
              <router-link to="/" class="flex items-center gap-3">
                <div class="w-8 h-8 bg-biconomy-panel border border-biconomy-border text-white rounded flex items-center justify-center font-bold text-lg shadow-sm transform group-hover:scale-105 transition-transform duration-200 font-mono">
                  N
                </div>
                <span class="font-bold text-lg text-white tracking-widest uppercase text-sm">{{ t('brand.name', 'Abstract Account') }}</span>
              </router-link>
            </div>
            <div class="hidden sm:-my-px sm:ml-10 sm:flex sm:space-x-8">
              <router-link to="/" class="border-transparent text-biconomy-muted hover:text-white hover:border-biconomy-border inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-biconomy-lightOrange text-white">
                {{ t('nav.home', 'HOME') }}
              </router-link>
              <router-link to="/docs" class="border-transparent text-biconomy-muted hover:text-white hover:border-biconomy-border inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-biconomy-lightOrange text-white">
                {{ t('nav.docs', 'DOCS') }}
              </router-link>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="hidden sm:flex items-center gap-1 bg-biconomy-panel border border-biconomy-border rounded p-1 text-xs font-semibold text-biconomy-muted">
              <button
                v-for="item in locales"
                :key="item.code"
                @click="setLocale(item.code)"
                :class="locale === item.code ? 'bg-ata-border text-white shadow-sm' : 'text-biconomy-muted hover:text-biconomy-text'"
                class="rounded px-2 py-1 transition-all duration-200 font-mono"
              >
                {{ item.code === 'en' ? 'English' : '中文' }}
              </button>
            </div>
            <div v-if="didConnected" class="flex items-center gap-3 bg-biconomy-panel border border-biconomy-border rounded px-3 py-1.5 shadow-sm">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <span class="w-1.5 h-1.5 mr-2 bg-sky-400 rounded-full animate-pulse"></span>
                DID {{ didShort }}
              </span>
              <button @click="disconnectDid" class="text-xs text-biconomy-muted hover:text-rose-400 font-medium px-1 transition-colors duration-200 uppercase tracking-wider">{{ t('nav.disconnectDid', 'Disconnect Web3Auth') }}</button>
            </div>
            <div v-if="isConnected" class="flex items-center gap-3 bg-biconomy-panel border border-biconomy-border rounded px-3 py-1.5 shadow-sm">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-biconomy-orange/10 text-biconomy-orange border border-biconomy-orange/20">
                <span class="w-1.5 h-1.5 mr-2 bg-biconomy-orange rounded-full animate-pulse"></span>
                {{ truncatedAddress }}
              </span>
              <button @click="disconnect" class="text-xs text-biconomy-muted hover:text-rose-400 font-medium px-1 transition-colors duration-200 uppercase tracking-wider">{{ t('nav.disconnect', 'Disconnect') }}</button>
            </div>
            <div v-else class="animate-fade-in flex items-center gap-2">
              <button v-if="didAvailable && !didConnected" @click="connectDid" class="btn-secondary text-xs py-1.5 px-4 uppercase tracking-wider font-bold">{{ t('nav.connectDid', 'Connect Web3Auth') }}</button>
              <button @click="connect" class="btn-primary text-xs py-1.5 px-4 uppercase tracking-wider font-bold">{{ t('nav.connect', 'Connect') }}</button>
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

    <footer class="bg-biconomy-dark border-t border-biconomy-border mt-auto">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2 text-biconomy-muted font-mono text-xs uppercase tracking-wider">
          <span class="font-medium">{{ t('nav.network', 'Neo N3 Network') }}</span>
        </div>
        <p class="text-center text-xs text-biconomy-muted font-mono uppercase tracking-wider">
          &copy; {{ new Date().getFullYear() }} {{ t('footer.builtWith', 'NEO ABSTRACT ACCOUNT') }}
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWalletConnection } from '@/composables/useWalletConnection';
import { useDidConnection } from '@/composables/useDidConnection';
import { useI18n } from '@/i18n';

const { isConnected, truncatedAddress, connect, disconnect } = useWalletConnection();
const { isConfigured: didAvailable, isConnected: didConnected, shortDid: didShort, connectDid, disconnectDid } = useDidConnection();
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
