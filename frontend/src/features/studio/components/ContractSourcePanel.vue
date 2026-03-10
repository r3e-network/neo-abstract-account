<template>
  <section class="bg-slate-800/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-slate-700/50 flex flex-col h-[700px] backdrop-blur-xl dark-panel-override">
    <div class="px-6 py-5 border-b border-slate-700/50 bg-slate-800/40 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-slate-100 font-outfit">Contract Explorer</h2>
        <p class="text-xs text-slate-400 font-medium font-mono">C# Smart Contract Modules</p>
      </div>
    </div>
    <div class="flex flex-col md:flex-row flex-1 min-h-0">
      <div class="md:w-72 bg-slate-900/40 border-r border-slate-700/50 overflow-y-auto hidden md:block custom-scrollbar-dark">
        <nav class="flex-1 p-3 space-y-1">
          <button
            v-for="(file, idx) in contractFiles"
            :key="file.name"
            @click="activeFileIdx = idx"
            :class="[
              activeFileIdx === idx ? 'bg-neo-500/20 text-neo-300 font-bold shadow-sm ring-1 ring-neo-500/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 font-medium',
              'group w-full flex items-center px-3 py-2.5 text-[13px] rounded-lg font-mono text-left transition-all duration-200'
            ]"
          >
            <svg class="w-4 h-4 mr-2 opacity-70" :class="activeFileIdx === idx ? 'text-neo-600' : 'text-slate-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="truncate" :title="file.name">{{ file.name }}</span>
          </button>
        </nav>
      </div>
      <div class="flex-1 bg-slate-900 flex flex-col min-w-0">
        <div class="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div class="flex items-center gap-2">
            <div class="flex gap-1.5 mr-2">
              <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
            </div>
            <span class="text-xs font-mono text-slate-400">{{ contractFiles[activeFileIdx]?.name }}</span>
          </div>
          <button type="button" class="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors" @click="copyCode">
            {{ copied ? 'Copied!' : 'Copy Code' }}
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4 md:p-6 text-[13px] font-mono text-slate-300 custom-scrollbar-dark">
          <highlightjs autodetect :code="contractFiles[activeFileIdx]?.content" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
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
  copied,
  copyCode
} = studio;
</script>

<style scoped>
/* Base custom scrollbar for code explorer */
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #30363d;
  border-radius: 10px;
  border: 2px solid #0d1117;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #484f58;
}

:deep(.hljs) {
  background: transparent !important;
  padding: 0;
}
</style>