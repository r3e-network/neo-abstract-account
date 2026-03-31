<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up relative z-10">
    <!-- Console Header -->
    <div class="mb-10">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aa-orange/20 text-aa-orange text-sm font-semibold border border-aa-orange/40 shadow-sm backdrop-blur-sm mb-4">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-aa-orange opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-aa-orange"></span>
            </span>
            {{ t('console.powered', 'Console') }}
          </div>
          <h1 class="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2 font-outfit">{{ t('console.title', 'Abstract Account Console') }}</h1>
          <p class="text-base text-aa-muted max-w-3xl leading-relaxed">{{ t('console.subtitle', 'Create, configure, and operate programmable smart-contract accounts on Neo N3.') }}</p>
        </div>
      </div>
    </div>

    <!-- Service Cards Grid -->
    <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-12">
      <router-link
        v-for="service in consoleServices"
        :key="service.to"
        :to="service.to"
        class="group gradient-border-card bg-aa-panel/60 backdrop-blur-xl p-6 transition-all duration-200 hover:bg-aa-panel/80 hover:shadow-lg flex flex-col"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-200" :class="service.accentBg">
            <svg aria-hidden="true" class="w-6 h-6" :class="service.accentText" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="service.icon"></svg>
          </div>
          <svg aria-hidden="true" class="w-5 h-5 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" :class="service.accentText" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </div>
        <h3 class="text-base font-bold text-white mb-2 font-outfit">{{ service.title }}</h3>
        <p class="text-sm text-aa-muted leading-relaxed flex-1">{{ service.body }}</p>
        <span class="mt-4 inline-flex items-center text-xs font-semibold transition-colors duration-200" :class="service.accentText">
          {{ service.action }} &rarr;
        </span>
      </router-link>
    </div>

    <!-- Quick Status Bar -->
    <div class="gradient-border-card bg-aa-panel/40 backdrop-blur-xl p-5 mb-10">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div role="status" aria-live="polite" class="flex items-center gap-2">
            <template v-if="testnetSummary || testnetStatus">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-aa-success opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-aa-success"></span>
              </span>
              <span class="text-xs font-semibold text-aa-success">{{ t('console.networkOnline', 'Network Online') }}</span>
              <span v-if="testnetSummary" class="text-xs text-aa-muted font-mono">{{ t('console.tipPrefix', 'Tip #') }}{{ testnetSummary.chain_tip_block }}</span>
            </template>
            <template v-else-if="loadingStatus">
              <svg aria-hidden="true" class="animate-spin h-3 w-3 text-aa-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span class="text-xs text-aa-muted">{{ loadingStatus }}</span>
            </template>
            <template v-else-if="statusLoadFailed">
              <span class="relative flex h-2 w-2">
                <span class="relative inline-flex rounded-full h-2 w-2 bg-aa-muted"></span>
              </span>
              <span class="text-xs text-aa-muted">{{ t('console.networkOffline', 'Offline') }}</span>
              <button type="button" @click="retryNetworkStatus" class="text-aa-orange hover:text-aa-lightOrange transition-colors duration-200 underline underline-offset-2 text-xs ml-1">{{ t('console.retry', 'Retry') }}</button>
            </template>
          </div>
        </div>
        <router-link to="/docs" class="text-xs font-semibold text-aa-muted hover:text-aa-text transition-colors duration-200">
          {{ t('console.viewDocs', 'Documentation') }} &rarr;
        </router-link>
      </div>
    </div>

    <!-- Recent Actions / Getting Started -->
    <div class="gradient-border-card bg-aa-panel/40 backdrop-blur-xl overflow-hidden">
      <div class="px-6 py-5 border-b border-aa-border/60">
        <h2 class="text-lg font-bold text-white font-outfit">{{ t('console.gettingStartedTitle', 'Getting Started') }}</h2>
        <p class="text-sm text-aa-muted mt-1">{{ t('console.gettingStartedSubtitle', 'Follow these steps to deploy your first Abstract Account.') }}</p>
      </div>
      <div class="p-6">
        <div class="grid gap-4 md:grid-cols-4">
          <div v-for="(step, idx) in gettingStartedSteps" :key="idx" class="relative flex flex-col items-center text-center p-4 rounded-xl bg-aa-dark/30 border border-aa-border/40 hover:border-aa-border transition-all duration-200 group">
            <div class="w-10 h-10 rounded-full bg-aa-orange/10 border border-aa-orange/30 flex items-center justify-center text-sm font-bold text-aa-orange font-mono mb-3 group-hover:bg-aa-orange/15 group-hover:border-aa-orange/40 transition-all duration-200">{{ idx + 1 }}</div>
            <h3 class="text-sm font-bold text-aa-text mb-1">{{ step.title }}</h3>
            <p class="text-xs text-aa-muted leading-relaxed">{{ step.body }}</p>
            <router-link v-if="step.link" :to="step.link" class="mt-3 text-xs font-semibold text-aa-orange hover:text-aa-lightOrange transition-colors duration-200">
              {{ step.action }} &rarr;
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import { fetchTestnetStatus, fetchTestnetSummary } from '@/services/n3indexService.js';

const { t } = useI18n();

const consoleServices = computed(() => [
  {
    to: '/app',
    title: t('console.serviceWorkspaceTitle', 'App Workspace'),
    body: t('console.serviceWorkspaceBody', 'Create accounts, compose transactions, collect signatures, and broadcast via relay with paymaster sponsorship.'),
    action: t('console.serviceWorkspaceAction', 'Open Workspace'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>',
    accentBg: 'bg-aa-orange/10 border-aa-orange/20 group-hover:bg-aa-orange/15 group-hover:border-aa-orange/30',
    accentText: 'text-aa-orange',
  },
  {
    to: '/identity',
    title: t('console.serviceIdentityTitle', 'Identity Workspace'),
    body: t('console.serviceIdentityBody', 'Connect Web3Auth or NeoDID identity, manage verifier state, and configure recovery flows.'),
    action: t('console.serviceIdentityAction', 'Open Identity'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>',
    accentBg: 'bg-aa-info/10 border-aa-info/20 group-hover:bg-aa-info/15 group-hover:border-aa-info/30',
    accentText: 'text-aa-info',
  },
  {
    to: '/market',
    title: t('console.serviceMarketTitle', 'Address Market'),
    body: t('console.serviceMarketBody', 'List AA addresses in trustless on-chain escrow, browse listings, and settle transfers.'),
    action: t('console.serviceMarketAction', 'Browse Market'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>',
    accentBg: 'bg-neo-500/10 border-neo-500/20 group-hover:bg-neo-500/15 group-hover:border-neo-500/30',
    accentText: 'text-neo-400',
  },
  {
    to: { path: '/docs', query: { doc: 'pluginGuide' } },
    title: t('console.servicePluginsTitle', 'Hooks & Plugins'),
    body: t('console.servicePluginsBody', 'Choose verifier plugins, configure hook policies, and set up recovery strategies for your accounts.'),
    action: t('console.servicePluginsAction', 'Read Guide'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>',
    accentBg: 'bg-aa-warning/10 border-aa-warning/20 group-hover:bg-aa-warning/15 group-hover:border-aa-warning/30',
    accentText: 'text-aa-warning',
  },
  {
    to: '/docs',
    title: t('console.serviceDocsTitle', 'Documentation'),
    body: t('console.serviceDocsBody', 'Full API reference, contract documentation, and integration guides for developers.'),
    action: t('console.serviceDocsAction', 'Read Docs'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>',
    accentBg: 'bg-aa-success/10 border-aa-success/20 group-hover:bg-aa-success/15 group-hover:border-aa-success/30',
    accentText: 'text-aa-success',
  },
]);

const gettingStartedSteps = computed(() => [
  {
    title: t('console.step1Title', 'Connect Wallet'),
    body: t('console.step1Body', 'Link your Neo wallet or Web3Auth DID to get started.'),
    link: '/app',
    action: t('console.step1Action', 'Connect'),
  },
  {
    title: t('console.step2Title', 'Create Account'),
    body: t('console.step2Body', 'Deploy a programmable AA with your chosen verifier and hooks.'),
    link: '/app',
    action: t('console.step2Action', 'Create'),
  },
  {
    title: t('console.step3Title', 'Configure'),
    body: t('console.step3Body', 'Set governance, permissions, backup owner, and escape timelock.'),
    link: '/app',
    action: t('console.step3Action', 'Configure'),
  },
  {
    title: t('console.step4Title', 'Operate'),
    body: t('console.step4Body', 'Compose transactions, collect signatures, and broadcast via relay.'),
    link: '/app',
    action: t('console.step4Action', 'Operate'),
  },
]);

// Network status
const testnetSummary = ref(null);
const testnetStatus = ref(null);
const statusLoadFailed = ref(false);
const loadingStatus = ref('Loading...');

onMounted(async () => {
  await loadNetworkStatus();
});

async function loadNetworkStatus() {
  loadingStatus.value = t('console.connecting', 'Connecting to N3Index...');
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
</script>
