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
              <router-link to="/app" class="border-transparent text-biconomy-muted hover:text-white hover:border-biconomy-border inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-biconomy-lightOrange text-white">
                {{ t('nav.app', 'APP') }}
              </router-link>
              <router-link to="/market" class="border-transparent text-biconomy-muted hover:text-white hover:border-biconomy-border inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-biconomy-lightOrange text-white">
                {{ t('nav.market', 'MARKET') }}
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
        <div class="flex gap-2 overflow-x-auto pb-3 sm:hidden">
          <router-link to="/" class="rounded-full border border-biconomy-border bg-biconomy-panel px-4 py-2 text-xs font-semibold uppercase tracking-wider text-biconomy-muted transition-colors hover:text-white" active-class="border-biconomy-lightOrange text-white">
            {{ t('nav.home', 'HOME') }}
          </router-link>
          <router-link to="/app" class="rounded-full border border-biconomy-border bg-biconomy-panel px-4 py-2 text-xs font-semibold uppercase tracking-wider text-biconomy-muted transition-colors hover:text-white" active-class="border-biconomy-lightOrange text-white">
            {{ t('nav.app', 'APP') }}
          </router-link>
          <router-link to="/market" class="rounded-full border border-biconomy-border bg-biconomy-panel px-4 py-2 text-xs font-semibold uppercase tracking-wider text-biconomy-muted transition-colors hover:text-white" active-class="border-biconomy-lightOrange text-white">
            {{ t('nav.market', 'MARKET') }}
          </router-link>
          <router-link to="/docs" class="rounded-full border border-biconomy-border bg-biconomy-panel px-4 py-2 text-xs font-semibold uppercase tracking-wider text-biconomy-muted transition-colors hover:text-white" active-class="border-biconomy-lightOrange text-white">
            {{ t('nav.docs', 'DOCS') }}
          </router-link>
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
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span class="text-biconomy-muted font-medium">{{ t('nav.network', 'Neo N3 Testnet') }}</span>
            </div>
            <div class="flex items-center gap-4 text-biconomy-muted">
              <a href="https://github.com/CityOfZion/neo-abstract-account" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors flex items-center gap-1">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
                GitHub
              </a>
              <a href="https://discord.gg/neo" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors flex items-center gap-1">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                Discord
              </a>
              <a href="https://ctrlpc.link/neo-docs" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Docs
              </a>
            </div>
          </div>
          <p class="text-center text-xs text-biconomy-muted font-mono uppercase tracking-wider">
            &copy; {{ new Date().getFullYear() }} NEO ABSTRACT ACCOUNT
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useWalletConnection } from '@/composables/useWalletConnection';
import { useDidConnection } from '@/composables/useDidConnection';
import { useI18n } from '@/i18n';

const { isConnected, truncatedAddress, connect, disconnect } = useWalletConnection();
const { isConfigured: didAvailable, isConnected: didConnected, shortDid: didShort, connectDid, disconnectDid } = useDidConnection();
const { locale, locales, setLocale, t } = useI18n();
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
