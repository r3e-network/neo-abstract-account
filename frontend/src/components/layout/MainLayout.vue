<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-neo-200 selection:text-neo-900 transition-colors duration-300">
    <nav class="sticky top-0 z-50 glass-panel border-b border-slate-200/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 transition-all duration-300">
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center group">
              <router-link to="/" class="flex items-center gap-3">
                <div class="w-9 h-9 bg-gradient-to-br from-neo-500 to-neo-700 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                  N
                </div>
                <span class="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">Abstract Account</span>
              </router-link>
            </div>
            <div class="hidden sm:-my-px sm:ml-10 sm:flex sm:space-x-8">
              <router-link to="/" class="border-transparent text-slate-500 hover:text-neo-600 hover:border-neo-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-neo-500 text-neo-700">
                Home
              </router-link>
              <router-link to="/studio" class="border-transparent text-slate-500 hover:text-neo-600 hover:border-neo-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-neo-500 text-neo-700">
                Studio
              </router-link>
              <router-link to="/docs" class="border-transparent text-slate-500 hover:text-neo-600 hover:border-neo-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200" active-class="border-neo-500 text-neo-700">
                Docs
              </router-link>
            </div>
          </div>
          <div class="flex items-center">
            <div v-if="isConnected" class="flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-full px-2 py-1 shadow-sm transition-all duration-300 hover:shadow-md">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-neo-100/80 text-neo-800">
                <span class="w-2 h-2 mr-2 bg-neo-500 rounded-full animate-pulse-slow shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                {{ truncatedAddress }}
              </span>
              <button @click="disconnect" class="text-sm text-slate-500 hover:text-red-600 font-medium px-2 transition-colors duration-200">Disconnect</button>
            </div>
            <div v-else class="animate-fade-in">
              <button @click="connect" class="btn-primary shadow-neo-500/30 shadow-lg">Connect Wallet</button>
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
          &copy; {{ new Date().getFullYear() }} Neo Abstract Account Studio. Built with passion for Web3.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useWalletConnection } from '@/composables/useWalletConnection';

const { isConnected, truncatedAddress, connect, disconnect } = useWalletConnection();
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
