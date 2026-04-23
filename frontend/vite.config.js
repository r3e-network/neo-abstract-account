import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath, URL } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const deferredIdentityChunks = [
  'identity-runtime',
  'walletconnect-runtime',
  'react-runtime',
];

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
    // The Web3Auth identity runtime is intentionally deferred and excluded from
    // module preloads, so its chunk budget should not use the default eager-app threshold.
    chunkSizeWarningLimit: 3500,
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter((dep) => !deferredIdentityChunks.some((chunkName) => dep.includes(chunkName)));
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
          // Web3Auth pulls a large React/WalletConnect/Torus support tree that is
          // only needed when the DID workspace opens the identity runtime.
          if (
            id.includes('react-i18next') ||
            id.includes('i18next') ||
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('scheduler') ||
            id.includes('@hcaptcha/react-hcaptcha')
          ) return 'react-runtime';
          if (
            id.includes('@walletconnect') ||
            id.includes('xrpl') ||
            id.includes('ripple-keypairs')
          ) return 'walletconnect-runtime';
          if (
            id.includes('@toruslabs') ||
            id.includes('@metamask') ||
            id.includes('@segment')
          ) return 'identity-runtime';
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
