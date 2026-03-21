<template>
  <aside :aria-label="t('studioPanels.studioSidebar', 'Studio sidebar')" class="lg:col-span-4 xl:col-span-3 space-y-6 animate-fade-in [animation-delay:150ms]">
    <button @click="sidebarExpanded = !sidebarExpanded" :aria-expanded="sidebarExpanded" :aria-label="t('studioPanels.toggleSidebar', 'Toggle studio sidebar')" class="lg:hidden w-full flex items-center justify-between rounded-xl border border-aa-border bg-aa-panel/60 px-4 py-3 text-sm font-semibold text-aa-text hover:bg-aa-dark/60 transition-colors duration-200 backdrop-blur-md mb-2">
      <span class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-aa-orange animate-pulse"></span>
        {{ t('studioPanels.studioSidebar', 'Studio sidebar') }}
      </span>
      <svg aria-hidden="true" class="w-3.5 h-3.5 text-aa-muted transition-transform duration-200" :class="sidebarExpanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
    </button>
    <div :class="sidebarExpanded ? 'block' : 'hidden lg:block'" class="space-y-6">
    <div class="bg-aa-panel/60 shadow-glow-blue rounded-lg border border-aa-border p-6 relative overflow-hidden backdrop-blur-xl">
      <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-aa-dark/30 to-transparent rounded-bl-full -mr-4 -mt-4"></div>
      <h3 class="text-xs font-extrabold text-aa-muted uppercase tracking-widest flex items-center gap-2 mb-5 font-outfit"><span class="w-2 h-2 rounded-full bg-aa-orange animate-pulse"></span>{{ t('studioPanels.sidebarChecklist', 'Pre-flight Checklist') }}</h3>
      <ul class="space-y-4">
        <li class="flex items-start gap-4">
          <div :class="walletConnected ? 'bg-aa-success/10 text-aa-success border border-aa-success/30' : 'bg-aa-dark/50 text-aa-muted border border-aa-border/50'" class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200">
            <svg aria-hidden="true" v-if="walletConnected" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <svg aria-hidden="true" v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div class="flex-1">
            <span :class="walletConnected ? 'text-aa-text font-bold' : 'text-aa-muted font-medium'" class="block text-sm">{{ t('studioPanels.walletConnected', 'Wallet Connected') }}</span>
            <span v-if="walletConnected" class="text-xs text-aa-success">{{ t('studioPanels.readyToInteract', 'Ready to interact') }}</span>
            <span v-else class="text-xs text-aa-muted">{{ t('studioPanels.connectToContinue', 'Connect to continue') }}</span>
          </div>
        </li>
        <li class="flex items-start gap-4">
          <div :class="computedAddress ? 'bg-aa-success/10 text-aa-success border border-aa-success/30' : 'bg-aa-dark/50 text-aa-muted border border-aa-border/50'" class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200">
            <svg aria-hidden="true" v-if="computedAddress" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            <svg aria-hidden="true" v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div class="flex-1">
            <span :class="computedAddress ? 'text-aa-text font-bold' : 'text-aa-muted font-medium'" class="block text-sm">{{ t('studioPanels.accountAddressReady', 'AA Address Ready') }}</span>
            <span v-if="computedAddress" class="text-xs text-aa-success truncate" :title="computedAddress">{{ computedAddress }}</span>
            <span v-else class="text-xs text-aa-muted">{{ t('studioPanels.generateAddressToContinue', 'Generate an AA address to continue') }}</span>
          </div>
        </li>
        <li class="flex items-start gap-4">
          <div :class="validCreateAdmins.length > 0 ? 'bg-aa-success/10 text-aa-success border border-aa-success/30' : 'bg-aa-dark/50 text-aa-muted border border-aa-border/50'" class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200">
            <svg aria-hidden="true" v-if="validCreateAdmins.length > 0" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <svg aria-hidden="true" v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <div class="flex-1">
            <span :class="validCreateAdmins.length > 0 ? 'text-aa-text font-bold' : 'text-aa-muted font-medium'" class="block text-sm">{{ t('studioPanels.backupOwnerSet', 'Backup Owner') }}</span>
            <span v-if="validCreateAdmins.length > 0" class="text-xs text-aa-success">{{ t('studioPanels.backupOwnerConfigured', 'Recovery address configured') }}</span>
            <span v-else class="text-xs text-aa-muted">{{ t('studioPanels.setBackupOwner', 'Set a backup owner for recovery') }}</span>
          </div>
        </li>
      </ul>
    </div>

    <div class="bg-aa-panel/60 shadow-glow-blue rounded-lg border border-aa-border p-6 backdrop-blur-xl">
      <h3 class="text-xs font-extrabold text-aa-muted uppercase tracking-widest flex items-center gap-2 mb-5 font-outfit"><span class="w-2 h-2 rounded-full bg-aa-orange"></span>{{ t('studioPanels.recentActivity', 'Recent Activity') }}</h3>
      <div v-if="recentTransactions.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
        <div class="w-14 h-14 rounded-full bg-aa-panel/60 flex items-center justify-center mb-4 ring-1 ring-aa-border/50 shadow-inner">
          <svg aria-hidden="true" class="w-6 h-6 text-aa-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <span class="text-sm text-aa-muted font-medium mb-1">{{ t('studioPanels.noTransactionsYet', 'No transactions yet') }}</span>
        <span class="text-xs text-aa-muted">{{ t('studioPanels.historyWillAppear', 'Your transaction history will appear here') }}</span>
      </div>
      <ul v-else class="space-y-3">
        <li v-for="tx in recentTransactions" :key="tx.txid" class="text-sm border border-aa-border rounded-lg bg-aa-dark/40 p-4 hover:bg-aa-dark/60 hover:border-aa-border transition-all duration-200">
          <div class="flex justify-between items-start mb-2">
            <p class="font-bold text-aa-text">{{ tx.label }}</p>
            <router-link :to="`/transaction-info/${tx.txid}`" class="inline-flex items-center gap-1.5 text-aa-orange hover:text-aa-text font-bold text-[11px] uppercase tracking-wider bg-aa-orange/20 hover:bg-aa-orange/30 px-2.5 py-1.5 rounded transition-colors duration-200">
              <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              {{ t('studioPanels.view', 'View') }}
            </router-link>
          </div>
          <p class="text-xs text-aa-muted font-medium">{{ tx.when }}</p>
        </li>
      </ul>
    </div>
    </div>
  </aside>
</template>

<script setup>
import { inject, ref } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();
const sidebarExpanded = ref(false);

const studio = inject('studio');
const {
  walletConnected,
  createForm,
  computedAddress,
  validCreateAdmins,
  recentTransactions
} = studio;
</script>