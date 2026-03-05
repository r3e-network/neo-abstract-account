<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
    <div class="prose prose-slate prose-neo max-w-none bg-white p-8 sm:p-12 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200/60">
      <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neo-600 to-teal-500 mb-8">Documentation</h1>
      
      <div v-html="compiledMarkdown" class="markdown-body custom-scrollbar"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import docContent from '@/assets/architecture.md?raw';

// Create a custom renderer to handle highlight.js
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
  const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
  const highlighted = hljs.highlight(code, { language: validLanguage }).value;
  return `<pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>`;
};

marked.setOptions({
  renderer: renderer,
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
  breaks: true,
  gfm: true
});

const compiledMarkdown = ref('');

onMounted(() => {
  try {
    compiledMarkdown.value = marked.parse(docContent);
  } catch (err) {
    console.error('Failed to load markdown', err);
    compiledMarkdown.value = '<p>Documentation failed to load.</p>';
  }
});
</script>

<style>
.markdown-body pre {
  background-color: #0d1117 !important;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}
.markdown-body code:not(pre code) {
  background-color: #f1f5f9;
  color: #0f172a;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}
.markdown-body h2 {
  color: #0f172a;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
  margin-top: 2rem;
}
.markdown-body h3 {
  color: #334155;
  margin-top: 1.5rem;
}
</style>
