<template>
  <div class="relative min-h-screen bg-aa-dark overflow-hidden font-sans text-aa-text">
    <div class="absolute inset-0 z-0">
      <div class="absolute top-0 right-1/4 w-[600px] h-[600px] bg-vibrant-glow rounded-full mix-blend-screen opacity-40 animate-pulse-slow"></div>
    </div>
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
      <div class="flex flex-col md:flex-row gap-8">
        <aside :aria-label="t('docs.documentationSidebar', 'Documentation sidebar')" class="md:w-64 flex-shrink-0">
          <div class="sticky top-24 bg-aa-panel/60 p-5 rounded-lg shadow-glow-blue border border-aa-border backdrop-blur-xl">
            <h1 class="text-sm font-extrabold text-aa-muted uppercase tracking-widest mb-4 px-2 font-outfit">{{ t('docs.heading', 'Documentation') }}</h1>
            <div class="mb-4">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :aria-label="t('docs.searchDocumentation', 'Search documentation')"
                  class="w-full rounded-lg border border-aa-border bg-aa-dark px-3 py-2 text-sm text-aa-text placeholder:text-aa-muted focus:border-aa-orange focus:outline-none focus:ring-1 focus:ring-aa-orange"
                  :placeholder="t('docs.searchDocsPlaceholder', 'Search docs...')"
                />
                <svg aria-hidden="true" v-if="!searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <button v-else @click="searchQuery = ''" :aria-label="t('docs.clearSearch', 'Clear search')" class="absolute right-3 top-1/2 -translate-y-1/2 text-aa-muted hover:text-aa-text transition-colors duration-200">
                  <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <p v-if="searchQuery && filteredDocKeys.length === 0" class="mt-2 text-xs text-aa-muted px-2">{{ t('docs.noDocsFound', 'No docs found') }}</p>
            </div>
            <nav class="space-y-1">
              <button
                v-for="key in (searchQuery ? filteredDocKeys : Object.keys(docs))"
                :key="key"
                @click="selectDoc(key)"
                :aria-current="activeDoc === key ? 'page' : undefined"
                :class="[
                  activeDoc === key
                    ? 'bg-aa-orange/20 text-aa-orange font-bold border-l-4 border-aa-orange shadow-glow-orange-inset'
                      : 'text-aa-muted hover:bg-aa-dark hover:text-aa-text border-l-4 border-transparent font-medium',
                  'w-full flex items-center px-3 py-2.5 text-sm rounded-r-lg transition-all duration-200 text-left'
                ]"
              >
                {{ docs[key]?.title || key }}
              </button>
            </nav>
            <!-- Quick links -->
            <div class="mt-4 pt-4 border-t border-aa-border/60 space-y-1">
              <router-link to="/" class="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-aa-muted hover:text-aa-text rounded-lg hover:bg-aa-dark transition-all duration-200">
                <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                {{ t('docs.backToHome', 'Back to Home') }}
              </router-link>
              <router-link to="/app" class="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-aa-muted hover:text-aa-text rounded-lg hover:bg-aa-dark transition-all duration-200">
                <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                {{ t('docs.appWorkspace', 'App Workspace') }}
              </router-link>
              <router-link to="/market" class="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-aa-muted hover:text-aa-text rounded-lg hover:bg-aa-dark transition-all duration-200">
                <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"></path></svg>
                {{ t('docs.addressMarket', 'Address Market') }}
              </router-link>
            </div>
          </div>
        </aside>

        <div class="flex-1 min-w-0">
          <div class="prose prose-invert max-w-none bg-aa-panel/60 p-8 sm:p-12 rounded-lg shadow-glow-blue border border-aa-border backdrop-blur-xl min-h-[600px]">
            <div v-if="isLoading" class="space-y-4">
              <div class="skeleton h-8 w-3/4"></div>
              <div class="skeleton h-4 w-full"></div>
              <div class="skeleton h-4 w-5/6"></div>
              <div class="skeleton h-4 w-4/5"></div>
              <div class="skeleton h-4 w-full mt-4"></div>
              <div class="skeleton h-4 w-2/3"></div>
              <div class="skeleton h-32 w-full mt-6"></div>
              <div class="skeleton h-4 w-5/6 mt-4"></div>
              <div class="skeleton h-4 w-full"></div>
              <div class="skeleton h-4 w-3/4"></div>
            </div>
            <transition v-else name="fade-in-up" mode="out-in" @after-enter="renderMermaidDiagrams">
              <div :key="`${activeDoc}:${locale}`">
                <div ref="contentRoot" v-html="compiledMarkdown" class="markdown-body custom-scrollbar-dark"></div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import 'highlight.js/styles/github-dark.css';
import { DEFAULT_DOC_KEY, getDocsForLocale } from '@/features/docs/registry';
import { sanitizeRenderedHtml } from '@/features/docs/rendering';
import { useI18n } from '@/i18n';

let docsRuntimePromise;

async function getDocsRuntime() {
  if (!docsRuntimePromise) {
    docsRuntimePromise = (async () => {
      const markedModule = await import('marked');
      const markedHighlightModule = await import('marked-highlight');
      const hljsModule = await import('highlight.js/lib/core');
      const bashModule = await import('highlight.js/lib/languages/bash');
      const javascriptModule = await import('highlight.js/lib/languages/javascript');
      const csharpModule = await import('highlight.js/lib/languages/csharp');
      const mermaidModule = await import('mermaid');
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

      mermaid.initialize({ startOnLoad: false, theme: 'dark' });

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
          return `<div class="mermaid-container" id="${id}" data-mermaid-code="${encodeURIComponent(token.text)}">${t('docs.loadingDiagram', 'Loading diagram...')}</div>`;
        }
        return originalCode(token);
      };
      marked.use({ renderer });

      return { marked, mermaid };
    })();
  }

  return docsRuntimePromise;
}

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const docs = computed(() => getDocsForLocale(locale.value));
const compiledMarkdown = ref('');
const contentRoot = ref(null);
const hasInitialMermaidRender = ref(false);
const isLoading = ref(true);
const searchQuery = ref('');

const filteredDocKeys = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return [];
  return Object.keys(docs.value).filter(key => {
    const doc = docs.value[key];
    return doc?.title?.toLowerCase().includes(query) || doc?.content?.toLowerCase().includes(query);
  });
});

function selectDoc(key) {
  activeDoc.value = key;
  searchQuery.value = '';
  scrollToTop();
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


function resolveDocKey(candidate, availableDocs = docs.value) {
  if (typeof candidate === 'string' && Object.prototype.hasOwnProperty.call(availableDocs, candidate)) {
    return candidate;
  }
  return DEFAULT_DOC_KEY;
}

const activeDoc = ref(resolveDocKey(route.query.doc));

async function renderMermaidDiagrams() {
  const { mermaid } = await getDocsRuntime();
  const containers = contentRoot.value?.querySelectorAll('.mermaid-container') || [];

  for (const container of containers) {
    try {
      const rawCode = decodeURIComponent(container.getAttribute('data-mermaid-code'));
      const { svg } = await mermaid.render(`${container.id}-svg`, rawCode);
      container.innerHTML = sanitizeRenderedHtml(svg);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DocsView] Mermaid render failed:', err?.message);
      const pre = document.createElement('pre');
      pre.className = 'text-aa-error-light text-xs overflow-auto';
      pre.textContent = t('docs.diagramRenderFailed', 'Failed to render diagram.');
      container.replaceChildren(pre);
    }
  }
}

const renderMarkdown = async (key) => {
  isLoading.value = true;
  try {
    const { marked } = await getDocsRuntime();
    const rawContent = docs.value[key]?.content || t('docs.notFoundHeading', '# 404 Not Found');
    const rendered = await marked.parse(rawContent);
    compiledMarkdown.value = sanitizeRenderedHtml(rendered);
    await nextTick();
    if (!hasInitialMermaidRender.value) {
      hasInitialMermaidRender.value = true;
      await renderMermaidDiagrams();
    }
  } catch (err) {
    if (import.meta.env.DEV) console.error('[DocsView] Markdown render failed:', err?.message);
    compiledMarkdown.value = `<p class="text-aa-error-light">${t('docs.failedToLoad', 'Documentation failed to load.')}</p>`;
  } finally {
    isLoading.value = false;
  }
};

watch(() => [activeDoc.value, locale.value], ([newKey]) => {
  void renderMarkdown(newKey);
}, { immediate: true });

watch(
  () => [route.query.doc, locale.value],
  ([docKey]) => {
    const nextKey = resolveDocKey(docKey);
    if (activeDoc.value !== nextKey) {
      activeDoc.value = nextKey;
    }
  },
  { immediate: true },
);

watch(activeDoc, (value) => {
  if (route.query.doc === value) return;
  void router.replace({
    query: {
      ...route.query,
      doc: value,
    },
  });
});
</script>

<style scoped>
.markdown-body pre {
  background-color: theme('colors.dark.900') !important;
  border-radius: 0.75rem;
  padding: 1.25rem;
  overflow-x: auto;
  border: 1px solid theme('colors.dark.700');
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}
.markdown-body code:not(pre code) {
  background-color: theme('colors.dark.800');
  color: theme('colors.neo.400');
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.875em;
  font-weight: 600;
  border: 1px solid theme('colors.dark.700');
}
.markdown-body h1 {
  color: theme('colors.aa.text');
  font-weight: 800;
  font-size: 2.25rem;
  margin-bottom: 2rem;
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(to right, theme('colors.aa.orange'), theme('colors.neo.400'));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}
.markdown-body h2 {
  color: theme('colors.aa.text');
  border-bottom: 1px solid theme('colors.dark.700');
  padding-bottom: 0.5rem;
  margin-top: 2.5rem;
  font-weight: 700;
  font-family: 'Outfit', sans-serif;
}
.markdown-body h3 {
  color: theme('colors.aa.text');
  margin-top: 2rem;
  font-weight: 600;
}
.markdown-body p {
  line-height: 1.8;
  color: theme('colors.aa.muted');
}
.markdown-body ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  color: theme('colors.aa.muted');
}
.markdown-body li {
  margin-bottom: 0.5rem;
}
.markdown-body strong {
  color: theme('colors.aa.text');
}
</style>
