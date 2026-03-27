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
    chunkSizeWarningLimit: 800,
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter((dep) => !dep.includes('identity-runtime'));
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/node_modules/buffer/')) return 'buffer-polyfill';
          if (id.includes('@vue-flow')) return 'vue-flow';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('jose')) return 'jose';
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
