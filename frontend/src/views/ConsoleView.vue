<template>
  <div class="min-h-screen bg-black text-[#EDEDED]">
    <!-- Console Header Bar -->
    <div class="border-b border-[#333] bg-[#0A0A0A]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-medium text-white">{{ t('console.title', 'Console') }}</h1>
            <p class="text-sm text-[#888] mt-0.5">{{ t('console.subtitle', 'Manage your abstract accounts and smart wallet operations') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Network badge -->
            <div class="flex items-center gap-2 px-2.5 py-1 rounded-md bg-black border border-[#333] text-xs">
              <span class="w-1.5 h-1.5 rounded-full" :class="networkOnline ? 'bg-[#10b981]' : statusLoadFailed ? 'bg-[#f43f5e]' : 'bg-[#888]'"></span>
              <span class="text-[#EDEDED] font-medium">{{ networkLabel }}</span>
            </div>
            <!-- Wallet status -->
            <div v-if="isConnected" class="flex items-center gap-2 px-2.5 py-1 rounded-md bg-black border border-[#333] text-xs font-mono text-[#EDEDED]">
              <span class="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
              {{ truncatedAddress }}
            </div>
            <button v-else @click="connectWallet" :disabled="isWalletConnecting" class="btn-primary text-xs py-1 px-3">
              {{ isWalletConnecting ? t('console.connecting', 'Connecting...') : t('console.connectWallet', 'Connect Wallet') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Resource Summary Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-[#0A0A0A] border border-[#333] rounded-md p-4">
          <p class="text-xs text-[#888] mb-1 font-medium">{{ t('console.statNetwork', 'Network') }}</p>
          <p class="text-xl font-medium text-white">{{ networkName }}</p>
          <p class="text-xs text-[#888] mt-1">
            <span v-if="networkOnline" class="text-[#EDEDED]">{{ t('console.networkOnline', 'Online') }}</span>
            <span v-else-if="statusLoadFailed" class="text-[#f43f5e]">{{ t('console.networkOffline', 'Offline') }}</span>
            <span v-else>{{ t('console.networkChecking', 'Checking...') }}</span>
          </p>
        </div>
        <div class="bg-[#0A0A0A] border border-[#333] rounded-md p-4">
          <p class="text-xs text-[#888] mb-1 font-medium">{{ t('console.statBlockHeight', 'Block Height') }}</p>
          <p class="text-xl font-medium text-white font-mono">{{ blockHeight }}</p>
          <p class="text-xs text-[#888] mt-1">{{ t('console.statChainTip', 'Chain tip') }}</p>
        </div>
        <div class="bg-[#0A0A0A] border border-[#333] rounded-md p-4">
          <p class="text-xs text-[#888] mb-1 font-medium">{{ t('console.statWallet', 'Wallet') }}</p>
          <p class="text-xl font-medium text-white">{{ isConnected ? '1' : '0' }}</p>
          <p class="text-xs text-[#888] mt-1">{{ isConnected ? t('console.statConnected', 'Connected') : t('console.statDisconnected', 'Not connected') }}</p>
        </div>
        <div class="bg-[#0A0A0A] border border-[#333] rounded-md p-4">
          <p class="text-xs text-[#888] mb-1 font-medium">{{ t('console.statContract', 'Contract') }}</p>
          <p class="text-base font-medium text-white font-mono truncate" :title="contractHashDisplay">{{ contractHashShort }}</p>
          <p class="text-xs text-[#888] mt-1">{{ t('console.statMasterContract', 'Master contract') }}</p>
        </div>
      </div>

      <!-- Getting Started (only when not connected) -->
      <div v-if="!isConnected" class="mb-8 bg-[#0A0A0A] border border-[#333] rounded-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {{ t('console.gettingStartedTitle', 'Getting Started') }}
          </h2>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="flex gap-3">
            <div class="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center text-white text-xs shrink-0 font-mono">1</div>
            <div>
              <p class="text-sm font-medium text-white">{{ t('console.step1Title', 'Connect Wallet') }}</p>
              <p class="text-xs text-[#888] mt-0.5">{{ t('console.step1Body', 'Link your Neo N3 wallet to get started') }}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center text-white text-xs shrink-0 font-mono">2</div>
            <div>
              <p class="text-sm font-medium text-white">{{ t('console.step2Title', 'Create Account') }}</p>
              <p class="text-xs text-[#888] mt-0.5">{{ t('console.step2Body', 'Deploy a deterministic smart wallet on Neo N3') }}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center text-white text-xs shrink-0 font-mono">3</div>
            <div>
              <p class="text-sm font-medium text-white">{{ t('console.step3Title', 'Add Plugins') }}</p>
              <p class="text-xs text-[#888] mt-0.5">{{ t('console.step3Body', 'Install verifiers and hooks for access control and policies') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Service Cards Grid -->
      <h2 class="text-sm font-medium text-[#888] mb-4">{{ t('console.servicesHeading', 'Services') }}</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <!-- Account Workspace -->
        <router-link to="/app" class="group bg-[#0A0A0A] border border-[#333] rounded-md p-5 hover:border-[#666] hover:bg-[#111] transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded border border-[#333] flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-white">{{ t('console.serviceWorkspaceTitle', 'Account Workspace') }}</h3>
              <p class="text-xs text-[#888] mt-1 leading-relaxed">{{ t('console.serviceWorkspaceBody', 'Create accounts, build transactions, collect signatures, and broadcast operations') }}</p>
            </div>
            <svg class="w-4 h-4 text-[#333] group-hover:text-[#EDEDED] transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </router-link>

        <!-- Identity & DID -->
        <router-link to="/identity" class="group bg-[#0A0A0A] border border-[#333] rounded-md p-5 hover:border-[#666] hover:bg-[#111] transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded border border-[#333] flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-white">{{ t('console.serviceIdentityTitle', 'Identity & DID') }}</h3>
              <p class="text-xs text-[#888] mt-1 leading-relaxed">{{ t('console.serviceIdentityBody', 'Manage Web3Auth, NeoDID, and social recovery for your accounts') }}</p>
            </div>
            <svg class="w-4 h-4 text-[#333] group-hover:text-[#EDEDED] transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </router-link>

        <!-- Address Market -->
        <router-link to="/market" class="group bg-[#0A0A0A] border border-[#333] rounded-md p-5 hover:border-[#666] hover:bg-[#111] transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded border border-[#333] flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-white">{{ t('console.serviceMarketTitle', 'Address Market') }}</h3>
              <p class="text-xs text-[#888] mt-1 leading-relaxed">{{ t('console.serviceMarketBody', 'Browse, buy, and sell vanity AA addresses with on-chain escrow') }}</p>
            </div>
            <svg class="w-4 h-4 text-[#333] group-hover:text-[#EDEDED] transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </router-link>

        <!-- Plugins & Hooks -->
        <router-link :to="{ path: '/docs', query: { doc: 'pluginGuide' } }" class="group bg-[#0A0A0A] border border-[#333] rounded-md p-5 hover:border-[#666] hover:bg-[#111] transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded border border-[#333] flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-white">{{ t('console.servicePluginsTitle', 'Plugins & Hooks') }}</h3>
              <p class="text-xs text-[#888] mt-1 leading-relaxed">{{ t('console.servicePluginsBody', '10 verifiers and 6 hooks available — configure access control and policies') }}</p>
            </div>
            <svg class="w-4 h-4 text-[#333] group-hover:text-[#EDEDED] transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </router-link>

        <!-- Documentation -->
        <router-link to="/docs" class="group bg-[#0A0A0A] border border-[#333] rounded-md p-5 hover:border-[#666] hover:bg-[#111] transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded border border-[#333] flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-white">{{ t('console.serviceDocsTitle', 'Documentation') }}</h3>
              <p class="text-xs text-[#888] mt-1 leading-relaxed">{{ t('console.serviceDocsBody', 'Guides, API reference, and integration examples') }}</p>
            </div>
            <svg class="w-4 h-4 text-[#333] group-hover:text-[#EDEDED] transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </router-link>

        <!-- Block Explorer -->
        <a :href="explorerUrl" target="_blank" rel="noopener noreferrer" class="group bg-[#0A0A0A] border border-[#333] rounded-md p-5 hover:border-[#666] hover:bg-[#111] transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded border border-[#333] flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-[#EDEDED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-white">{{ t('console.serviceExplorerTitle', 'Block Explorer') }}</h3>
              <p class="text-xs text-[#888] mt-1 leading-relaxed">{{ t('console.serviceExplorerBody', 'View transactions, accounts, and contract state on Neo N3') }}</p>
            </div>
            <svg class="w-4 h-4 text-[#333] group-hover:text-[#EDEDED] transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </div>
        </a>
      </div>

      <!-- Quick Actions -->
      <h2 class="text-sm font-medium text-[#888] mb-4">{{ t('console.quickActionsHeading', 'Quick Actions') }}</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <router-link to="/app" class="text-center py-2.5 px-4 bg-[#000] border border-[#333] rounded-md hover:border-[#666] hover:bg-[#111] transition-all duration-200 text-xs text-[#EDEDED] font-medium">
          {{ t('console.quickCreateAccount', 'Create Account') }}
        </router-link>
        <router-link to="/app" class="text-center py-2.5 px-4 bg-[#000] border border-[#333] rounded-md hover:border-[#666] hover:bg-[#111] transition-all duration-200 text-xs text-[#EDEDED] font-medium">
          {{ t('console.quickManageGovernance', 'Manage Governance') }}
        </router-link>
        <router-link to="/identity" class="text-center py-2.5 px-4 bg-[#000] border border-[#333] rounded-md hover:border-[#666] hover:bg-[#111] transition-all duration-200 text-xs text-[#EDEDED] font-medium">
          {{ t('console.quickBindIdentity', 'Bind Identity') }}
        </router-link>
        <router-link to="/market" class="text-center py-2.5 px-4 bg-[#000] border border-[#333] rounded-md hover:border-[#666] hover:bg-[#111] transition-all duration-200 text-xs text-[#EDEDED] font-medium">
          {{ t('console.quickBrowseMarket', 'Browse Market') }}
        </router-link>
      </div>

      <!-- Recent Activity -->
      <h2 class="text-sm font-medium text-[#888] mb-4">{{ t('console.recentActivityHeading', 'Recent Activity') }}</h2>
      <div class="bg-[#0A0A0A] border border-[#333] rounded-md overflow-hidden">
        <div v-if="!isConnected" class="p-8 text-center">
          <svg class="w-8 h-8 text-[#333] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="text-sm text-[#888]">{{ t('console.activityConnectPrompt', 'Connect your wallet to see recent activity') }}</p>
        </div>
        <div v-else class="p-8 text-center">
          <svg class="w-8 h-8 text-[#333] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <p class="text-sm text-[#888]">{{ t('console.activityEmpty', 'No recent activity') }}</p>
        </div>
      </div>

      <!-- Network Status Footer -->
      <div class="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[#888]">
        <div class="flex items-center gap-4">
          <div role="status" aria-live="polite" class="flex items-center gap-2">
            <template v-if="networkOnline">
              <span class="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
              <span class="text-[#EDEDED] font-medium">{{ t('console.networkOnline', 'Online') }}</span>
              <span v-if="testnetSummary" class="font-mono">{{ t('console.tipPrefix', 'Tip #') }}{{ testnetSummary.chain_tip_block }}</span>
            </template>
            <template v-else-if="loadingStatus">
              <svg class="animate-spin h-3 w-3 text-[#888]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>{{ loadingStatus }}</span>
            </template>
            <template v-else-if="statusLoadFailed">
              <span class="w-1.5 h-1.5 rounded-full bg-[#f43f5e]"></span>
              <span class="text-[#f43f5e]">{{ t('console.networkOffline', 'Offline') }}</span>
              <button type="button" @click="retryNetworkStatus" class="text-white hover:underline transition-colors duration-200 ml-1">{{ t('console.retry', 'Retry') }}</button>
            </template>
          </div>
        </div>
        <router-link to="/docs" class="text-[#888] hover:text-white transition-colors duration-200 font-medium">
          {{ t('console.viewDocs', 'Documentation') }} &rarr;
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import { useWalletConnection } from '@/composables/useWalletConnection';
import { resolveRuntimeNetwork, RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { fetchTestnetStatus, fetchTestnetSummary } from '@/services/n3indexService.js';

const { t } = useI18n();
const { isConnected, truncatedAddress, connect: rawConnect, isConnecting: isWalletConnecting } = useWalletConnection();

const runtimeNetwork = resolveRuntimeNetwork();
const networkName = computed(() => runtimeNetwork === 'mainnet' ? 'Mainnet' : 'Testnet');
const networkLabel = computed(() => runtimeNetwork === 'mainnet'
  ? t('nav.networkMainnet', 'Neo N3 Mainnet')
  : t('nav.networkTestnet', 'Neo N3 Testnet')
);

const contractHashDisplay = RUNTIME_CONFIG.abstractAccountHash || '';
const contractHashShort = computed(() => {
  if (!contractHashDisplay) return '--';
  return `0x${contractHashDisplay.slice(0, 6)}...${contractHashDisplay.slice(-4)}`;
});

const explorerUrl = computed(() => {
  return runtimeNetwork === 'mainnet'
    ? 'https://explorer.onegate.space'
    : 'https://testnet.explorer.onegate.space';
});

// Network status
const testnetSummary = ref(null);
const testnetStatus = ref(null);
const statusLoadFailed = ref(false);
const loadingStatus = ref('Loading...');

const networkOnline = computed(() => !!(testnetSummary.value || testnetStatus.value));
const blockHeight = computed(() => {
  if (testnetSummary.value?.chain_tip_block) return String(testnetSummary.value.chain_tip_block);
  return '--';
});

onMounted(async () => {
  await loadNetworkStatus();
});

async function loadNetworkStatus() {
  loadingStatus.value = t('console.networkConnecting', 'Connecting to N3Index...');
  statusLoadFailed.value = false;
  try {
    const [summary, status] = await Promise.all([fetchTestnetSummary(), fetchTestnetStatus()]);
    testnetSummary.value = summary?.data || null;
    testnetStatus.value = status?.data || null;
    loadingStatus.value = null;
  } catch (_error) {
    if (import.meta.env.DEV) console.error('Console: testnet status fetch failed:', _error?.message);
    testnetSummary.value = null;
    testnetStatus.value = null;
    loadingStatus.value = null;
    statusLoadFailed.value = true;
  }
}

async function retryNetworkStatus() {
  await loadNetworkStatus();
}

async function connectWallet() {
  await rawConnect();
}
</script>
