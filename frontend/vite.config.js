import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath, URL } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      include: ['buffer', 'process', 'crypto', 'stream', 'events', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    // Node.js globals needed by ethers v6, web3auth, and walletconnect
    'process.env': {},
    'process.browser': true,
    'process.version': JSON.stringify(''),
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@repo': repoRoot,
      // Ensure buffer polyfill resolves for any bare `buffer` import
      buffer: 'buffer/',
      // Let browser bundles hit library fallback paths without vm-browserify.
      vm: fileURLToPath(new URL('./src/shims/vm.js', import.meta.url)),
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
          // vue core
          if (id.includes('vue-router') || id.includes('/vue/')) return 'vue-vendor';
          // supabase
          if (id.includes('@supabase')) return 'supabase';
          // visualization (heavy, rarely needed on first load)
          if (id.includes('@vue-flow')) return 'vue-flow';
          if (id.includes('highlight.js') || id.includes('@highlightjs')) return 'highlight';
          if (id.includes('katex')) return 'katex';
          if (id.includes('vue-toastification')) return 'toast';
          if (id.includes('jose')) return 'jose';
          // NOTE: ethers, @web3auth, buffer, @noble, @scure are NOT split
          // into manual chunks. ethers v6 has circular internal deps that
          // cause TDZ errors ("Cannot access before initialization") when
          // Rollup isolates them. Let Rollup handle the split naturally.
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
