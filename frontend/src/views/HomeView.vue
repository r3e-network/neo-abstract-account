<template>
  <div class="relative min-h-screen overflow-hidden font-sans text-slate-300">
    <!-- Premium background elements -->
    <div class="absolute inset-0 z-0">
      <div class="absolute top-0 right-1/4 w-[600px] h-[600px] bg-vibrant-glow rounded-full mix-blend-screen opacity-50 animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-glow rounded-full mix-blend-screen opacity-30 animate-pulse-slow object-none transform translate-y-1/2 -translate-x-1/2" style="animation-delay: 1.5s"></div>
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-40"></div>
    </div>

    <!-- Main Content -->
    <div class="relative pt-16 pb-20 sm:pb-24 lg:pb-32 z-10">
      <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Hero Section -->
        <section class="mb-16 text-center animate-fade-in-up">
          <div class="inline-flex items-center gap-3 px-5 py-2 rounded border border-ata-border bg-ata-panel/80 backdrop-blur-md text-white text-xs font-mono tracking-widest uppercase mb-8 shadow-sm">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-ata-green opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-ata-green"></span>
            </span>
            {{ t('home.powered', 'NEO N3 POWERED') }}
          </div>
          <h1 class="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6 drop-shadow-lg uppercase">
            {{ t('home.title', 'ABSTRACT ACCOUNT WORKSPACE') }}
          </h1>
          <p class="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            {{ t('home.subtitle', 'Load an Abstract Account, compose operations, collect Neo and EVM approvals, and broadcast seamlessly.') }}
          </p>
          <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
            <div class="inline-flex items-center gap-3 rounded border border-ata-border bg-ata-panel/80 px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 backdrop-blur-md">
              <span class="text-ata-blue font-bold">N3INDEX</span>
              <span class="h-4 w-px bg-ata-border"></span>
              <span>LIVE TESTNET</span>
              <span class="h-4 w-px bg-ata-border"></span>
              <span v-if="testnetSummary" class="text-ata-green">TIP {{ testnetSummary.chain_tip_block }} · IDX {{ testnetSummary.indexed_tx_count }}</span>
              <span v-else-if="testnetStatus" class="text-amber-400">LAG {{ testnetStatus.lag_blocks }}</span>
              <span v-else class="text-slate-400">CONNECTING...</span>
            </div>
          </div>
        </section>

        <!-- Main Workspace -->
        <section class="mb-20 animate-fade-in-up" style="animation-delay: 0.15s">
          <HomeOperationsWorkspace />
        </section>

        <!-- Architecture Description -->
        <section class="relative rounded-lg bg-ata-panel/40 backdrop-blur-xl border border-ata-border p-8 md:p-14 overflow-hidden mx-auto max-w-5xl shadow-2xl animate-fade-in-up" style="animation-delay: 0.3s">
          <div class="absolute inset-0 bg-subtle-glass pointer-events-none"></div>
          <div class="relative z-10 text-center mb-12">
            <h2 class="text-2xl md:text-3xl font-bold text-white uppercase tracking-tight tracking-widest font-mono">{{ t('home.architectureTitle', 'HOW ABSTRACT ACCOUNTS WORK') }}</h2>
            <div class="mt-6 h-0.5 w-24 bg-gradient-to-r from-ata-blue to-ata-green mx-auto"></div>
            <p class="text-slate-400 mt-6 text-base max-w-2xl mx-auto leading-relaxed">
              {{ t('home.architectureSubtitle', 'The home workspace stages AA wrapper calls like executeByAddress. Governance, policy checks, and deterministic verification stay enforced by the master contract pipeline.') }}
            </p>
          </div>
          <div class="relative z-10 bg-ata-dark/80 rounded border border-ata-border p-4 md:p-8 shadow-inner">
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
