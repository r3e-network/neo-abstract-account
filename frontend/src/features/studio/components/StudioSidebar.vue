<template>
  <aside class="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6 animate-fade-in" style="animation-delay: 150ms;">
    <div class="bg-slate-800/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl border border-slate-700/50 p-6 relative overflow-hidden backdrop-blur-xl">
      <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-700/30 to-transparent rounded-bl-full -mr-4 -mt-4"></div>
      <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-5 font-outfit"><span class="w-2 h-2 rounded-full bg-neo-500"></span>{{ t('studioPanels.sidebarChecklist', 'Pre-flight Checklist') }}</h3>
      <ul class="space-y-4">
        <li class="flex items-start gap-3">
          <div :class="walletConnected ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'" class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
          </div>
          <div>
            <span :class="walletConnected ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'" class="block text-sm">{{ t('studioPanels.walletConnected', 'Wallet Connected') }}</span>
            <span v-if="!walletConnected" class="text-xs text-slate-400">{{ t('studioPanels.connectToContinue', 'Connect to continue') }}</span>
          </div>
        </li>
        <li class="flex items-start gap-3">
          <div :class="createForm.accountId ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'" class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
          </div>
          <div>
            <span :class="createForm.accountId ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'" class="block text-sm">{{ t('studioPanels.accountId', 'Account ID') }}</span>
            <span v-if="!createForm.accountId" class="text-xs text-slate-400">{{ t('studioPanels.provideIdentifier', 'Provide an identifier') }}</span>
          </div>
        </li>
        <li class="flex items-start gap-3">
          <div :class="validCreateAdmins.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'" class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
          </div>
          <div>
            <span :class="validCreateAdmins.length > 0 ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'" class="block text-sm">{{ t('studioPanels.validAdmin', 'Valid Admin') }}</span>
            <span v-if="validCreateAdmins.length === 0" class="text-xs text-slate-400">{{ t('studioPanels.addAtLeastOne', 'Add at least one') }}</span>
          </div>
        </li>
      </ul>
    </div>

    <div class="bg-slate-800/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl border border-slate-700/50 p-6 backdrop-blur-xl">
      <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-5 font-outfit"><span class="w-2 h-2 rounded-full bg-neo-500"></span>{{ t('studioPanels.recentActivity', 'Recent Activity') }}</h3>
      <div v-if="recentTransactions.length === 0" class="flex flex-col items-center justify-center py-6 text-center">
        <div class="w-12 h-12 rounded-full bg-slate-900/50 flex items-center justify-center mb-3 ring-1 ring-slate-700/50 shadow-inner">
          <svg class="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <span class="text-sm text-slate-500 font-medium">{{ t('studioPanels.noTransactionsYet', 'No transactions yet') }}</span>
      </div>
      <ul v-else class="space-y-3">
        <li v-for="tx in recentTransactions" :key="tx.txid" class="text-sm border border-slate-700/30 rounded-xl bg-slate-900/40 p-4 hover:bg-slate-900/60 hover:border-slate-600/50 transition-all duration-300">
          <div class="flex justify-between items-start mb-2">
            <p class="font-bold text-slate-300">{{ tx.label }}</p>
            <router-link :to="`/transaction-info/${tx.txid}`" class="text-neo-400 hover:text-white font-bold text-[11px] uppercase tracking-wider bg-neo-500/20 px-2 py-1 rounded shadow-sm">{{ t('studioPanels.view', 'View') }}</router-link>
          </div>
          <p class="text-xs text-slate-500 font-medium">{{ tx.when }}</p>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const studio = inject('studio');
const {
  walletConnected,
  createForm,
  validCreateAdmins,
  recentTransactions
} = studio;
</script>