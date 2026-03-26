<template>
  <div class="min-h-screen bg-aa-dark flex flex-col font-sans text-aa-text selection:bg-aa-lightOrange selection:text-white transition-colors duration-200 relative overflow-hidden">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-aa-orange focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white">{{ t('nav.skipToContent', 'Skip to content') }}</a>
    <nav class="sticky top-0 z-50 bg-aa-dark/90 backdrop-blur-md border-b border-aa-border" :aria-label="t('nav.mainNavigation', 'Main navigation')">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 transition-all duration-200 gap-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center group">
              <router-link to="/" class="flex items-center gap-3">
                <div class="w-8 h-8 gradient-border-card bg-aa-panel text-white rounded flex items-center justify-center font-bold text-lg shadow-sm transform group-hover:scale-105 transition-transform duration-200 font-mono">
                  N
                </div>
                <span class="font-bold text-sm text-white hidden sm:inline">{{ t('brand.name', 'Abstract Account') }}</span>
              </router-link>
            </div>
            <div class="hidden sm:-my-px sm:ml-10 sm:flex sm:space-x-8">
              <router-link
                v-for="link in navLinks"
                :key="link.to"
                :to="link.to"
                class="relative text-aa-muted hover:text-aa-text inline-flex items-center px-1 pt-1 text-sm font-medium transition-all duration-200 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-aa-orange after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200 hover:bg-aa-orange/5 rounded-t-md"
                active-class="text-aa-text font-semibold after:scale-x-100 bg-aa-orange/5"
                :aria-current="route.path === link.to ? 'page' : undefined"
              >
                {{ t(link.label, link.fallback) }}
              </router-link>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="hidden sm:flex items-center gap-1 bg-aa-panel border border-aa-border rounded p-1 text-xs font-semibold text-aa-muted" role="group" :aria-label="t('nav.languageSwitcher', 'Language selector')">
              <button
                v-for="item in locales"
                :key="item.code"
                @click="setLocale(item.code)"
                :aria-pressed="locale === item.code"
                :aria-label="item.code === 'en' ? t('nav.switchToEn', 'Switch to English') : t('nav.switchToZh', '切换到中文')"
                :class="locale === item.code ? 'bg-aa-border text-aa-text shadow-sm' : 'text-aa-muted hover:text-aa-text'"
                class="rounded px-2 py-1 transition-all duration-200 font-mono"
              >
                {{ item.code === 'en' ? 'English' : '中文' }}
              </button>
            </div>
            <ConnectionControls />
          </div>
        </div>
        <div class="scroll-fade-container relative">
          <div class="scroll-fade-inner flex items-center gap-2 overflow-x-auto pb-3 sm:hidden snap-x snap-proximity">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="snap-start rounded-full border border-aa-border bg-aa-panel px-4 py-2 text-xs font-semibold text-aa-muted transition-all duration-200 hover:text-aa-text hover:border-aa-border"
            active-class="border-aa-orange text-aa-text bg-aa-orange/10"
            :aria-current="route.path === link.to ? 'page' : undefined"
          >
            {{ t(link.label, link.fallback) }}
          </router-link>
          <div class="ml-auto flex items-center gap-1 bg-aa-panel border border-aa-border rounded p-1 text-xs font-semibold text-aa-muted shrink-0" role="group" :aria-label="t('nav.languageSwitcher', 'Language selector')">
            <button
              v-for="item in locales"
              :key="item.code"
              @click="setLocale(item.code)"
              :aria-pressed="locale === item.code"
              :aria-label="item.code === 'en' ? t('nav.switchToEn', 'Switch to English') : t('nav.switchToZh', '切换到中文')"
              :class="locale === item.code ? 'bg-aa-border text-aa-text shadow-sm' : 'text-aa-muted hover:text-aa-text'"
              class="rounded px-2 py-1 transition-all duration-200 font-mono"
            >
              {{ item.code === 'en' ? 'EN' : '中' }}
            </button>
          </div>
          <ConnectionControls compact />
        </div>
        </div>
      </div>
    </nav>

    <Breadcrumb v-if="breadcrumbItems.length" :items="breadcrumbItems" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" />

    <main id="main-content" class="flex-1 w-full animate-fade-in-up">
      <router-view v-slot="{ Component }">
        <transition name="page-slide-up" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="bg-aa-dark mt-auto relative before:absolute before:top-0 before:left-[10%] before:right-[10%] before:h-px before:bg-gradient-to-r before:from-transparent before:via-aa-orange/30 before:to-transparent">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <!-- Brand column -->
          <div class="col-span-2 md:col-span-1">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 gradient-border-card bg-aa-panel text-white rounded flex items-center justify-center font-bold text-lg font-mono">N</div>
              <span class="font-bold text-sm text-white">{{ t('brand.name', 'Abstract Account') }}</span>
            </div>
            <p class="text-sm text-aa-muted leading-relaxed">{{ t('footer.tagline', 'Programmable accounts for Neo N3.') }}</p>
          </div>
          <!-- Link columns -->
          <div v-for="column in footerColumns" :key="column.titleKey">
            <p class="text-xs font-bold text-aa-text uppercase tracking-wider mb-4">{{ t(column.titleKey, column.titleFallback) }}</p>
            <ul class="space-y-2.5">
              <li v-for="link in column.links" :key="link.to || link.href">
                <router-link v-if="link.to" :to="link.to" class="text-sm text-aa-muted hover:text-aa-text transition-colors duration-200 flex items-center gap-2">
                  <svg aria-hidden="true" v-if="link.icon" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path :d="link.icon" /></svg>
                  {{ t(link.label, link.fallback) }}
                </router-link>
                <a v-else :href="link.href" target="_blank" rel="noopener noreferrer" class="text-sm text-aa-muted hover:text-aa-text transition-colors duration-200 flex items-center gap-2">
                  <svg aria-hidden="true" v-if="link.icon" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path :d="link.icon" /></svg>
                  {{ t(link.label, link.fallback) }}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="border-t border-aa-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div class="flex items-center gap-2 text-sm">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-aa-success opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-aa-success"></span>
            </span>
            <span class="text-aa-muted font-medium">{{ t(networkLabelKey, networkLabelFallback) }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-aa-muted">
            <span>&copy; {{ new Date().getFullYear() }} {{ t('footer.copyright', 'NEO ABSTRACT ACCOUNT') }}</span>
          </div>
        </div>
      </div>
    </footer>

    <!-- Scroll to top button -->
    <transition name="scroll-top-fade">
      <button
        v-show="showScrollTop"
        @click="scrollToTop"
        :aria-label="t('nav.scrollToTop', 'Scroll to top')"
        class="fixed bottom-8 right-8 z-50 w-11 h-11 rounded-full bg-aa-panel border border-aa-border shadow-lg backdrop-blur-xl flex items-center justify-center text-aa-muted hover:text-aa-orange hover:border-aa-orange/40 transition-all duration-200 hover:shadow-glow-orange active:scale-90"
      >
        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
      </button>
    </transition>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@/i18n';
import { resolveRuntimeNetwork } from '@/config/runtimeConfig';
import Breadcrumb from '@/components/common/Breadcrumb.vue';

const route = useRoute();
const showScrollTop = ref(false);

const breadcrumbItems = computed(() => {
  const items = [{ label: t('nav.home', 'Home'), to: '/' }];
  if (route.path === '/') return [];
  if (route.meta?.breadcrumbKey) {
    items.push({ label: t(route.meta.breadcrumbKey, route.meta.breadcrumb), to: undefined });
  } else if (route.meta?.breadcrumb) {
    items.push({ label: route.meta.breadcrumb, to: undefined });
  }
  return items;
});

function onScroll() {
  showScrollTop.value = window.scrollY > 400;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
const { locale, locales, setLocale, t } = useI18n();
const ConnectionControls = defineAsyncComponent(() => import('@/components/layout/ConnectionControls.vue'));

const runtimeNetwork = resolveRuntimeNetwork();
const networkLabelKey = computed(() => runtimeNetwork === 'mainnet' ? 'nav.networkMainnet' : 'nav.networkTestnet');
const networkLabelFallback = computed(() => runtimeNetwork === 'mainnet' ? 'Neo N3 Mainnet' : 'Neo N3 Testnet');

const navLinks = [
  { to: '/', label: 'nav.home', fallback: 'Home' },
  { to: '/app', label: 'nav.app', fallback: 'Workspace' },
  { to: '/identity', label: 'nav.identity', fallback: 'Identity' },
  { to: '/market', label: 'nav.market', fallback: 'Market' },
  { to: '/docs', label: 'nav.docs', fallback: 'Docs' },
];

const footerColumns = [
  {
    titleKey: 'footer.product', titleFallback: 'Product',
    links: [
      { to: '/app', label: 'footer.footerAppWorkspace', fallback: 'App Workspace' },
      { to: '/market', label: 'footer.footerAddressMarket', fallback: 'Address Market' },
      { to: { path: '/docs', query: { doc: 'transactionViewer' } }, label: 'footer.footerTransactionViewer', fallback: 'Transaction Viewer' },
    ]
  },
  {
    titleKey: 'footer.resources', titleFallback: 'Resources',
    links: [
      { to: '/docs', label: 'footer.footerDocumentation', fallback: 'Documentation' },
      { to: { path: '/docs', query: { doc: 'pluginGuide' } }, label: 'footer.footerPluginGuide', fallback: 'Plugin Guide' },
      { href: 'https://ctrlpc.link/neo-docs', label: 'footer.footerApiReference', fallback: 'API Reference' },
    ]
  },
  {
    titleKey: 'footer.community', titleFallback: 'Community',
    links: [
      { href: 'https://github.com/r3e-network/neo-abstract-account', label: 'footer.github', fallback: 'GitHub', icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' },
      { href: 'https://discord.gg/neo', label: 'footer.discord', fallback: 'Discord', icon: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z' },
      { href: 'https://neo.org', label: 'footer.footerNeoOrg', fallback: 'Neo.org', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
      { href: 'https://x.com/Neo_Blockchain', label: 'footer.twitter', fallback: 'Twitter / X', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    ]
  }
];
</script>

<style scoped>
.scroll-top-fade-enter-active,
.scroll-top-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.scroll-top-fade-enter-from,
.scroll-top-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Scroll fade indicators for horizontally scrollable containers */
.scroll-fade-container {
  scroll-timeline: --scroll-fade x;
}

.scroll-fade-inner {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    black 40px,
    black calc(100% - 40px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 40px,
    black calc(100% - 40px),
    transparent 100%
  );
  animation: scroll-fade-mask 1s linear both;
  animation-timeline: --scroll-fade;
}

@keyframes scroll-fade-mask {
  from {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      black 40px,
      black calc(100% - 40px),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0,
      black 40px,
      black calc(100% - 40px),
      transparent 100%
    );
  }
  to {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      black 40px,
      black 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0,
      black 40px,
      black 100%
    );
  }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-top-fade-enter-active,
  .scroll-top-fade-leave-active {
    transition: none;
  }
  .scroll-top-fade-enter-from,
  .scroll-top-fade-leave-to {
    opacity: 1;
    transform: none;
  }
  .scroll-fade-inner {
    -webkit-mask-image: none;
    mask-image: none;
    animation: none;
  }
}
</style>
