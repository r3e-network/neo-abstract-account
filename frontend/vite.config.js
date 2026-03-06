import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@repo': repoRoot
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@vue-flow')) return 'vue-flow';
          if (id.includes('ethers')) return 'ethers';
          if (id.includes('@cityofzion/neon-core')) return 'neon-core';
          if (id.includes('katex')) return 'katex';
        }
      }
    }
  },
  server: {
    fs: {
      allow: [repoRoot]
    }
  }
});
