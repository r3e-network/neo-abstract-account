<template>
  <div class="relative min-h-screen bg-slate-900 overflow-hidden font-sans text-slate-300">
    <div class="absolute inset-0 z-0">
      <div class="absolute top-0 right-1/4 w-[600px] h-[600px] bg-vibrant-glow rounded-full mix-blend-screen opacity-40 animate-pulse-slow"></div>
    </div>
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
      <div class="flex flex-col md:flex-row gap-8">
        <aside class="md:w-64 flex-shrink-0">
          <div class="sticky top-24 bg-slate-800/60 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-slate-700/50 backdrop-blur-xl">
            <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 px-2 font-outfit">{{ t('docs.heading', 'Documentation') }}</h3>
            <nav class="space-y-1">
              <button
                v-for="(doc, key) in docs"
                :key="key"
                @click="activeDoc = key"
                :class="[
                  activeDoc === key
                    ? 'bg-neo-500/20 text-neo-400 font-bold border-l-4 border-neo-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white border-l-4 border-transparent font-medium',
                  'w-full flex items-center px-3 py-2.5 text-sm rounded-r-lg transition-all duration-200 text-left'
                ]"
              >
                {{ doc.title }}
              </button>
            </nav>
          </div>
        </aside>

        <main class="flex-1 min-w-0">
          <div class="prose prose-invert max-w-none bg-slate-800/60 p-8 sm:p-12 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-slate-700/50 backdrop-blur-xl min-h-[600px]">
            <transition name="fade" mode="out-in" @after-enter="renderMermaidDiagrams">
              <div :key="`${activeDoc}:${locale.value}`">
                <div ref="contentRoot" v-html="compiledMarkdown" class="markdown-body custom-scrollbar-dark"></div>
              </div>
            </transition>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import 'highlight.js/styles/github-dark.css';
import { DEFAULT_DOC_KEY, getDocsForLocale } from '@/features/docs/registry';
import { sanitizeRenderedHtml } from '@/features/docs/rendering';
import { useI18n } from '@/i18n';

let docsRuntimePromise;

async function getDocsRuntime() {
  if (!docsRuntimePromise) {
    docsRuntimePromise = Promise.all([
      await import('marked'),
      await import('marked-highlight'),
      await import('highlight.js/lib/core'),
      await import('highlight.js/lib/languages/bash'),
      await import('highlight.js/lib/languages/javascript'),
      await import('highlight.js/lib/languages/csharp'),
      await import('mermaid')
    ]).then(([
      markedModule,
      markedHighlightModule,
      hljsModule,
      bashModule,
      javascriptModule,
      csharpModule,
      mermaidModule
    ]) => {
      const { Marked } = markedModule;
      const { markedHighlight } = markedHighlightModule;
      const hljs = hljsModule.default;
      const mermaid = mermaidModule.default;

      hljs.registerLanguage('bash', bashModule.default);
      hljs.registerLanguage('shell', bashModule.default);
      hljs.registerLanguage('javascript', javascriptModule.default);
      hljs.registerLanguage('js', javascriptModule.default);
      hljs.registerLanguage('csharp', csharpModule.default);
      hljs.registerLanguage('cs', csharpModule.default);

      mermaid.initialize({ startOnLoad: false, theme: 'default' });

      const marked = new Marked(
        markedHighlight({
          langPrefix: 'hljs language-',
          highlight(code, lang) {
            if (lang === 'mermaid') {
              return code;
            }
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
          }
        })
      );

      const renderer = new marked.Renderer();
      const originalCode = renderer.code.bind(renderer);
      renderer.code = (token) => {
        if (token.lang === 'mermaid') {
          const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          return `<div class="mermaid-container" id="${id}" data-mermaid-code="${encodeURIComponent(token.text)}">Loading diagram...</div>`;
        }
        return originalCode(token);
      };
      marked.use({ renderer });

      return { marked, mermaid };
    });
  }

  return docsRuntimePromise;
}

const { locale, t } = useI18n();
const docs = computed(() => getDocsForLocale(locale.value));
const activeDoc = ref(DEFAULT_DOC_KEY);
const compiledMarkdown = ref('');
const contentRoot = ref(null);
const hasInitialMermaidRender = ref(false);

async function renderMermaidDiagrams() {
  const { mermaid } = await getDocsRuntime();
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
    const { marked } = await getDocsRuntime();
    const rawContent = docs.value[key]?.content || '# 404 Not Found';
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

watch(() => [activeDoc.value, locale.value], ([newKey]) => {
  void renderMarkdown(newKey);
}, { immediate: true });
</script>

<style>
.markdown-body pre {
  background-color: #0F172A !important;
  border-radius: 0.75rem;
  padding: 1.25rem;
  overflow-x: auto;
  border: 1px solid #334155;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}
.markdown-body code:not(pre code) {
  background-color: #1E293B;
  color: #34D399;
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.875em;
  font-weight: 600;
  border: 1px solid #334155;
}
.markdown-body h1 {
  color: #F8FAFC;
  font-weight: 800;
  font-size: 2.25rem;
  margin-bottom: 2rem;
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(to right, #4ADE80, #14B8A6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  drop-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
.markdown-body h2 {
  color: #F1F5F9;
  border-bottom: 1px solid #334155;
  padding-bottom: 0.5rem;
  margin-top: 2.5rem;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}
.markdown-body h3 {
  color: #E2E8F0;
  margin-top: 2rem;
  font-weight: 600;
}
.markdown-body p {
  line-height: 1.8;
  color: #CBD5E1;
}
.markdown-body ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  color: #CBD5E1;
}
.markdown-body li {
  margin-bottom: 0.5rem;
}
.markdown-body strong {
  color: #F8FAFC;
}
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
