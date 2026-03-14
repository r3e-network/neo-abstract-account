<template>
  <div class="relative min-h-screen bg-slate-900 overflow-hidden font-sans text-biconomy-text">
    <!-- Premium background elements -->
    <div class="absolute inset-0 z-0">
      <div class="absolute top-0 right-1/4 w-[600px] h-[600px] bg-vibrant-glow rounded-full mix-blend-screen opacity-60 animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-vibrant-glow rounded-full mix-blend-screen opacity-40 animate-pulse-slow object-none transform translate-y-1/2 -translate-x-1/2" style="animation-delay: 1.5s"></div>
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-60"></div>
    </div>

    <!-- Main Content -->
    <div class="relative pt-16 pb-20 sm:pb-24 lg:pb-32 z-10">
      <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Hero Section -->
        <section class="mb-16 text-center animate-fade-in-up">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 backdrop-blur-md text-biconomy-text text-xs font-semibold mb-8 shadow-sm">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-neo-500"></span>
            </span>
            {{ t('home.powered', 'Neo N3 Powered') }}
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6 font-outfit drop-shadow-lg">
            {{ t('home.title', 'Abstract Account Workspace') }}
          </h1>
          <p class="text-lg md:text-xl text-biconomy-muted max-w-3xl mx-auto leading-relaxed font-light">
            {{ t('home.subtitle', 'Load an Abstract Account, compose operations, collect Neo and EVM approvals, and broadcast seamlessly.') }}
          </p>
          <div class="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/70 px-4 py-2 text-xs font-semibold text-biconomy-text backdrop-blur-md">
            <span class="text-emerald-400">N3Index</span>
            <span>Live testnet</span>
            <span v-if="testnetSummary">Tip {{ testnetSummary.chain_tip_block }} · Indexed {{ testnetSummary.indexed_tx_count }}</span>
            <span v-else-if="testnetStatus">Lag {{ testnetStatus.lag_blocks }}</span>
            <span v-else>Connecting to live network summary…</span>
          </div>
          <div class="mx-auto mt-6 max-w-4xl rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5 text-left shadow-[0_0_25px_rgba(16,185,129,0.12)] backdrop-blur-md">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-emerald-300">{{ t('home.paymasterValidationLabel', 'Live-Validated Paymaster Path') }}</p>
                <h2 class="mt-2 text-lg font-bold text-white">{{ t('home.paymasterValidationTitle', 'AA + Morpheus paymaster is verified on Neo N3 testnet') }}</h2>
                <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                  {{ t('home.paymasterValidationBody', 'The current workspace path has passed live validation for registerAccount, updateVerifier, remote allowlist update, paymaster authorization, relay submission, and on-chain executeUserOp execution.') }}
                </p>
                <code class="mt-3 block break-all rounded-xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-xs font-medium text-emerald-300 shadow-inner">
                  {{ t('home.paymasterValidationTx', 'Latest full-path relay tx: 0x057d4a581efbe815fad0148a3766284da2a33335e72fb50e54d476078d8f40d4') }}
                </code>
              </div>
              <div class="flex shrink-0 flex-wrap items-center gap-3">
                <router-link
                  class="inline-flex items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-300/60 hover:bg-emerald-400/15"
                  :to="{ path: '/docs', query: { doc: 'paymasterValidation' } }"
                >
                  {{ t('home.paymasterValidationLink', 'Open Validation Ledger') }}
                </router-link>
                <a
                  v-if="latestPaymasterRelayExplorerUrl"
                  class="inline-flex items-center rounded-xl border border-slate-600/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
                  :href="latestPaymasterRelayExplorerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ t('home.paymasterValidationExplorer', 'Open Explorer Tx') }}
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Main Workspace -->
        <section class="mb-20 animate-fade-in-up" style="animation-delay: 0.15s">
          <HomeOperationsWorkspace />
        </section>

        <!-- Architecture Description -->
        <section class="relative rounded-2xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-8 md:p-14 overflow-hidden mx-auto max-w-5xl shadow-2xl animate-fade-in-up" style="animation-delay: 0.3s">
          <div class="absolute inset-0 bg-subtle-glass pointer-events-none"></div>
          <div class="relative z-10 text-center mb-12">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.architectureTitle', 'How Abstract Accounts Work on Neo N3') }}</h2>
            <div class="mt-4 h-1 w-20 bg-gradient-to-r from-neo-500 to-transparent mx-auto rounded-full"></div>
            <p class="text-biconomy-muted mt-6 text-base max-w-2xl mx-auto leading-relaxed">
              {{ t('home.architectureSubtitle', 'The home workspace stages V3 executeUserOp calls against the UnifiedSmartWallet core, while verifier plugins, hook plugins, backup-owner recovery, and deterministic verification stay enforced by the master contract pipeline.') }}
            </p>
          </div>
          <div class="relative z-10 bg-slate-900/50 rounded-xl p-4 md:p-8 border border-slate-700/50 shadow-inner">
            <ArchitectureDiagram />
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent, onMounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import { fetchTestnetStatus, fetchTestnetSummary } from '@/services/n3indexService.js';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig.js';
import { buildTransactionExplorerUrl } from '@/features/operations/explorer.js';

const HomeOperationsWorkspace = defineAsyncComponent(() => import('@/features/operations/components/HomeOperationsWorkspace.vue'));
const ArchitectureDiagram = defineAsyncComponent(() => import('@/components/ArchitectureDiagram.vue'));
const { t } = useI18n();
const testnetSummary = ref(null);
const testnetStatus = ref(null);
const latestPaymasterRelayTxid = '0x057d4a581efbe815fad0148a3766284da2a33335e72fb50e54d476078d8f40d4';
const latestPaymasterRelayExplorerUrl = buildTransactionExplorerUrl(RUNTIME_CONFIG.explorerBaseUrl, latestPaymasterRelayTxid);

onMounted(async () => {
  try {
    const [summary, status] = await Promise.all([fetchTestnetSummary(), fetchTestnetStatus()]);
    testnetSummary.value = summary?.data || null;
    testnetStatus.value = status?.data || null;
  } catch (_error) {
    testnetSummary.value = null;
    testnetStatus.value = null;
  }
});
</script>
