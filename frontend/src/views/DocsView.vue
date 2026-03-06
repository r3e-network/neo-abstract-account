<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
    <div class="flex flex-col md:flex-row gap-8">
      
      <!-- Side Navigation -->
      <aside class="md:w-64 flex-shrink-0">
        <div class="sticky top-24 bg-white p-5 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200/60">
          <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 px-2">Documentation</h3>
          <nav class="space-y-1">
            <button
              v-for="(doc, key) in docs"
              :key="key"
              @click="activeDoc = key"
              :class="[
                activeDoc === key
                  ? 'bg-neo-50 text-neo-700 font-bold border-l-4 border-neo-500'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent font-medium',
                'w-full flex items-center px-3 py-2.5 text-sm rounded-r-lg transition-all duration-200 text-left'
              ]"
            >
              {{ doc.title }}
            </button>
          </nav>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 min-w-0">
        <div class="prose prose-slate prose-neo max-w-none bg-white p-8 sm:p-12 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200/60 min-h-[600px]">
          <transition name="fade" mode="out-in" @after-enter="renderMermaidDiagrams">
            <div :key="activeDoc">
              <div ref="contentRoot" v-html="compiledMarkdown" class="markdown-body custom-scrollbar"></div>
            </div>
          </transition>
        </div>
      </main>

    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import mermaid from 'mermaid';
import { DOCS, DEFAULT_DOC_KEY } from '@/features/docs/registry';
import { sanitizeRenderedHtml } from '@/features/docs/rendering';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang === 'mermaid') {
        return code; // Do not highlight or wrap mermaid text
      }
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

// We override marked's default code block renderer.
const renderer = new marked.Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = (token) => {
  if (token.lang === 'mermaid') {
    // Generate a unique ID for each diagram
    const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return `<div class="mermaid-container" id="${id}" data-mermaid-code="${encodeURIComponent(token.text)}">Loading diagram...</div>`;
  }
  return originalCode(token);
};
marked.use({ renderer });

const docs = DOCS;

const activeDoc = ref(DEFAULT_DOC_KEY);
const compiledMarkdown = ref('');
const contentRoot = ref(null);
const hasInitialMermaidRender = ref(false);

async function renderMermaidDiagrams() {
  const containers = contentRoot.value?.querySelectorAll('.mermaid-container') || [];

  for (const container of containers) {
    try {
      const rawCode = decodeURIComponent(container.getAttribute('data-mermaid-code'));
      const { svg } = await mermaid.render(`${container.id}-svg`, rawCode);
      container.innerHTML = svg;
    } catch (err) {
      console.warn('Failed to render specific mermaid diagram', err);
      container.innerHTML = `<pre class="text-red-500 text-xs overflow-auto">${err.message}</pre>`;
    }
  }
}

const renderMarkdown = async (key) => {
  try {
    const rawContent = docs[key]?.content || '# 404 Not Found';
    const rendered = await marked.parse(rawContent);
    compiledMarkdown.value = sanitizeRenderedHtml(rendered);
    await nextTick();
    if (!hasInitialMermaidRender.value) {
      hasInitialMermaidRender.value = true;
      await renderMermaidDiagrams();
    }

  } catch (err) {
    console.error('Failed to load markdown', err);
    compiledMarkdown.value = '<p class="text-red-500">Documentation failed to load.</p>';
  }
};

watch(activeDoc, (newKey) => {
  void renderMarkdown(newKey);
}, { immediate: true });
</script>

<style>
.markdown-body pre {
  background-color: #0d1117 !important;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  border: 1px solid #30363d;
}
.markdown-body code:not(pre code) {
  background-color: #f1f5f9;
  color: #0f172a;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-weight: 600;
}
.markdown-body h1 {
  color: #0f172a;
  font-weight: 800;
  font-size: 2.25rem;
  margin-bottom: 2rem;
  background: linear-gradient(to right, #059669, #14b8a6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.markdown-body h2 {
  color: #0f172a;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
  margin-top: 2.5rem;
  font-weight: 700;
}
.markdown-body h3 {
  color: #334155;
  margin-top: 2rem;
  font-weight: 600;
}
.markdown-body p {
  line-height: 1.75;
  color: #475569;
}
.markdown-body ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  color: #475569;
}
.markdown-body li {
  margin-bottom: 0.5rem;
}
.markdown-body strong {
  color: #1e293b;
}

/* Custom fade transition for doc switching */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
