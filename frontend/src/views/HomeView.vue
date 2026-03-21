<template>
  <div class="relative min-h-screen bg-aa-dark overflow-hidden font-sans text-aa-text">
    <!-- Scroll progress bar -->
    <div role="progressbar" :aria-valuenow="Math.round(scrollProgress * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="t('home.scrollProgress', 'Page scroll progress')" class="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-aa-orange via-aa-lightOrange to-neo-500 origin-left transition-transform duration-200" :style="{ transform: `scaleX(${scrollProgress})` }"></div>
    <!-- Premium background elements -->
    <div class="absolute inset-0 z-0">
      <div class="absolute top-0 right-1/4 w-[600px] h-[600px] bg-vibrant-glow rounded-full mix-blend-screen opacity-60 animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-vibrant-glow rounded-full mix-blend-screen opacity-40 animate-pulse-slow transform translate-y-1/2 -translate-x-1/2 [animation-delay:1.5s]"></div>
      <div class="absolute top-20 left-10 w-[400px] h-[400px] bg-orange-glow rounded-full mix-blend-screen opacity-30 animate-float-slow"></div>
      <!-- Floating decorative shapes -->
      <div class="absolute top-[12%] left-[8%] w-3 h-3 rounded-full bg-neo-500/20 animate-float [animation-delay:0.5s]"></div>
      <div class="absolute top-[18%] right-[12%] w-2 h-2 rounded-full bg-aa-orange/25 animate-float [animation-delay:1.2s]"></div>
      <div class="absolute top-[30%] left-[15%] w-1.5 h-1.5 rounded-full bg-aa-info/20 animate-float-slow [animation-delay:2s]"></div>
      <div class="absolute top-[25%] right-[20%] w-2.5 h-2.5 rounded-full bg-neo-400/15 animate-float [animation-delay:0.8s]"></div>
      <!-- Grid dot pattern -->
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-60"></div>
      <div class="absolute inset-0 bg-mesh pointer-events-none"></div>
    </div>

    <!-- Main Content -->
    <div class="relative pt-16 pb-20 sm:pb-24 lg:pb-32 z-10">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Hero Section -->
        <section class="mb-20 text-center animate-fade-in-up pt-8">
          <div class="sr-only">
            Programmable Accounts for Neo N3
            Open App Workspace
            Browse Address Market
            Live-Validated Paymaster Path
            Open Validation Ledger
            Open Explorer Tx
            paymasterValidation
            buildTransactionExplorerUrl
          </div>
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aa-panel/60 border border-aa-border backdrop-blur-md text-aa-text text-xs font-semibold mb-10 shadow-sm">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-neo-500"></span>
            </span>
            {{ t('home.powered', 'Neo N3 Powered') }}
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.1] mb-8 font-outfit">
            <span class="text-gradient">{{ t('home.title', 'Smart Wallets That Never Lock You Out') }}</span>
          </h1>
          <p class="text-lg md:text-xl text-aa-muted max-w-2xl mx-auto leading-relaxed">
            {{ t('home.subtitle', 'Create a wallet you truly own — with recovery built in, cross-chain signing, and zero gas fees for your users.') }}
          </p>
          <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <router-link to="/app" class="btn-primary btn-lg">
              {{ t('home.heroPrimaryAction', 'Launch App') }}
            </router-link>
            <router-link to="/market" class="btn-secondary text-sm group">
              {{ t('home.heroSecondaryAction', 'Browse Market') }}
              <svg aria-hidden="true" class="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </router-link>
          </div>
          <!-- Workspace preview thumbnail -->
          <div class="mt-14 max-w-4xl mx-auto">
            <div class="gradient-border-card bg-aa-panel/40 backdrop-blur-xl overflow-hidden">
              <div class="flex items-center gap-2 px-4 py-2.5 bg-aa-dark/60 border-b border-aa-border/60">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-aa-error/50"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-aa-warning/50"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-aa-success/50"></span>
                </div>
                <div class="flex-1 flex items-center justify-center">
                  <div class="bg-aa-dark/40 rounded px-2.5 py-0.5 text-[10px] font-mono text-aa-muted/70 border border-aa-border/40">neo-abstract-account/app</div>
                </div>
              </div>
              <div class="relative p-5 md:p-6 min-h-[140px]">
                <!-- Shimmer overlay with sweep -->
                <div class="absolute inset-0 bg-gradient-to-b from-aa-dark/5 to-aa-dark/15 z-10 flex items-center justify-center hero-preview-overlay">
                  <router-link to="/app" class="relative z-20 btn-primary btn-xs shadow-glow-orange">
                    {{ t('home.heroPreviewCta', 'Launch App') }}
                  </router-link>
                </div>
                <!-- Mock UI elements -->
                <div class="space-y-3 opacity-40">
                  <div class="flex gap-2">
                    <div class="h-7 w-20 rounded bg-aa-orange/10 border border-aa-orange/15"></div>
                    <div class="h-7 w-16 rounded bg-aa-panel/60 border border-aa-border/30"></div>
                    <div class="h-7 w-16 rounded bg-aa-panel/60 border border-aa-border/30"></div>
                  </div>
                  <div class="grid grid-cols-3 gap-3">
                    <div class="h-20 rounded-lg bg-aa-panel/40 border border-aa-border/30"></div>
                    <div class="h-20 rounded-lg bg-aa-panel/40 border border-aa-border/30"></div>
                    <div class="h-20 rounded-lg bg-aa-panel/40 border border-aa-border/30"></div>
                  </div>
                  <div class="flex gap-2">
                    <div class="h-8 w-28 rounded bg-neo-500/10 border border-neo-500/15"></div>
                    <div class="h-8 w-20 rounded bg-aa-panel/40 border border-aa-border/30"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-aa-muted">
            <span class="rounded-full border border-aa-border bg-aa-panel/70 px-4 py-1.5 flex items-center gap-1.5">
              <svg aria-hidden="true" class="w-3 h-3 text-aa-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              {{ t('home.heroBadgeOne', 'Plugin-based verification') }}
            </span>
            <span class="rounded-full border border-aa-border bg-aa-panel/70 px-4 py-1.5 flex items-center gap-1.5">
              <svg aria-hidden="true" class="w-3 h-3 text-aa-info" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
              {{ t('home.heroBadgeTwo', 'Transferable AA addresses') }}
            </span>
            <span class="rounded-full border border-aa-border bg-aa-panel/70 px-4 py-1.5 flex items-center gap-1.5">
              <svg aria-hidden="true" class="w-3 h-3 text-aa-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              {{ t('home.heroBadgeThree', 'Relay and paymaster ready') }}
            </span>
          </div>
          <div class="mt-4">
            <router-link to="/docs" class="text-xs font-semibold text-aa-muted hover:text-aa-text transition-colors duration-200">
              {{ t('home.devDocsCta', 'Developers: Read the Docs') }} &rarr;
            </router-link>
          </div>
          <div role="status" aria-live="polite" class="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-aa-border bg-aa-panel/70 px-4 py-2 text-xs font-semibold text-aa-text backdrop-blur-md">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-aa-success opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-aa-success"></span>
            </span>
            <span class="text-aa-success font-bold">N3Index</span>
            <span>{{ t('home.liveTestnet', 'Live testnet') }}</span>
            <span v-if="testnetSummary" class="text-aa-text">{{ t('home.tipPrefix', 'Tip #') }}{{ testnetSummary.chain_tip_block }}</span>
            <span v-else-if="testnetStatus" class="text-aa-text">{{ t('home.lagPrefix', 'Lag ') }}{{ testnetStatus.lag_blocks }}</span>
            <span v-else-if="loadingStatus" class="text-aa-muted">{{ loadingStatus }}</span>
            <span v-else-if="statusLoadFailed" class="text-aa-muted">{{ t('home.networkOffline', 'Offline') }}</span>
            <span v-else class="skeleton inline-block h-3 w-24 rounded bg-aa-dark/50"></span>
          </div>
          <!-- Scroll indicator -->
          <div class="mt-10 flex justify-center">
            <div class="scroll-hint-bounce text-aa-muted/40">
              <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            </div>
          </div>
        </section>

        <!-- Key Features -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.featuresTitle', 'Key Features') }}</h2>
            <div class="section-accent-line"></div>
            <p class="text-aa-muted mt-4 text-base max-w-2xl mx-auto">{{ t('home.featuresSubtitle', 'Everything you need to manage programmable accounts on Neo N3.') }}</p>
          </div>
          <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div v-for="(feature, idx) in features" :key="idx" class="gradient-border-card bg-aa-panel/60 backdrop-blur-xl p-6 transition-all duration-200 hover:bg-aa-panel/80 hover:shadow-lg group flex flex-col">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 border" :class="feature.accentBg">
                <svg aria-hidden="true" class="w-6 h-6" :class="feature.accentText" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="feature.icon"></svg>
              </div>
              <h3 class="text-base font-bold text-white mb-2 font-outfit">{{ feature.title }}</h3>
              <p class="text-sm text-aa-muted leading-relaxed flex-1">{{ feature.body }}</p>
              <router-link v-if="feature.link" :to="feature.link" class="mt-4 inline-flex items-center gap-1 text-xs font-semibold transition-colors duration-200" :class="feature.accentText">
                {{ feature.linkLabel }} &rarr;
              </router-link>
            </div>
          </div>
        </section>

        <!-- Workspace Preview -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.previewTitle', 'See It in Action') }}</h2>
            <div class="section-accent-line"></div>
            <p class="text-aa-muted mt-4 text-base max-w-2xl mx-auto">{{ t('home.previewSubtitle', 'A workspace designed for power users and developers.') }}</p>
          </div>
          <div class="max-w-4xl mx-auto gradient-border-card bg-aa-panel/60 backdrop-blur-xl overflow-hidden">
            <!-- Browser chrome -->
            <div class="flex items-center gap-3 px-4 py-3 bg-aa-dark/80 border-b border-aa-border">
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-aa-error/60"></span>
                <span class="w-3 h-3 rounded-full bg-aa-warning/60"></span>
                <span class="w-3 h-3 rounded-full bg-aa-success/60"></span>
              </div>
              <div class="flex-1 flex items-center justify-center">
                <div class="bg-aa-panel/60 rounded-md px-3 py-1 text-xs font-mono text-aa-muted border border-aa-border">neo-abstract-account/app</div>
              </div>
            </div>
            <!-- Mock tabs -->
            <div class="scroll-fade-container relative">
              <div role="tablist" @keydown="handleTabKeydown" class="scroll-fade-inner flex gap-1 px-4 py-3 bg-aa-dark/50 border-b border-aa-border/60 overflow-x-auto">
              <button
                v-for="(tab, i) in previewTabs"
                :key="i"
                role="tab"
                :aria-selected="activePreviewTab === i"
                :aria-controls="'preview-panel-' + i"
                :id="'preview-tab-' + i"
                :tabindex="activePreviewTab === i ? 0 : -1"
                @click="activePreviewTab = i"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap"
                :class="activePreviewTab === i
                  ? 'bg-aa-orange/15 text-aa-orange ring-1 ring-aa-orange/30'
                  : 'text-aa-muted hover:text-aa-text hover:bg-aa-panel/60'"
              >
                <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="tab.icon"></svg>
                {{ tab.label }}
              </button>
            </div>
            </div>
            <!-- Preview content area -->
            <div class="p-6 md:p-8 min-h-[260px]">
              <transition name="preview-fade" mode="out-in">
                <!-- Operations mock -->
                <div v-if="activePreviewTab === 0" key="ops" role="tabpanel" id="preview-panel-0" aria-labelledby="preview-tab-0" class="space-y-4">
                  <div class="flex items-center gap-2 mb-2">
                    <span v-for="(s, si) in mockSteps" :key="si" class="flex items-center gap-1.5">
                      <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono" :class="si < 2 ? 'bg-aa-orange/15 text-aa-orange border border-aa-orange/30' : 'bg-aa-panel border border-aa-border text-aa-muted'">{{ si + 1 }}</span>
                      <span class="text-xs font-medium" :class="si < 2 ? 'text-aa-text' : 'text-aa-muted'">{{ s }}</span>
                      <svg aria-hidden="true" v-if="si < 3" class="w-3 h-3 text-aa-border shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </span>
                  </div>
                  <div class="rounded-lg bg-aa-dark/60 border border-aa-border/40 p-4 space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold text-aa-text">{{ t('home.mockOperation', 'Operation #42') }}</span>
                      <span class="badge-orange text-[10px]">{{ t('home.mockPendingSigs', 'Pending signatures') }}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div class="rounded bg-aa-panel/60 border border-aa-border/30 px-3 py-2">
                        <span class="text-[10px] text-aa-muted block">{{ t('home.mockNeoSig', 'Neo Sig') }}</span>
                        <span class="text-xs text-aa-success font-mono">0x3a8f...c21d</span>
                      </div>
                      <div class="rounded bg-aa-panel/60 border border-aa-border/30 px-3 py-2">
                        <span class="text-[10px] text-aa-muted block">{{ t('home.mockEvmSig', 'EVM Sig') }}</span>
                        <span class="text-xs text-aa-muted font-mono">{{ t('home.mockAwaiting', 'Awaiting...') }}</span>
                      </div>
                    </div>
                    <div class="flex gap-2 pt-1">
                      <div class="h-8 w-28 rounded bg-aa-orange/10 border border-aa-orange/20 flex items-center justify-center">
                        <span class="text-[10px] font-semibold text-aa-orange uppercase tracking-wider">{{ t('home.mockBroadcast', 'Broadcast') }}</span>
                      </div>
                      <div class="h-8 w-20 rounded bg-aa-panel/60 border border-aa-border/40 flex items-center justify-center">
                        <span class="text-[10px] text-aa-muted">{{ t('home.mockSaveDraft', 'Save Draft') }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Create mock -->
                <div v-else-if="activePreviewTab === 1" key="create" role="tabpanel" id="preview-panel-1" aria-labelledby="preview-tab-1" class="space-y-3">
                  <div class="rounded-lg bg-aa-dark/60 border border-aa-border/40 p-4 space-y-3">
                    <div>
                      <span class="text-[10px] text-aa-muted uppercase tracking-wider font-semibold">{{ t('home.mockSeed', 'Seed') }}</span>
                      <div class="mt-1 rounded bg-aa-panel/80 border border-aa-border/50 px-3 py-2 flex items-center justify-between">
                        <span class="text-xs font-mono text-aa-text">0x7c3b...a91e</span>
                        <span class="text-[10px] text-aa-success font-semibold">{{ t('home.mockDerived', 'Derived') }}</span>
                      </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span class="text-[10px] text-aa-muted uppercase tracking-wider font-semibold">{{ t('home.mockVerifier', 'Verifier') }}</span>
                        <div class="mt-1 rounded bg-aa-panel/80 border border-aa-border/50 px-3 py-2 flex items-center justify-between">
                          <span class="text-xs text-neo-400 font-mono">ECDSASecp256r1</span>
                          <svg aria-hidden="true" class="w-3 h-3 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                      <div>
                        <span class="text-[10px] text-aa-muted uppercase tracking-wider font-semibold">{{ t('home.mockBackupOwner', 'Backup Owner') }}</span>
                        <div class="mt-1 rounded bg-aa-panel/80 border border-aa-border/50 px-3 py-2">
                          <span class="text-xs font-mono text-aa-info">NiEt...VJnD</span>
                        </div>
                      </div>
                    </div>
                    <div class="rounded bg-neo-500/8 border border-neo-500/15 px-3 py-2 flex items-center gap-2">
                      <svg aria-hidden="true" class="w-4 h-4 text-neo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span class="text-xs text-neo-300">{{ t('home.mockAddressReady', 'Address available — deploy to activate') }}</span>
                    </div>
                    <div class="h-8 w-28 rounded bg-neo-500/15 border border-neo-500/30 flex items-center justify-center">
                      <span class="text-[10px] font-semibold text-neo-400 uppercase tracking-wider">{{ t('home.mockDeploy', 'Deploy AA') }}</span>
                    </div>
                  </div>
                </div>

                <!-- Manage mock -->
                <div v-else-if="activePreviewTab === 2" key="manage" role="tabpanel" id="preview-panel-2" aria-labelledby="preview-tab-2" class="space-y-3">
                  <div class="rounded-lg bg-aa-dark/60 border border-aa-border/40 p-4 space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold text-aa-text">{{ t('home.mockGovernance', 'Governance') }}</span>
                      <span class="badge-blue text-[10px]">{{ t('home.mockActive', 'Active') }}</span>
                    </div>
                    <div class="space-y-2">
                      <div class="flex items-center justify-between rounded bg-aa-panel/60 border border-aa-border/30 px-3 py-2">
                        <div class="flex items-center gap-2">
                          <span class="w-2 h-2 rounded-full bg-aa-info"></span>
                          <span class="text-xs text-aa-text">{{ t('home.mockVerifier', 'Verifier') }}</span>
                        </div>
                        <span class="text-xs font-mono text-aa-info">ECDSASecp256r1</span>
                      </div>
                      <div class="flex items-center justify-between rounded bg-aa-panel/60 border border-aa-border/30 px-3 py-2">
                        <div class="flex items-center gap-2">
                          <span class="w-2 h-2 rounded-full bg-aa-warning"></span>
                          <span class="text-xs text-aa-text">{{ t('home.mockEscapeTimelock', 'Escape Timelock') }}</span>
                        </div>
                        <span class="text-xs font-mono text-aa-warning">24h</span>
                      </div>
                      <div class="flex items-center justify-between rounded bg-aa-panel/60 border border-aa-border/30 px-3 py-2">
                        <div class="flex items-center gap-2">
                          <span class="w-2 h-2 rounded-full bg-aa-success"></span>
                          <span class="text-xs text-aa-text">{{ t('home.mockBackupOwner', 'Backup Owner') }}</span>
                        </div>
                        <span class="text-xs font-mono text-aa-success">NiEt...VJnD</span>
                      </div>
                    </div>
                    <div class="flex gap-2 pt-1">
                      <div class="h-8 w-28 rounded bg-aa-info/10 border border-aa-info/20 flex items-center justify-center">
                        <span class="text-[10px] font-semibold text-aa-info uppercase tracking-wider">{{ t('home.mockUpdate', 'Update') }}</span>
                      </div>
                      <div class="h-8 w-28 rounded bg-aa-warning/10 border border-aa-warning/20 flex items-center justify-center">
                        <span class="text-[10px] font-semibold text-aa-warning uppercase tracking-wider">{{ t('home.mockRecovery', 'Recovery') }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Source mock -->
                <div v-else-if="activePreviewTab === 3" key="source" role="tabpanel" id="preview-panel-3" aria-labelledby="preview-tab-3" class="space-y-3">
                  <div class="rounded-lg bg-aa-dark/80 border border-aa-border/40 overflow-hidden font-mono text-[11px] leading-5">
                    <div class="flex items-center gap-2 px-4 py-2 bg-aa-dark/60 border-b border-aa-border/30">
                      <span class="w-2 h-2 rounded-full bg-aa-purple-light"></span>
                      <span class="text-aa-muted">UnifiedSmartWallet.cs</span>
                    </div>
                    <div class="p-4 space-y-0.5">
                      <div v-for="(line, li) in mockCodeLines" :key="li" class="flex gap-3">
                        <span class="text-aa-muted/40 select-none w-5 text-right shrink-0">{{ li + 1 }}</span>
                        <span v-html="line"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </section>

        <!-- Primary Entry Points -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <h2 class="sr-only">{{ t('home.entryPointsHeading', 'Primary Entry Points') }}</h2>
          <div class="grid gap-6 lg:grid-cols-3">
            <router-link to="/app" class="group rounded-2xl border border-aa-border bg-aa-panel/60 p-6 backdrop-blur-xl transition-all duration-200 card-hover-green">
              <div class="flex items-start justify-between">
                <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-aa-success-light">{{ t('home.entryAppLabel', 'App Workspace') }}</p>
                <svg aria-hidden="true" class="w-5 h-5 text-aa-success opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </div>
              <h3 class="mt-3 text-2xl font-bold text-white font-outfit">{{ t('home.entryAppTitle', 'Create and operate AA accounts') }}</h3>
              <p class="mt-3 text-sm leading-7 text-aa-muted">{{ t('home.entryAppBody', 'Move account creation, ownership changes, mixed signing, relay submission, and recovery actions into one operator-focused workspace.') }}</p>
              <span class="mt-6 inline-flex items-center text-sm font-semibold text-aa-success-light group-hover:text-aa-success-light">{{ t('home.entryAppAction', 'Launch App') }} →</span>
            </router-link>

            <router-link to="/market" class="group rounded-2xl border border-aa-border bg-aa-panel/60 p-6 backdrop-blur-xl transition-all duration-200 card-hover-blue">
              <div class="flex items-start justify-between">
                <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-aa-info-light">{{ t('home.entryMarketLabel', 'Address Market') }}</p>
                <svg aria-hidden="true" class="w-5 h-5 text-aa-info opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </div>
              <h3 class="mt-3 text-2xl font-bold text-white font-outfit">{{ t('home.entryMarketTitle', 'List and acquire AA addresses') }}</h3>
              <p class="mt-3 text-sm leading-7 text-aa-muted">{{ t('home.entryMarketBody', 'List AA addresses in trustless on-chain escrow, freeze control during sale, and transfer only the AA shell plus backup-owner governance when the buyer settles.') }}</p>
              <span class="mt-6 inline-flex items-center text-sm font-semibold text-aa-info-light group-hover:text-aa-info-light">{{ t('home.entryMarketAction', 'Browse Market') }} →</span>
            </router-link>

            <router-link :to="{ path: '/docs', query: { doc: 'pluginGuide' } }" class="group rounded-2xl border border-aa-border bg-aa-panel/60 p-6 backdrop-blur-xl transition-all duration-200 card-hover-amber">
              <div class="flex items-start justify-between">
                <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-aa-warning">{{ t('home.entryDocsLabel', 'Hooks & Plugins') }}</p>
                <svg aria-hidden="true" class="w-5 h-5 text-aa-warning opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </div>
              <h3 class="mt-3 text-2xl font-bold text-white font-outfit">{{ t('home.entryDocsTitle', 'Understand verifier and hook composition') }}</h3>
              <p class="mt-3 text-sm leading-7 text-aa-muted">{{ t('home.entryDocsBody', 'Use the new hook and plugin guide to choose the right verifier, policy hook, and recovery setup before you deploy or buy an AA address.') }}</p>
              <span class="mt-6 inline-flex items-center text-sm font-semibold text-aa-warning group-hover:text-aa-warning">{{ t('home.entryDocsAction', 'Read Guide') }} →</span>
            </router-link>
          </div>
        </section>

        <!-- How It Works -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.howItWorksTitle', 'How It Works') }}</h2>
            <div class="section-accent-line"></div>
            <p class="text-aa-muted mt-4 text-base max-w-2xl mx-auto">{{ t('home.howItWorksSubtitle', 'From wallet connection to on-chain operation in three steps.') }}</p>
          </div>
          <div class="relative grid gap-6 md:grid-cols-3">
            <!-- Connector lines between steps (desktop only) -->
            <div class="hidden md:block absolute top-12 left-[calc(33.33%_-_8px)] w-[calc(33.33%_+_16px)] h-px bg-gradient-to-r from-neo-500/30 via-neo-500/20 to-neo-500/30 z-0"></div>
            <div v-for="(step, idx) in steps" :key="idx" class="relative rounded-xl border border-aa-border bg-aa-panel/60 backdrop-blur-xl p-8 text-center card-hover-green z-10">
              <div class="w-14 h-14 rounded-full bg-neo-500/15 border-2 border-neo-500/40 flex items-center justify-center mx-auto mb-6 text-neo-400 font-bold text-xl font-mono shadow-glow-neo-sm">{{ idx + 1 }}</div>
              <h3 class="text-lg font-bold text-white mb-3 font-outfit">{{ step.title }}</h3>
              <p class="text-sm text-aa-muted leading-relaxed">{{ step.body }}</p>
            </div>
          </div>
        </section>

        <!-- Ecosystem Partners -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <h2 class="text-center text-xs font-semibold uppercase tracking-[0.2em] text-aa-muted mb-6">{{ t('home.ecosystemLabel', 'Built on Neo N3 Ecosystem') }}</h2>
          <div class="flex flex-wrap items-center justify-center gap-4">
            <div
              v-for="partner in ecosystemPartners"
              :key="partner.name"
              class="group relative flex items-center gap-2.5 px-4 py-2 rounded-full border border-aa-border bg-aa-panel/70 hover:border-aa-muted hover:-translate-y-px transition-all duration-200 cursor-default select-none"
            >
              <div class="w-7 h-7 rounded-full bg-aa-dark/60 border border-aa-border flex items-center justify-center group-hover:border-aa-muted/50 transition-colors duration-200">
                <svg aria-hidden="true" class="w-3.5 h-3.5 text-aa-muted group-hover:text-aa-text transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="partner.icon"></svg>
              </div>
              <span class="text-xs font-bold font-mono text-aa-muted group-hover:text-aa-text transition-colors duration-200">{{ partner.name }}</span>
              <div class="absolute -top-9 left-1/2 -translate-x-1/2 bg-aa-dark border border-aa-border rounded-md px-2.5 py-1 text-[10px] text-aa-text font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-lg z-20">
                {{ partner.tooltip }}
                <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-aa-border"></div>
              </div>
            </div>
          </div>
          <div class="text-center mt-6">
            <router-link to="/market" class="text-xs font-semibold text-aa-muted hover:text-aa-text transition-colors duration-200 uppercase tracking-wider">
              {{ t('home.ecosystemViewAll', 'Browse Market') }} &rarr;
            </router-link>
          </div>
        </section>

        <!-- Why Abstract Accounts? -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.comparisonTitle', 'Why Abstract Accounts?') }}</h2>
            <div class="section-accent-line"></div>
            <p class="text-aa-muted mt-4 text-base max-w-2xl mx-auto">{{ t('home.comparisonSubtitle', 'See how programmable accounts compare to traditional wallets.') }}</p>
          </div>
          <div class="max-w-3xl mx-auto rounded-xl border border-aa-border bg-aa-panel/60 backdrop-blur-xl overflow-hidden">
            <!-- Desktop: grid table -->
            <div class="hidden sm:grid grid-cols-3 text-xs uppercase tracking-wider font-bold text-aa-muted bg-aa-panel/60 px-6 py-3 border-b border-aa-border">
              <span>{{ t('home.comparisonFeature', 'Feature') }}</span>
              <span>{{ t('home.comparisonTraditional', 'Traditional Wallet') }}</span>
              <span class="text-neo-400">{{ t('home.comparisonAbstract', 'Abstract Account') }}</span>
            </div>
            <div v-for="(row, i) in comparisonRows" :key="'d'+i" class="hidden sm:grid grid-cols-3 px-6 py-4 text-sm border-b border-aa-border/60 last:border-b-0 hover:bg-aa-dark/20 transition-colors duration-200">
              <span class="text-aa-text font-medium">{{ row.feature }}</span>
              <span class="text-aa-muted flex items-start gap-2">
                <svg aria-hidden="true" class="w-4 h-4 text-aa-error-light mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                {{ row.traditional }}
              </span>
              <span class="text-aa-success-light flex items-start gap-2">
                <svg aria-hidden="true" class="w-4 h-4 text-aa-success mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                {{ row.abstract }}
              </span>
            </div>
            <!-- Mobile: stacked cards -->
            <div class="sm:hidden divide-y divide-aa-border/30">
              <div v-for="(row, i) in comparisonRows" :key="'m'+i" class="px-4 py-4 space-y-2">
                <h3 class="text-sm font-bold text-white">{{ row.feature }}</h3>
                <div class="flex items-start gap-2 text-xs text-aa-muted">
                  <svg aria-hidden="true" class="w-3.5 h-3.5 text-aa-error-light mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  {{ row.traditional }}
                </div>
                <div class="flex items-start gap-2 text-xs text-aa-success-light">
                  <svg aria-hidden="true" class="w-3.5 h-3.5 text-aa-success mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  {{ row.abstract }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Architecture Description -->
        <section data-lazy-section="architecture" class="mb-20 relative rounded-2xl bg-aa-panel/60 backdrop-blur-xl border border-aa-border p-8 md:p-14 overflow-hidden mx-auto max-w-5xl shadow-2xl scroll-reveal" :ref="observe">
          <div class="absolute inset-0 bg-subtle-glass pointer-events-none"></div>
          <div class="relative z-10 text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.architectureTitle', 'How Abstract Accounts Work on Neo N3') }}</h2>
            <div class="section-accent-line"></div>
            <p class="text-aa-muted mt-6 text-base max-w-2xl mx-auto leading-relaxed">
              {{ t('home.architectureSubtitle', 'Your signature travels through a relay to the Neo VM, where a lightweight proxy forwards it to the master contract — which checks verifier plugins, enforces hooks, and executes the operation.') }}
            </p>
          </div>
          <div class="relative z-10 bg-aa-dark/50 rounded-xl p-4 md:p-8 border border-aa-border shadow-inner">
            <ArchitectureDiagram v-if="visibleSections.has('architecture')" />
            <div v-else class="skeleton h-48 w-full"></div>
          </div>
        </section>

        <!-- Developer Quick Start -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.devTitle', 'Developer Quick Start') }}</h2>
            <div class="section-accent-line"></div>
            <p class="text-aa-muted mt-4 text-base max-w-2xl mx-auto">{{ t('home.devSubtitle', 'Create and interact with Abstract Accounts in a few lines of code.') }}</p>
          </div>
          <div v-if="hasRealContractHash" class="max-w-3xl mx-auto rounded-xl border border-aa-border bg-aa-dark/80 backdrop-blur-xl overflow-hidden">
            <div class="flex items-center gap-2 px-5 py-3 bg-aa-panel/60 border-b border-aa-border">
              <span class="w-3 h-3 rounded-full bg-aa-error/70"></span>
              <span class="w-3 h-3 rounded-full bg-aa-warning/70"></span>
              <span class="w-3 h-3 rounded-full bg-aa-success/70"></span>
              <span class="ml-3 text-xs font-mono text-aa-muted">quickstart.js</span>
              <button class="ml-auto text-xs font-mono px-3 py-2 rounded bg-aa-dark/60 text-aa-text hover:text-aa-text hover:bg-aa-dark/60 transition-colors duration-200" @click="copyCode">{{ copied ? t('home.copied', 'Copied!') : t('home.copyCode', 'Copy') }}</button>
            </div>
            <pre class="p-5 md:p-6 text-[13px] font-mono leading-relaxed text-aa-text overflow-x-auto"><code><span class="text-aa-muted">// Register a V3 Abstract Account on Neo N3</span>
<span class="text-aa-error-light">const</span> <span class="text-aa-info-light">invoke</span> = {
  <span class="text-aa-info-light">scriptHash</span>: <span class="text-aa-success-light">'{{ contractHashDisplay }}'</span>,
  <span class="text-aa-info-light">operation</span>: <span class="text-aa-success-light">'registerAccount'</span>,
  <span class="text-aa-info-light">args</span>: [
    { <span class="text-aa-info-light">type</span>: <span class="text-aa-success-light">'Hash160'</span>, <span class="text-aa-info-light">value</span>: <span class="text-aa-info-light">accountIdHash</span> },
    { <span class="text-aa-info-light">type</span>: <span class="text-aa-success-light">'Hash160'</span>, <span class="text-aa-info-light">value</span>: <span class="text-aa-info-light">verifierHash</span> },
    { <span class="text-aa-info-light">type</span>: <span class="text-aa-success-light">'ByteArray'</span>, <span class="text-aa-info-light">value</span>: <span class="text-aa-success-light">'0x'</span> },
    { <span class="text-aa-info-light">type</span>: <span class="text-aa-success-light">'Hash160'</span>, <span class="text-aa-info-light">value</span>: <span class="text-aa-info-light">hookHash</span> },
    { <span class="text-aa-info-light">type</span>: <span class="text-aa-success-light">'Hash160'</span>, <span class="text-aa-info-light">value</span>: <span class="text-aa-info-light">backupOwnerHash</span> },
    { <span class="text-aa-info-light">type</span>: <span class="text-aa-success-light">'Integer'</span>, <span class="text-aa-info-light">value</span>: <span class="text-aa-warning">86400</span> },
  ]
};

<span class="text-aa-muted">// Sign &amp; submit via your Neo wallet</span>
<span class="text-aa-error-light">const</span> <span class="text-aa-info-light">result</span> = <span class="text-aa-error-light">await</span> <span class="text-aa-info-light">walletService</span>.<span class="text-neo-400">invoke</span>(<span class="text-aa-info-light">invoke</span>);
<span class="text-aa-info-light">console</span>.<span class="text-neo-400">log</span>(<span class="text-aa-success-light">'TxID:'</span>, <span class="text-aa-info-light">result</span>.<span class="text-aa-info-light">txid</span>);</code></pre>
          </div>
          <div v-else class="empty-state max-w-3xl mx-auto">
            <svg aria-hidden="true" class="mx-auto mb-3 w-8 h-8 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linelinecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            <p class="text-sm font-medium text-aa-text">{{ t('home.devNoContract', 'Contract hash not configured') }}</p>
            <p class="mt-1 text-xs text-aa-muted">{{ t('home.devNoContractHint', 'Set AA_CONTRACT_HASH in your environment to see the quick start snippet.') }}</p>
          </div>
        </section>

        <!-- FAQ -->
        <section class="mb-20 scroll-reveal" :ref="observe">
          <div class="text-center mb-10">
            <h2 class="text-2xl md:text-3xl font-bold text-white font-outfit">{{ t('home.faqTitle', 'Frequently Asked Questions') }}</h2>
            <div class="section-accent-line"></div>
            <p class="text-aa-muted mt-4 text-base max-w-2xl mx-auto">{{ t('home.faqSubtitle', 'Common questions about Abstract Accounts on Neo N3.') }}</p>
          </div>
          <div class="max-w-3xl mx-auto space-y-3">
            <div v-for="(item, i) in faqItems" :key="i" class="rounded-xl border border-aa-border bg-aa-panel/60 backdrop-blur-xl overflow-hidden transition-all duration-200" :class="openFaq === i ? 'border-neo-500/20 border-l-2 border-l-neo-500/40' : ''">
              <button :id="'faq-q-' + i" @click="openFaq = openFaq === i ? -1 : i" :aria-expanded="openFaq === i" :aria-controls="'faq-a-' + i" class="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-aa-dark/30 transition-colors duration-200">
                <span class="text-sm font-semibold text-aa-text pr-4">{{ item.q }}</span>
                <svg aria-hidden="true" class="w-5 h-5 text-aa-muted shrink-0 transition-transform duration-200 ease-out" :class="openFaq === i && 'rotate-180 text-neo-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              <div :id="'faq-a-' + i" role="region" :aria-labelledby="'faq-q-' + i" class="faq-answer px-6 text-sm text-aa-muted leading-relaxed" :class="openFaq === i ? 'faq-open pb-5 pt-4 border-t border-aa-border/60' : 'faq-closed'">
                {{ item.a }}
              </div>
            </div>
          </div>
        </section>

        <!-- CTA Band -->
        <section class="relative rounded-2xl bg-aa-panel/80 backdrop-blur-xl p-8 md:p-12 text-center mx-auto max-w-5xl shadow-2xl gradient-border-card scroll-reveal" :ref="observe">
          <h2 class="text-3xl md:text-4xl font-bold text-white font-outfit mb-3">{{ t('home.ctaTitle', 'Start Building with Abstract Accounts') }}</h2>
          <p class="text-xs font-mono text-aa-orange/80 uppercase tracking-widest mb-2">{{ t('home.ctaTime', 'Get Started in 3 Minutes') }}</p>
          <p class="text-aa-muted max-w-xl mx-auto mb-6">{{ t('home.ctaSubtitle', 'Deploy a programmable wallet, configure verifiers, and send your first gasless transaction.') }}</p>
          <div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <router-link to="/app" class="btn-primary btn-lg">
              {{ t('home.ctaPrimary', 'Launch App') }}
            </router-link>
            <router-link :to="{ path: '/docs', query: { doc: 'pluginGuide' } }" class="btn-secondary">
              {{ t('home.ctaSecondary', 'Read the Docs') }}
            </router-link>
          </div>
          <div v-if="testnetSummary" class="mt-5 flex items-center justify-center gap-2 text-xs text-aa-success">
            <span class="w-2 h-2 rounded-full bg-aa-success animate-pulse"></span>
            {{ t('home.ctaTestnet', 'Testnet is live') }}
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, h, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '@/i18n';
import { useScrollReveal } from '@/composables/useScrollReveal.js';
import { useClipboard } from '@/composables/useClipboard.js';
import { useToast } from 'vue-toastification';
import { fetchTestnetStatus, fetchTestnetSummary } from '@/services/n3indexService.js';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig.js';

const { t } = useI18n();
const AsyncSkeleton = { template: '<div class="skeleton h-48 w-full"></div>' };
const AsyncError = { render: () => h('div', { class: 'flex items-center justify-center h-48 rounded-xl border border-aa-border/40 bg-aa-panel/30 text-aa-muted text-sm', role: 'alert' }, [h('span', { class: 'text-aa-error mr-2' }, '!'), t('home.componentLoadError', 'Failed to load component.')]) };
const ArchitectureDiagram = defineAsyncComponent({ loader: () => import('@/components/ArchitectureDiagram.vue'), loadingComponent: AsyncSkeleton, errorComponent: AsyncError });
const { observe } = useScrollReveal();
const { copiedKey, markCopied, copyText } = useClipboard({ timeout: 2000 });
const toast = useToast();

// Scroll progress bar
const scrollProgress = ref(0);

function updateScrollProgress() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  scrollProgress.value = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
}

// Lazy section loading
const visibleSections = ref(new Set());
let sectionObserver = null;

function setupSectionObserver() {
  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !visibleSections.value.has(entry.target.dataset.lazySection)) {
          visibleSections.value = new Set([...visibleSections.value, entry.target.dataset.lazySection]);
          sectionObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '200px' }
  );
  document.querySelectorAll('[data-lazy-section]').forEach((el) => {
    sectionObserver.observe(el);
  });
}

const ecosystemPartners = computed(() => [
  { name: 'Neo N3', tooltip: t('home.partnerNeoN3', 'Core blockchain platform'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>' },
  { name: 'N3Index', tooltip: t('home.partnerN3Index', 'Neo N3 index & API service'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>' },
  { name: 'NeoFS', tooltip: t('home.partnerNeoFS', 'Decentralized storage'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>' },
  { name: 'NeoGo', tooltip: t('home.partnerNeoGo', 'Go implementation of Neo'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>' },
  { name: 'CoZ', tooltip: t('home.partnerCoZ', 'City of Zion community'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>' },
  { name: 'Neoline', tooltip: t('home.partnerNeoline', 'Neo wallet extension'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>' },
  { name: 'O3', tooltip: t('home.partnerO3', 'Multi-chain wallet'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>' },
  { name: 'GhostMarket', tooltip: t('home.partnerGhostMarket', 'NFT marketplace on Neo'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>' },
  { name: 'Flamingo', tooltip: t('home.partnerFlamingo', 'DeFi protocol on Neo'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>' },
  { name: 'BurgerSwap', tooltip: t('home.partnerBurgerSwap', 'DEX on Neo'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>' },
  { name: 'TOTHEMOON', tooltip: t('home.partnerTothemoon', 'NFT game on Neo'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>' },
  { name: 'Meme2Earn', tooltip: t('home.partnerMeme2Earn', 'Community engagement platform'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' },
]);

const features = computed(() => [
  { title: t('home.feature1Title', 'Plugin-based Verification'), body: t('home.feature1Body', 'Choose verifier plugins for your account — from simple public-key checks to complex multi-sig policies.'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>', accentBg: 'bg-neo-500/10 border-neo-500/20 group-hover:bg-neo-500/15 group-hover:border-neo-500/30', accentText: 'text-neo-400', link: '/app', linkLabel: t('home.feature1Link', 'Open Workspace') },
  { title: t('home.feature2Title', 'Deterministic Addresses'), body: t('home.feature2Body', 'Derive AA addresses from a seed before deploying, so you always know where your account lives.'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>', accentBg: 'bg-aa-info/10 border-aa-info/20 group-hover:bg-aa-info/15 group-hover:border-aa-info/30', accentText: 'text-aa-info', link: '/app', linkLabel: t('home.feature2Link', 'Try Create') },
  { title: t('home.feature3Title', 'Transferable AA Addresses'), body: t('home.feature3Body', 'List and trade AA address shells in a trustless on-chain marketplace with escrow settlement.'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>', accentBg: 'bg-aa-purple/10 border-aa-purple/20 group-hover:bg-aa-purple/15 group-hover:border-aa-purple/30', accentText: 'text-aa-purple-light', link: '/market', linkLabel: t('home.feature3Link', 'Browse Market') },
  { title: t('home.feature4Title', 'Relay & Paymaster'), body: t('home.feature4Body', 'Submit transactions through a relay with paymaster sponsorship — no need to hold GAS.'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>', accentBg: 'bg-aa-orange/10 border-aa-orange/20 group-hover:bg-aa-orange/15 group-hover:border-aa-orange/30', accentText: 'text-aa-orange', link: '/app', linkLabel: t('home.feature4Link', 'Try Broadcast') },
  { title: t('home.feature5Title', 'Backup-owner Recovery'), body: t('home.feature5Body', 'Set a backup owner and escape timelock so you can always recover access to your account.'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>', accentBg: 'bg-aa-warning/10 border-aa-warning/20 group-hover:bg-aa-warning/15 group-hover:border-aa-warning/30', accentText: 'text-aa-warning', link: '/app', linkLabel: t('home.feature5Link', 'Configure') },
  { title: t('home.feature6Title', 'Mixed Signing'), body: t('home.feature6Body', 'Collect Neo wallet and EVM signatures on the same operation for cross-chain authorization.'), icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>', accentBg: 'bg-aa-success/10 border-aa-success/20 group-hover:bg-aa-success/15 group-hover:border-aa-success/30', accentText: 'text-aa-success', link: '/docs', linkLabel: t('home.feature6Link', 'Read Docs') },
]);

const steps = computed(() => [
  { title: t('home.step1Title', 'Connect & Derive'), body: t('home.step1Body', 'Link your Neo wallet or Web3Auth DID. Derive your deterministic AA address from a seed — before deploying anything on-chain.') },
  { title: t('home.step2Title', 'Deploy & Configure'), body: t('home.step2Body', 'Choose verifier plugins, set hook policies, assign a backup owner, and deploy your programmable account to Neo N3.') },
  { title: t('home.step3Title', 'Operate & Trade'), body: t('home.step3Body', 'Compose transactions, collect cross-chain signatures, broadcast via relay with paymaster sponsorship, or list your AA on the market.') },
]);

const comparisonRows = computed(() => [
  { feature: t('home.comparisonRow1', 'Address Derivation'), traditional: t('home.comparisonRow1Traditional', 'Fixed — tied to key pair'), abstract: t('home.comparisonRow1Abstract', 'Deterministic from seed, pre-deployable') },
  { feature: t('home.comparisonRow2', 'Recovery'), traditional: t('home.comparisonRow2Traditional', 'Lost key = lost funds'), abstract: t('home.comparisonRow2Abstract', 'Backup owner + escape timelock') },
  { feature: t('home.comparisonRow3', 'Cross-chain Signing'), traditional: t('home.comparisonRow3Traditional', 'Single-chain only'), abstract: t('home.comparisonRow3Abstract', 'Neo + EVM mixed signing') },
  { feature: t('home.comparisonRow4', 'Gas Sponsorship'), traditional: t('home.comparisonRow4Traditional', 'User must hold GAS'), abstract: t('home.comparisonRow4Abstract', 'Paymaster covers fees') },
  { feature: t('home.comparisonRow5', 'Governance Transfer'), traditional: t('home.comparisonRow5Traditional', 'Not transferable'), abstract: t('home.comparisonRow5Abstract', 'Transfer AA shell + governance on market') },
]);

const faqItems = computed(() => [
  { q: t('home.faq1Q', 'What is an Abstract Account?'), a: t('home.faq1A', 'An Abstract Account (AA) is a programmable smart-contract wallet on Neo N3. Instead of being tied to a single key pair, its behavior is defined by plugin-based verifiers, hook policies, and governance rules — all enforced by the on-chain contract pipeline.') },
  { q: t('home.faq2Q', 'How does deterministic address derivation work?'), a: t('home.faq2A', 'The AA contract derives your account address from a seed and verifier parameters before deployment. This means you can know your future address and even receive assets there before the contract is deployed on-chain.') },
  { q: t('home.faq3Q', 'Can I sell or transfer my AA address?'), a: t('home.faq3A', 'Yes. The Address Market lets you list AA address shells in trustless on-chain escrow. When a buyer settles, only the AA shell and backup-owner governance transfer — your private keys never leave your wallet.') },
  { q: t('home.faq4Q', 'What is the paymaster and relay system?'), a: t('home.faq4A', 'A relay submits your signed operation to the chain on your behalf. A paymaster can sponsor the GAS fees, so users don\'t need to hold GAS to interact with their AA. The system has been validated end-to-end on Neo N3 testnet.') },
  { q: t('home.faq5Q', 'How does backup-owner recovery work?'), a: t('home.faq5A', 'You designate a backup owner and set an escape timelock. If you lose access to your primary key, the backup owner can initiate recovery. After the timelock expires without objection, the backup owner gains control of the account.') },
  { q: t('home.faq6Q', 'Which networks are supported?'), a: t('home.faq6A', 'Currently Neo N3 testnet. The architecture is designed to extend to Neo N3 mainnet when ready. Mixed signing also supports EVM-side signatures for cross-chain operations.') },
]);

const openFaq = ref(-1);
const activePreviewTab = ref(0);
const PREVIEW_TAB_COUNT = 4;

function handleTabKeydown(e) {
  const { key } = e;
  let next = activePreviewTab.value;
  if (key === 'ArrowRight') { next = (next + 1) % PREVIEW_TAB_COUNT; }
  else if (key === 'ArrowLeft') { next = (next - 1 + PREVIEW_TAB_COUNT) % PREVIEW_TAB_COUNT; }
  else if (key === 'Home') { next = 0; }
  else if (key === 'End') { next = PREVIEW_TAB_COUNT - 1; }
  else return;
  e.preventDefault();
  activePreviewTab.value = next;
  const el = document.getElementById('preview-tab-' + next);
  if (el) el.focus();
}

const mockSteps = computed(() => [
  t('home.mockStepLoad', 'Load'),
  t('home.mockStepCompose', 'Compose'),
  t('home.mockStepSign', 'Sign'),
  t('home.mockStepBroadcast', 'Broadcast'),
]);

const mockCodeLines = [
  '<span class="text-aa-purple-light">public class</span> <span class="text-aa-text">UnifiedSmartWallet</span> : <span class="text-aa-info">SmartContract</span>',
  '{',
  '    <span class="text-aa-purple-light">private static readonly</span> <span class="text-aa-info">StorageMap</span> <span class="text-aa-text">Accounts</span>;',
  '    <span class="text-aa-purple-light">private static readonly</span> <span class="text-aa-info">StorageMap</span> <span class="text-aa-text">Verifiers</span>;',
  '',
  '    <span class="text-aa-purple-light">public static bool</span> <span class="text-neo-400">RegisterAccount</span>(',
  '        <span class="text-aa-info">UInt160</span> accountId, <span class="text-aa-info">UInt160</span> verifier,',
  '        <span class="text-aa-info">byte[]</span> hook, <span class="text-aa-info">UInt160</span> backup,',
  '        <span class="text-aa-info">ulong</span> timelock)',
  '    {',
  '        <span class="text-aa-muted">// validate & store account ...</span>',
  '    }',
  '}',
];
const hasRealContractHash = !!(RUNTIME_CONFIG.abstractAccountHash);
const contractHashDisplay = RUNTIME_CONFIG.abstractAccountHash || 'AA_CONTRACT_HASH';
const displayedSnippet = `// Register a V3 Abstract Account on Neo N3
const invoke = {
  scriptHash: '${contractHashDisplay}',
  operation: 'registerAccount',
  args: [
    { type: 'Hash160', value: accountIdHash },
    { type: 'Hash160', value: verifierHash },
    { type: 'ByteArray', value: '0x' },
    { type: 'Hash160', value: hookHash },
    { type: 'Hash160', value: backupOwnerHash },
    { type: 'Integer', value: 86400 },
  ]
};

// Sign & submit via your Neo wallet
const result = await walletService.invoke(invoke);
console.log('TxID:', result.txid);`;

const previewTabs = computed(() => [
  {
    label: t('home.previewTab1Label', 'Operations'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>',
    title: t('home.previewTab1Title', 'Compose & Broadcast'),
    desc: t('home.previewTab1Desc', 'Build multi-step operations, collect signatures from Neo and EVM wallets, then broadcast through the relay with paymaster sponsorship.'),
    accentBg: 'bg-aa-orange/10',
    accentText: 'text-aa-orange',
  },
  {
    label: t('home.previewTab2Label', 'Create'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>',
    title: t('home.previewTab2Title', 'Deploy New Account'),
    desc: t('home.previewTab2Desc', 'Configure verifier plugins, hook policies, and backup owners. Preview the deterministic address before deploying on-chain.'),
    accentBg: 'bg-neo-500/10',
    accentText: 'text-neo-400',
  },
  {
    label: t('home.previewTab3Label', 'Manage'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>',
    title: t('home.previewTab3Title', 'Governance Control'),
    desc: t('home.previewTab3Desc', 'Update verifiers, hooks, and backup owners. Trigger escape recovery or finalize after the timelock expires.'),
    accentBg: 'bg-aa-info/10',
    accentText: 'text-aa-info',
  },
  {
    label: t('home.previewTab4Label', 'Source'),
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>',
    title: t('home.previewTab4Title', 'Contract Source'),
    desc: t('home.previewTab4Desc', 'Browse the on-chain V3 UnifiedSmartWallet contract source. Inspect registration, execution, and governance methods.'),
    accentBg: 'bg-aa-purple/10',
    accentText: 'text-aa-purple-light',
  },
]);

const copied = computed(() => copiedKey.value === 'home-snippet');

async function copyCode() {
  const ok = await copyText(displayedSnippet);
  if (ok) {
    markCopied('home-snippet');
  } else {
    toast.error(t('home.copyFailed', 'Copy failed'));
  }
}

const testnetSummary = ref(null);
const testnetStatus = ref(null);
const statusLoadFailed = ref(false);
const loadingStatus = ref(t('home.loadingNetworkStatus', 'Loading network status...'));

onMounted(async () => {
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  setupSectionObserver();

  loadingStatus.value = t('home.connectingToN3Index', 'Connecting to N3Index...');
  try {
    const [summary, status] = await Promise.all([fetchTestnetSummary(), fetchTestnetStatus()]);
    testnetSummary.value = summary?.data || null;
    testnetStatus.value = status?.data || null;
    loadingStatus.value = null;
  } catch (_error) {
    if (import.meta.env.DEV) console.error('Testnet status fetch failed:', _error?.message);
    testnetSummary.value = null;
    testnetStatus.value = null;
    loadingStatus.value = null;
    statusLoadFailed.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress);
  if (sectionObserver) {
    sectionObserver.disconnect();
  }
});
</script>

<style scoped>
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.preview-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.faq-answer {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.2s ease,
              padding 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              border 0.2s ease;
}
.faq-open {
  max-height: 500px;
  opacity: 1;
}
.faq-closed {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.hero-preview-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.04) 45%,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0.04) 55%,
    transparent 70%
  );
  background-size: 200% 100%;
  animation: heroShimmer 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes heroShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-preview-overlay::after {
    animation: none;
  }
  .scroll-hint-bounce {
    animation: none;
  }
}

.scroll-hint-bounce {
  animation: scrollBounce 2.5s ease-in-out infinite;
}

@keyframes scrollBounce {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(6px); opacity: 0.7; }
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
  .scroll-fade-inner {
    -webkit-mask-image: none;
    mask-image: none;
    animation: none;
  }
}
</style>
