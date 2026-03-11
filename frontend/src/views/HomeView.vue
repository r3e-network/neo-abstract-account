<template>
  <div class="relative min-h-screen bg-slate-900 overflow-hidden font-sans text-slate-300">
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
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 backdrop-blur-md text-slate-300 text-xs font-semibold mb-8 shadow-sm">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-neo-500"></span>
            </span>
            {{ t('home.powered', 'Neo N3 Powered') }}
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6 font-outfit drop-shadow-lg">
            {{ t('home.title', 'Abstract Account Workspace') }}
          </h1>
          <p class="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-light">
            {{ t('home.subtitle', 'Load an Abstract Account, compose operations, collect Neo and EVM approvals, and broadcast seamlessly.') }}
          </p>
          <div class="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/70 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md">
            <span class="text-emerald-400">N3Index</span>
            <span>Live testnet</span>
            <span v-if="testnetSummary">Tip {{ testnetSummary.chain_tip_block }} · Indexed {{ testnetSummary.indexed_tx_count }}</span>
            <span v-else-if="testnetStatus">Lag {{ testnetStatus.lag_blocks }}</span>
            <span v-else>Connecting to live network summary…</span>
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
            <p class="text-slate-400 mt-6 text-base max-w-2xl mx-auto leading-relaxed">
              {{ t('home.architectureSubtitle', 'The home workspace stages AA wrapper calls like executeUnifiedByAddress. Governance, policy checks, and deterministic verification stay enforced by the master contract pipeline.') }}
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

const HomeOperationsWorkspace = defineAsyncComponent(() => import('@/features/operations/components/HomeOperationsWorkspace.vue'));
const ArchitectureDiagram = defineAsyncComponent(() => import('@/components/ArchitectureDiagram.vue'));
const { t } = useI18n();
const testnetSummary = ref(null);
const testnetStatus = ref(null);

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
