<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
    <div class="mb-8">
      <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight mb-2">Abstract Account Studio</h1>
      <p class="text-lg text-slate-500 max-w-2xl">
        Design deterministic abstract accounts, register them on-chain, and manage governance with ease.
      </p>
    </div>

    <!-- Tabs -->
    <div class="mb-8">
      <nav class="flex space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200/60 w-fit" aria-label="Tabs">
        <button
          v-for="tab in studio.tabs"
          :key="tab.key"
          @click="studio.activePanel.value = tab.key"
          :class="[
            studio.activePanel.value === tab.key
              ? 'bg-neo-50 text-neo-700 shadow-sm ring-1 ring-neo-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
            'px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 transform active:scale-95'
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <div class="lg:grid lg:grid-cols-12 lg:gap-8">
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
import { useStudioController } from '@/features/studio/useStudioController';

const CreateAccountPanel = defineAsyncComponent(() => import('@/features/studio/components/CreateAccountPanel.vue'));
const ManageGovernancePanel = defineAsyncComponent(() => import('@/features/studio/components/ManageGovernancePanel.vue'));
const PermissionsLimitsPanel = defineAsyncComponent(() => import('@/features/studio/components/PermissionsLimitsPanel.vue'));
const ContractSourcePanel = defineAsyncComponent(() => import('@/features/studio/components/ContractSourcePanel.vue'));
const StudioSidebar = defineAsyncComponent(() => import('@/features/studio/components/StudioSidebar.vue'));

const studio = useStudioController();
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
