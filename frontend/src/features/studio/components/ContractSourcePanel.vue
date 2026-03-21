<template>
  <section class="bg-aa-panel/60 shadow-glow-blue rounded-lg overflow-hidden border border-aa-border flex flex-col min-h-[400px] max-h-[700px] backdrop-blur-xl">
    <div class="px-6 py-5 border-b border-aa-border bg-aa-panel/40 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-white">{{ t('studioPanels.contractExplorer', 'Contract Explorer') }}</h2>
        <p class="text-xs text-aa-muted font-medium font-mono mt-1">{{ t('studioPanels.contractModules', 'C# Smart Contract Modules') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-aa-muted">{{ contractFiles.length }} {{ t('studioPanels.filesLabel', 'files') }}</span>
      </div>
    </div>
    <div v-if="contractFiles.length === 0" class="flex flex-col items-center justify-center flex-1 text-center py-16">
      <svg aria-hidden="true" class="w-12 h-12 text-aa-muted/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      <p class="text-sm font-semibold text-aa-muted">{{ t('studioPanels.noContractFiles', 'No contract files loaded') }}</p>
      <p class="text-xs text-aa-muted/60 mt-1">{{ t('studioPanels.noContractFilesHint', 'Contract source will appear here once available') }}</p>
    </div>
    <div v-else class="flex flex-col md:flex-row flex-1 min-h-0">
      <div class="md:hidden px-4 py-3 bg-aa-panel/50 border-b border-aa-border">
        <label for="mobile-file-select" class="sr-only">{{ t('studioPanels.selectFile', 'Select file') }}</label>
        <select
          id="mobile-file-select"
          :value="activeFileIdx"
          class="input-field w-full font-mono text-sm py-2 px-3 bg-aa-dark"
          @change="activeFileIdx = Number($event.target.value)"
        >
          <option v-for="(file, idx) in contractFiles" :key="file.name" :value="idx">{{ file.name }}</option>
        </select>
      </div>
      <div class="md:w-72 bg-aa-dark/40 border-r border-aa-border overflow-y-auto hidden md:block custom-scrollbar-dark">
        <nav class="flex-1 p-3 space-y-1">
          <button
            v-for="(file, idx) in contractFiles"
            :key="file.name"
            :aria-label="file.name"
            @click="activeFileIdx = idx"
            :class="[
              activeFileIdx === idx ? 'bg-aa-orange/20 text-aa-orange font-bold shadow-sm ring-1 ring-aa-orange/40' : 'text-aa-muted hover:bg-aa-panel/60 hover:text-aa-text font-medium',
              'group w-full flex items-center px-3 py-2.5 text-[13px] rounded-lg font-mono text-left transition-all duration-200'
            ]"
          >
            <svg aria-hidden="true" class="w-4 h-4 mr-2 opacity-70 flex-shrink-0" :class="activeFileIdx === idx ? 'text-aa-orange' : 'text-aa-muted'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="truncate" :title="file.name">{{ file.name }}</span>
          </button>
        </nav>
      </div>
      <div class="flex-1 bg-aa-dark flex flex-col min-w-0">
        <div class="flex items-center justify-between px-4 py-3 bg-aa-panel/50 border-b border-aa-border">
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono text-aa-muted bg-aa-dark/50 px-3 py-1.5 rounded">{{ contractFiles[activeFileIdx]?.name }}</span>
          </div>
          <button type="button" :aria-label="t('studioPanels.ariaCopySource', 'Copy contract source')" class="inline-flex items-center gap-2 text-xs font-semibold text-aa-text hover:text-aa-text px-3 py-1.5 rounded-lg bg-aa-panel/50 hover:bg-aa-panel/80 transition-colors duration-200" @click="copyCode">
            <svg v-if="copiedKey !== 'code'" aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <svg v-else aria-hidden="true" class="w-4 h-4 text-aa-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            {{ copiedKey === 'code' ? t('studioPanels.copied', 'Copied!') : t('studioPanels.copyCode', 'Copy Code') }}
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4 md:p-6 text-[13px] font-mono text-aa-text custom-scrollbar-dark">
          <highlightjs autodetect :code="contractFiles[activeFileIdx]?.content" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject, watch } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();
import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('csharp', csharp);
const highlightjs = hljsVuePlugin.component;

const studio = inject('studio');
const {
  activeFileIdx,
  contractFiles,
  copiedKey,
  copyCode
} = studio;

watch(() => contractFiles.length, (len) => {
  if (len > 0 && activeFileIdx.value > len - 1) {
    activeFileIdx.value = len - 1;
  }
});
</script>

<style scoped>
:deep(.hljs) {
  background: transparent !important;
  padding: 0;
}
</style>