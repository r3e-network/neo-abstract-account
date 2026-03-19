<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up relative z-10 dark-panel-override">
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biconomy-orange/20 text-biconomy-orange text-sm font-semibold border border-biconomy-orange/40 shadow-sm backdrop-blur-sm mb-4">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-biconomy-orange opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-biconomy-orange"></span>
            </span>
            {{ t('studio.powered', 'Neo N3 Powered') }}
          </div>
          <h1 class="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2 drop-shadow-lg uppercase font-outfit">{{ t('studio.title', 'Abstract Account Workspace') }}</h1>
          <p class="text-base md:text-lg text-biconomy-muted max-w-3xl leading-relaxed">
            {{ t('studio.subtitle', 'Construct transactions, execute operations, and manage deterministic smart-contract accounts with ease.') }}
          </p>
        </div>
      </div>

      <nav class="flex space-x-2 bg-biconomy-panel/60 p-1.5 rounded-xl shadow-lg border border-biconomy-border backdrop-blur-xl w-fit" aria-label="Tabs">
        <button
          v-for="tab in studio.tabs"
          :key="tab.key"
          @click="studio.activePanel.value = tab.key"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 transform active:scale-95"
          :class="[
            studio.activePanel.value === tab.key
              ? 'bg-biconomy-orange/20 text-biconomy-orange shadow-[inset_0_0_10px_rgba(0,255,102,0.1)] ring-1 ring-biconomy-orange/50'
              : 'text-biconomy-muted hover:text-white hover:bg-biconomy-dark'
          ]"
        >
          <component :is="getTabIcon(tab.key)" class="w-4 h-4" />
          {{ tabLabel(tab) }}
        </button>
      </nav>
    </div>

    <div v-if="studio.activePanel.value === 'operations'" class="w-full">
      <transition name="fade-slide" mode="out-in">
        <HomeOperationsWorkspace />
      </transition>
    </div>

    <div v-else class="lg:grid lg:grid-cols-12 lg:gap-8">
      <main class="lg:col-span-8 xl:col-span-9 space-y-6 relative">
        <transition name="fade-slide" mode="out-in">
          <CreateAccountPanel v-if="studio.activePanel.value === 'create'" />
          <ManageGovernancePanel v-else-if="studio.activePanel.value === 'manage'" />
          <PermissionsLimitsPanel v-else-if="studio.activePanel.value === 'permissions'" />
          <ContractSourcePanel v-else-if="studio.activePanel.value === 'source'" />
        </transition>
      </main>

      <StudioSidebar />
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent, provide, h } from 'vue';
import { useI18n } from '@/i18n';
import { useStudioController } from '@/features/studio/useStudioController';

const HomeOperationsWorkspace = defineAsyncComponent(() => import('@/features/operations/components/HomeOperationsWorkspace.vue'));
const CreateAccountPanel = defineAsyncComponent(() => import('@/features/studio/components/CreateAccountPanel.vue'));
const ManageGovernancePanel = defineAsyncComponent(() => import('@/features/studio/components/ManageGovernancePanel.vue'));
const PermissionsLimitsPanel = defineAsyncComponent(() => import('@/features/studio/components/PermissionsLimitsPanel.vue'));
const ContractSourcePanel = defineAsyncComponent(() => import('@/features/studio/components/ContractSourcePanel.vue'));
const StudioSidebar = defineAsyncComponent(() => import('@/features/studio/components/StudioSidebar.vue'));

const studio = useStudioController();
const { t } = useI18n();

function tabLabel(tab = {}) {
  return t(`studio.tabs.${tab.key}`, tab.label || tab.key || 'Tab');
}

function getTabIcon(key) {
  const icons = {
    operations: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', innerHTML: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>' }),
    create: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', innerHTML: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>' }),
    manage: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', innerHTML: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>' }),
    permissions: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', innerHTML: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>' }),
    source: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', innerHTML: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>' }),
  };
  return icons[key] || icons.operations;
}

provide('studio', studio);
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-15px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(15px);
}
</style>
