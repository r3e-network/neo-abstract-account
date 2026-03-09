<template>
  <div class="bg-slate-50 relative min-h-screen">
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neo-300/20 rounded-full blur-[120px] mix-blend-multiply"></div>
        <div class="absolute top-[20%] right-[-5%] w-[35%] h-[35%] bg-blue-300/20 rounded-full blur-[120px] mix-blend-multiply"></div>
        <div class="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-teal-300/15 rounded-full blur-[140px] mix-blend-multiply"></div>
      </div>

      <div class="relative pt-12 pb-16 sm:pb-24 lg:pb-28 z-10">
        <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section class="mb-12 text-center animate-fade-in-up">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neo-100/80 text-neo-800 text-sm font-semibold mb-6 border border-neo-200/50 shadow-sm backdrop-blur-sm">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-500 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-neo-600"></span>
              </span>
              {{ t('home.powered', 'Neo N3 Powered') }}
            </div>
            <h1 class="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 tracking-tight mb-4 drop-shadow-sm pb-1">{{ t('home.title', 'Abstract Account Workspace') }}</h1>
            <p class="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              {{ t('home.subtitle', 'Load an Abstract Account, compose wrapped operations, collect mixed Neo + EVM approvals, persist anonymous drafts, and choose the final client-side or relay submission path from one app-first home screen.') }}
            </p>
          </section>

          <section class="mb-16">
            <HomeOperationsWorkspace />
          </section>

          <section class="relative rounded-2xl bg-white shadow-2xl border border-slate-200 p-8 md:p-12 overflow-hidden mx-auto max-w-5xl">
            <div class="text-center mb-8">
              <h2 class="text-2xl md:text-3xl font-bold text-slate-900">{{ t('home.architectureTitle', 'How Abstract Accounts Work on Neo N3') }}</h2>
              <p class="text-slate-500 mt-2 text-sm max-w-3xl mx-auto">
                {{ t('home.architectureSubtitle', 'The home workspace stages hardened AA wrapper calls like executeByAddress and relay-ready executeMetaTxByAddress flows, while governance, policy checks, and deterministic verification stay enforced by the master contract pipeline.') }}
              </p>
            </div>
            <ArchitectureDiagram />
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
import { useI18n } from '@/i18n';

const HomeOperationsWorkspace = defineAsyncComponent(() => import('@/features/operations/components/HomeOperationsWorkspace.vue'));
const ArchitectureDiagram = defineAsyncComponent(() => import('@/components/ArchitectureDiagram.vue'));
const { t } = useI18n();
</script>
