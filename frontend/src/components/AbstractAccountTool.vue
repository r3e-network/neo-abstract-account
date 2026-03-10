<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up relative z-10 dark-panel-override">
    <div class="mb-10">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neo-500/20 text-neo-300 text-sm font-semibold mb-6 border border-neo-500/40 shadow-sm backdrop-blur-sm">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-neo-500"></span>
        </span>
        {{ t('studio.powered', 'Neo N3 Powered') }}
      </div>
      <h1 class="font-outfit text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-300 to-white tracking-tight mb-4 drop-shadow-md pb-1">{{ t('studio.title', 'Abstract Account Workspace') }}</h1>
      <p class="text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed">
        {{ t('studio.subtitle', 'Construct transactions, execute operations, and manage deterministic smart-contract accounts with ease.') }}
      </p>
    </div>

    <!-- Tabs -->
    <div class="mb-8 relative z-10">
      <nav class="flex space-x-2 bg-slate-800/60 p-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-slate-700/50 backdrop-blur-xl w-fit" aria-label="Tabs">
        <button
          v-for="tab in studio.tabs"
          :key="tab.key"
          @click="studio.activePanel.value = tab.key"
          :class="[
            studio.activePanel.value === tab.key
              ? 'bg-neo-500/20 text-neo-400 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)] ring-1 ring-neo-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
            'px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 transform active:scale-95'
          ]"
        >
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
import { defineAsyncComponent, provide } from 'vue';
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
