<template>
  <div class="relative min-h-screen overflow-hidden bg-aa-dark font-sans text-aa-text">
    <div class="absolute inset-0 z-0">
      <div class="absolute left-1/4 top-0 h-[480px] w-[480px] rounded-full bg-aa-info/10 blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-aa-success/10 blur-3xl"></div>
    </div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section class="mb-10 relative">
        <div class="absolute -top-20 -right-20 w-72 h-72 bg-aa-info/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -left-16 w-56 h-56 bg-aa-success/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aa-info/15 text-aa-info-light text-sm font-semibold border border-aa-info/30 shadow-sm mb-4">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-aa-info opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-aa-info"></span>
            </span>
            {{ t('market.badge', 'Trustless Escrow') }}
          </div>
          <span class="sr-only">{{ t('market.srDescription', 'Trustless escrow for AA address transfers') }}</span>
          <h1 class="text-4xl font-extrabold font-outfit md:text-5xl leading-tight">
            <span class="text-gradient-white">{{ t('market.subtitlePart1', 'AA Address') }}</span>
            <span class="text-gradient"> {{ t('market.subtitlePart2', 'Marketplace') }}</span>
          </h1>
          <p class="mt-4 max-w-3xl text-base leading-8 text-aa-text">{{ t('market.description', 'Sellers list an AA account and atomically lock it into escrow. Buyers settle in one chain transaction: transfer GAS to the market contract, rotate control to the new owner, and release seller payment only if the transfer succeeds.') }}</p>
          <div class="mt-6 flex flex-wrap gap-3">
            <router-link to="/app" class="btn-primary">{{ t('market.openAppWorkspace', 'Open App Workspace') }}</router-link>
            <a href="#vanity-generator" class="btn-secondary">{{ t('market.vanityTitle', 'Vanity Address Generator') }}</a>
            <router-link :to="{ path: '/docs', query: { doc: 'addressMarket' } }" class="btn-secondary">{{ t('market.readMarketGuide', 'Read Market Guide') }}</router-link>
          </div>
        </div>
      </section>

      <!-- Stats summary -->
      <section class="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <template v-if="loading && !hasLoaded">
          <div v-for="i in 3" :key="'stat-skel-'+i" class="gradient-border-card bg-aa-panel/60 backdrop-blur-xl p-5">
            <div class="skeleton h-3 w-24 mb-3"></div>
            <div class="skeleton h-8 w-16"></div>
          </div>
        </template>
        <template v-else>
          <div class="gradient-border-card bg-aa-panel/60 backdrop-blur-xl p-5 group hover:bg-aa-panel/60 transition-all duration-200">
            <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.statsTotal', 'Total Listings') }}</p>
            <p class="mt-2 text-3xl font-extrabold text-aa-text font-outfit">{{ listings.length }}</p>
          </div>
          <div class="gradient-border-card bg-aa-panel/60 backdrop-blur-xl p-5 group hover:bg-aa-panel/60 transition-all duration-200">
            <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.statsActive', 'Active Escrows') }}</p>
            <p class="mt-2 text-3xl font-extrabold text-aa-success font-outfit">{{ activeListingsCount }}</p>
          </div>
          <div class="gradient-border-card bg-aa-panel/60 backdrop-blur-xl p-5 group hover:bg-aa-panel/60 transition-all duration-200">
            <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.statsAvgPrice', 'Avg Price') }}</p>
            <p class="mt-2 text-3xl font-extrabold text-aa-text font-outfit">{{ averagePrice }} <span class="text-sm font-semibold text-aa-muted">GAS</span></p>
          </div>
        </template>
      </section>

      <section v-if="!marketConfigured" class="mb-8 rounded-2xl border border-aa-warning/20 bg-aa-warning/5 p-6 text-aa-warning">
        <h2 class="text-lg font-bold text-white">{{ t('market.notConfiguredTitle', 'Market Contract Not Configured') }}</h2>
        <p class="mt-3 text-sm leading-7">{{ t('market.notConfiguredBody', 'Set VITE_AA_MARKET_HASH for the current deployment before using the trustless escrow market. The UI will not fall back to local listings anymore.') }}</p>
      </section>

      <VanityGeneratorPanel id="vanity-generator" class="mb-8" :on-use-for-listing="setListingSeed" />

      <section class="mb-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]" data-vanity-anchor>
        <div class="rounded-2xl border border-aa-border bg-aa-panel/60 p-6 backdrop-blur-xl">
          <h2 class="text-lg font-bold text-white">{{ t('market.createEscrowListing', 'Create Escrow Listing') }}</h2>
          <p class="mt-2 text-sm leading-7 text-aa-muted">{{ t('market.createEscrowListingHint', 'Listing creation is a real on-chain action. The seller must be the current backup owner, and the account is frozen in escrow immediately after the listing transaction succeeds.') }}</p>

          <div class="mt-6 space-y-4">
            <label class="block" for="market-account-seed">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.accountSeedLabel', 'Account Seed / AccountId Hash') }}</span>
              <input id="market-account-seed" v-model="createForm.accountSeed" type="text" class="input-field w-full bg-aa-dark font-mono text-sm" :class="accountSeedInputClass" :placeholder="t('market.accountSeedPlaceholder', '64-char hex seed or 40-char account hash')" autocomplete="off" spellcheck="false" />
              <p v-if="accountSeedError" role="alert" class="mt-1 text-xs text-aa-error">{{ accountSeedError }}</p>
              <p v-else-if="listingPreview.address" class="mt-1 text-xs text-aa-success/70">{{ t('market.validAccountDetected', 'Valid account detected') }}</p>
            </label>

            <div class="rounded-2xl border border-aa-border bg-aa-dark/50 p-4 transition-all duration-200" :class="listingPreview.address ? 'border-aa-success/30 shadow-glow-emerald-sm' : ''">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.derivedAaAddress', 'Derived AA Address') }}</p>
                <button v-if="listingPreview.address" type="button" :aria-label="t('market.copyAddress', 'Copy address')" class="text-xs text-aa-muted hover:text-aa-text transition-colors duration-200 flex items-center gap-1" @click="copyDerivedAddress">
                  <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  {{ addressCopied ? t('market.copied', 'Copied!') : t('market.copy', 'Copy') }}
                </button>
              </div>
              <p class="mt-2 break-all font-mono text-sm text-aa-text">{{ listingPreview.address || t('market.waitingForAccountSeed', 'Waiting for account seed / accountId hash') }}</p>
              <p v-if="listingPreview.accountIdHash" class="mt-2 break-all font-mono text-xs text-aa-muted">{{ t('market.accountIdLabel', 'accountId') }}: 0x{{ listingPreview.accountIdHash }}</p>
            </div>

            <label class="block" for="market-listing-title">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.listingTitleLabel', 'Listing Title') }}</span>
              <input id="market-listing-title" v-model="createForm.title" type="text" maxlength="80" class="input-field w-full bg-aa-dark text-sm" :class="titleError ? 'border-aa-error focus:border-aa-error-light focus:ring-aa-error/20' : ''" :placeholder="t('market.listingTitlePlaceholder', 'Short and descriptive')" @input="validateTitle" />
              <p v-if="titleError" role="alert" class="mt-1 text-xs text-aa-error">{{ titleError }}</p>
              <p v-else class="mt-1 text-xs text-aa-muted">{{ createForm.title.length }}/80</p>
            </label>

            <label class="block" for="market-price-gas">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.priceLabel', 'Price (GAS)') }}</span>
              <input id="market-price-gas" v-model="createForm.price_gas" type="text" inputmode="decimal" class="input-field w-full bg-aa-dark font-mono text-sm" :class="priceInputClass" :placeholder="t('market.pricePlaceholder', 'e.g. 25.5')" @input="validatePrice" />
              <p v-if="priceError" role="alert" class="mt-1 text-xs text-aa-error">{{ priceError }}</p>
            </label>

            <label class="block" for="market-metadata-uri">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.metadataLabel', 'Metadata / Docs URL') }}</span>
              <input id="market-metadata-uri" v-model="createForm.metadataUri" type="text" maxlength="240" class="input-field w-full bg-aa-dark text-sm" :placeholder="t('market.metadataPlaceholder', 'Optional URL with listing context')" />
            </label>

            <button type="button" class="btn-primary w-full" :class="{ 'btn-loading': submitting }" :disabled="submitting || !canSubmitListing || !marketConfigured" :aria-label="submitting ? t('market.submittingListing', 'Submitting Listing...') : t('market.createTrustlessListing', 'Create Trustless Listing')" @click="submitListing">
              {{ submitting ? t('market.submittingListing', 'Submitting Listing...') : t('market.createTrustlessListing', 'Create Trustless Listing') }}
            </button>

            <p class="text-xs leading-6 text-aa-muted">
              {{ t('market.sellerWalletLabel', 'Seller wallet:') }}
              <span class="font-mono text-aa-text">{{ connectedAccount || t('market.connectNeoWallet', 'connect a Neo wallet') }}</span>
            </p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col gap-3 rounded-2xl border border-aa-border bg-aa-panel/60 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-bold text-white">{{ t('market.onChainListings', 'On-Chain Listings') }}</h2>
              <p class="mt-1 text-sm text-aa-muted">{{ t('market.onChainListingsHint', 'Listings, escrow status, and settlement are read directly from the market contract and AA core contract.') }}</p>
            </div>
            <button type="button" class="btn-secondary" :class="{ 'btn-loading': loading }" :disabled="loading || !marketConfigured" :aria-label="loading ? t('market.refreshing', 'Refreshing...') : t('market.refreshListings', 'Refresh Listings')" @click="refreshListings">
              {{ loading ? t('market.refreshing', 'Refreshing...') : t('market.refreshListings', 'Refresh Listings') }}
            </button>
          </div>

          <div v-if="loading && !hasLoaded && marketConfigured" class="space-y-4">
            <div v-for="i in 2" :key="'listing-skel-'+i" class="gradient-border-card bg-aa-panel/60 backdrop-blur-xl overflow-hidden">
              <div class="p-6 space-y-4">
                <div class="flex items-center justify-between">
                  <div class="skeleton h-5 w-40"></div>
                  <div class="skeleton h-5 w-20 rounded-full"></div>
                </div>
                <div class="rounded-xl border border-aa-border bg-aa-dark/50 p-4 space-y-3">
                  <div class="skeleton h-3 w-20"></div>
                  <div class="skeleton h-4 w-full"></div>
                  <div class="flex gap-4">
                    <div class="skeleton h-3 w-32"></div>
                    <div class="skeleton h-3 w-32"></div>
                  </div>
                </div>
                <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div v-for="j in 4" :key="'skel-detail-'+j" class="space-y-1.5">
                    <div class="skeleton h-3 w-16"></div>
                    <div class="skeleton h-4 w-24"></div>
                  </div>
                </div>
              </div>
              <div class="border-t border-aa-border bg-aa-panel/40 p-4">
                <div class="flex items-center justify-between">
                  <div class="skeleton h-10 w-64 rounded-xl"></div>
                  <div class="skeleton h-9 w-28 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="marketConfigured && listings.length === 0" class="empty-state">
            <div class="mx-auto w-16 h-16 rounded-full bg-aa-dark/50 flex items-center justify-center mb-4">
              <svg aria-hidden="true" class="w-8 h-8 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <p class="text-aa-text font-medium mb-2">{{ t('market.noListingsFound', 'No listings found on-chain yet') }}</p>
            <p class="text-sm text-aa-muted max-w-md mx-auto mb-6">{{ t('market.noListingsHint', 'Be the first to list your Abstract Account address for sale. Listings are secured by trustless on-chain escrow.') }}</p>
            <router-link to="/app" class="inline-flex items-center gap-2 text-sm font-semibold text-aa-info hover:text-aa-info-light transition-colors duration-200">
              {{ t('market.createAaAccountFirst', 'Create an AA account first') }} <span>&rarr;</span>
            </router-link>
          </div>

          <div v-else class="space-y-4">
            <article v-for="listing in listings" :key="listing.id" class="gradient-border-card bg-aa-panel/60 backdrop-blur-xl overflow-hidden">
              <div class="p-6">
                <!-- Header row: title, status, price -->
                <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
                  <div class="flex flex-wrap items-center gap-2">
                    <img v-if="listingMetadata[listing.accountIdHash]?.logo_url" :src="listingMetadata[listing.accountIdHash].logo_url" :alt="t('market.listingLogo', 'Listing logo')" class="w-6 h-6 rounded border border-aa-border object-cover" />
                    <h3 class="text-lg font-bold text-white">{{ listing.title || `${t('market.listingPrefix', 'Listing #')}${listing.id}` }}</h3>
                    <span class="badge text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-1" :class="statusBadgeClass(listing.status)">
                      <span v-if="listing.status === 'active'" class="w-1.5 h-1.5 rounded-full bg-aa-success"></span>
                      {{ translatedStatus(listing.status) }}
                    </span>
                    <span v-if="listing.escrow_active" class="rounded-full border border-aa-success/30 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-aa-success-light bg-aa-success/10">
                      {{ t('market.escrowLocked', 'escrow locked') }}
                    </span>
                  </div>
                  <div class="flex items-baseline gap-1.5 shrink-0">
                    <span class="text-3xl font-extrabold text-aa-text font-outfit">{{ listing.price_gas }}</span>
                    <span class="text-sm font-semibold text-aa-muted">GAS</span>
                  </div>
                </div>

                <p v-if="listingMetadata[listing.accountIdHash]?.description" class="text-sm text-aa-muted mb-4">{{ listingMetadata[listing.accountIdHash].description }}</p>

                <!-- Account info row -->
                <div class="rounded-xl border border-aa-border bg-aa-dark/50 p-4 mb-4">
                  <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted mb-2">{{ t('market.aaAddress', 'AA Address') }}</p>
                  <div class="flex items-start gap-2">
                    <p class="break-all font-mono text-sm text-aa-text flex-1">{{ listing.account_address }}</p>
                    <button type="button" :aria-label="t('market.copyAddress', 'Copy address')" class="shrink-0 text-xs text-aa-muted hover:text-aa-text transition-colors duration-200" @click="copyText(listing.account_address); markCopied('listing-addr-' + listing.id)">
                      <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-aa-muted">
                    <span class="flex items-center">{{ t('market.accountIdLabel', 'Account ID') }}: <span class="font-mono text-aa-muted">0x{{ listing.accountIdHash?.slice(0, 8) }}...{{ listing.accountIdHash?.slice(-4) }}</span>
                      <button v-if="listing.accountIdHash" :aria-label="t('market.copyAccountId', 'Copy account ID')" @click="copyText('0x' + listing.accountIdHash); markCopied('listing-accid-' + listing.id)" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                        <svg aria-hidden="true" v-if="copiedKey !== 'listing-accid-' + listing.id" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                        <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </button>
                    </span>
                    <span class="flex items-center">{{ t('market.seller', 'Seller') }}: <span class="font-mono text-aa-muted">{{ listing.seller_address ? listing.seller_address.slice(0, 8) + '...' + listing.seller_address.slice(-4) : t('market.unknown', 'unknown') }}</span>
                      <button v-if="listing.seller_address" :aria-label="t('market.copySeller', 'Copy seller address')" @click="copyText(listing.seller_address); markCopied('listing-seller-' + listing.id)" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                        <svg aria-hidden="true" v-if="copiedKey !== 'listing-seller-' + listing.id" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                        <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </button>
                    </span>
                  </div>
                </div>

                <!-- Details grid -->
                <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.verifier', 'Verifier') }}</p>
                    <p class="mt-1 text-sm text-aa-text">{{ listing.verifier_profile || t('market.none', 'None') }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.hook', 'Hook') }}</p>
                    <p class="mt-1 text-sm text-aa-text">{{ listing.hook_profile || t('market.none', 'None') }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.backupOwner', 'Backup Owner') }}</p>
                    <div class="mt-1 flex items-center">
                      <span class="font-mono text-sm text-aa-text flex-1">{{ listing.backup_owner ? listing.backup_owner.slice(0, 8) + '...' + listing.backup_owner.slice(-4) : t('market.unset', 'unset') }}</span>
                      <button v-if="listing.backup_owner" :aria-label="t('market.copyBackupOwner', 'Copy backup owner')" @click="copyText(listing.backup_owner); markCopied('listing-backup-' + listing.id)" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                        <svg aria-hidden="true" v-if="copiedKey !== 'listing-backup-' + listing.id" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                        <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.metadata', 'Metadata') }}</p>
                    <a v-if="listing.metadataUri" :href="listing.metadataUri" target="_blank" rel="noopener noreferrer" class="mt-1 text-sm text-aa-info-light hover:text-aa-info transition-colors duration-200">
                      {{ t('market.viewMetadata', 'View') }} &rarr;
                    </a>
                    <p v-else class="mt-1 text-sm text-aa-muted">{{ t('market.noMetadataUrl', 'No metadata URL') }}</p>
                  </div>
                </div>
              </div>

              <!-- Actions footer -->
              <div class="border-t border-aa-border bg-aa-panel/40 p-4">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div class="rounded-xl border border-aa-border bg-aa-dark/50 p-3 flex-1 max-w-xl">
                    <p class="text-xs font-semibold uppercase tracking-widest text-aa-muted mb-2">{{ t('market.buyerTransferPlan', 'Buyer Transfer Plan') }}</p>
                    <p class="text-xs leading-6 text-aa-muted">{{ t('market.buyerTransferPlanHint', 'Settlement transfers only the AA shell. Existing verifier and hook bindings are cleared during settlement. Reconfigure fresh plugins afterward.') }}</p>
                    <label class="block mt-2" :for="'market-backup-owner-' + listing.id">
                      <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.newBackupOwner', 'New Backup Owner') }}</span>
                      <input :id="'market-backup-owner-' + listing.id" v-model="purchaseForm(listing.id).newBackupOwner" type="text" class="input-field w-full bg-aa-dark font-mono text-sm" :placeholder="connectedAccount || t('market.addressPlaceholder', 'N...')" />
                    </label>
                  </div>

                  <div class="flex flex-wrap gap-2 shrink-0">
                    <button type="button" class="btn-primary" :class="{ 'btn-loading': buyingId === listing.id }" :disabled="buyingId === listing.id || listing.status !== 'active' || !marketConfigured || !connectedAccount" :aria-label="buyingId === listing.id ? t('market.settling', 'Settling...') : t('market.buyWithEscrow', 'Buy With Escrow')" @click="buyListingAction(listing)">
                      {{ buyingId === listing.id ? t('market.settling', 'Settling...') : t('market.buyWithEscrow', 'Buy With Escrow') }}
                    </button>
                    <button v-if="isSeller(listing)" type="button" class="btn-danger" :class="{ 'btn-loading': cancellingId === listing.id }" :disabled="cancellingId === listing.id || listing.status !== 'active'" :aria-label="cancellingId === listing.id ? t('market.cancelling', 'Cancelling...') : t('market.cancelListing', 'Cancel Listing')" @click="cancelListingAction(listing)">
                      {{ cancellingId === listing.id ? t('market.cancelling', 'Cancelling...') : t('market.cancelListing', 'Cancel Listing') }}
                    </button>
                    <button v-if="isRefundBuyer(listing)" type="button" class="btn-ghost" :class="{ 'btn-loading': refundId === listing.id }" :disabled="refundId === listing.id || !connectedAccount" :aria-label="refundId === listing.id ? t('market.refunding', 'Refunding...') : t('market.refundPendingPayment', 'Refund Pending Payment')" :title="t('market.refundHint', 'Refund your pending payment if settlement did not complete')" @click="refundAction(listing)">
                      {{ refundId === listing.id ? t('market.refunding', 'Refunding...') : t('market.refundPendingPayment', 'Refund Pending Payment') }}
                    </button>
                  </div>
                </div>

                <div v-if="isSeller(listing) && listing.status === 'active'" class="mt-3 flex gap-2 items-end max-w-xs">
                  <label class="block flex-1" :for="'market-update-price-' + listing.id">
                    <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-aa-muted">{{ t('market.updatePrice', 'Update Price') }}</span>
                    <input :id="'market-update-price-' + listing.id" v-model="priceDrafts[listing.id]" type="text" inputmode="decimal" class="input-field w-full bg-aa-dark font-mono text-sm" :placeholder="listing.price_gas" />
                  </label>
                  <button type="button" class="btn-secondary" :class="{ 'btn-loading': priceUpdatingId === listing.id }" :disabled="priceUpdatingId === listing.id" :aria-label="priceUpdatingId === listing.id ? t('market.updating', 'Updating...') : t('market.update', 'Update')" @click="updatePriceAction(listing)">
                    {{ priceUpdatingId === listing.id ? t('market.updating', 'Updating...') : t('market.update', 'Update') }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useI18n } from '@/i18n';
import { connectedAccount } from '@/utils/wallet';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig.js';
import { getScriptHashFromAddress } from '@/utils/neo.js';
import { useClipboard } from '@/composables/useClipboard';
import {
  buyAddressListing,
  cancelAddressListing,
  createAddressListing,
  deriveVirtualAddressFromListing,
  isAddressMarketConfigured,
  listAddressListings,
  readAddressListing,
  refundPendingAddressPurchase,
  resolveListedAccountId,
  updateAddressListingPrice,
} from '@/services/addressMarketService.js';
import { fetchAccountMetadataBatch } from '@/services/accountMetadataService.js';
import VanityGeneratorPanel from '@/features/market/components/VanityGeneratorPanel.vue';
import { translateError } from '@/config/errorCodes.js';

const { t } = useI18n();
const toast = useToast();
const { copiedKey, markCopied, copyText } = useClipboard();
const marketConfigured = isAddressMarketConfigured();
const listings = ref([]);
const listingMetadata = ref({});
const loading = ref(false);
const hasLoaded = ref(false);
const submitting = ref(false);
const buyingId = ref('');
const cancellingId = ref('');
const refundId = ref('');
const priceUpdatingId = ref('');
const priceDrafts = reactive({});
const purchaseDrafts = reactive({});

const createForm = reactive({
  accountSeed: '',
  title: '',
  price_gas: '',
  metadataUri: '',
});

function setListingSeed(seed) {
  createForm.accountSeed = seed;
  const formEl = document.querySelector('[data-vanity-anchor]');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const priceError = ref('');
const titleError = ref('');

const accountSeedError = ref('');

const addressCopied = ref(false);
let addressCopiedTimer = null;

async function copyDerivedAddress() {
  if (!listingPreview.value.address) return;
  await copyText(listingPreview.value.address);
  markCopied('derivedAddress');
  addressCopied.value = true;
  addressCopiedTimer = setTimeout(() => { addressCopied.value = false; }, 1200);
}

const accountSeedInputClass = computed(() => {
  if (accountSeedError.value) return 'border-aa-error focus:border-aa-error-light focus:ring-aa-error/20';
  if (listingPreview.value.accountIdHash) return 'border-aa-success/50';
  return '';
});

function translatedStatus(status) {
  const map = {
    active: t('market.statusActive', 'active'),
    sold: t('market.statusSold', 'sold'),
    cancelled: t('market.statusCancelled', 'cancelled'),
    unknown: t('market.statusUnknown', 'unknown'),
  };
  return map[status] || status;
}

function validatePrice() {
  const val = createForm.price_gas.trim();
  if (!val) {
    priceError.value = '';
    return true;
  }
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) {
    priceError.value = t('market.errorPositiveNumber', 'Enter a positive number (e.g. 25 or 25.5)');
    return false;
  }
  if (num > 1000000) {
    priceError.value = t('market.errorPriceTooHigh', 'Price seems too high - enter a reasonable GAS amount');
    return false;
  }
  priceError.value = '';
  return true;
}

function validateTitle() {
  const val = createForm.title.trim();
  if (!val) {
    titleError.value = '';
    return true;
  }
  if (val.length < 3) {
    titleError.value = t('market.errorTitleTooShort', 'Title must be at least 3 characters');
    return false;
  }
  titleError.value = '';
  return true;
}

const priceInputClass = computed(() => {
  if (priceError.value) return 'border-aa-error focus:border-aa-error-light focus:ring-aa-error/20';
  if (createForm.price_gas && !priceError.value) return 'border-aa-success/50';
  return '';
});

const connectedScriptHash = computed(() => {
  try {
    return connectedAccount.value ? getScriptHashFromAddress(connectedAccount.value) : '';
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[AddressMarketView] connectedScriptHash parse failed:', e?.message);
    return '';
  }
});

const listingPreview = computed(() => {
  try {
    const accountIdHash = createForm.accountSeed ? resolveListedAccountId(createForm.accountSeed) : '';
    const address = accountIdHash
      ? deriveVirtualAddressFromListing({
          aaContractHash: RUNTIME_CONFIG.abstractAccountHash,
          accountIdHash,
        })
      : '';
    return { accountIdHash, address };
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[AddressMarketView] listingPreview derivation failed:', e?.message);
    return { accountIdHash: '', address: '' };
  }
});

const canSubmitListing = computed(() => {
  return Boolean(
    createForm.accountSeed &&
    createForm.price_gas &&
    !priceError.value &&
    !titleError.value &&
    connectedAccount.value &&
    listingPreview.value.accountIdHash
  );
});

const activeListingsCount = computed(() => listings.value.filter(l => l.status === 'active').length);

const averagePrice = computed(() => {
  const active = listings.value.filter(l => l.status === 'active' && l.price_gas);
  if (!active.length) return '0';
  const sum = active.reduce((acc, l) => acc + parseFloat(l.price_gas || 0), 0);
  return (sum / active.length).toFixed(2);
});

function statusBadgeClass(status) {
  if (status === 'active') return 'badge-green';
  if (status === 'sold') return 'badge-amber';
  if (status === 'cancelled') return 'badge-red';
  return 'badge-red';
}

function isSeller(listing) {
  return Boolean(connectedScriptHash.value && listing?.sellerScriptHash === connectedScriptHash.value);
}

function isRefundBuyer(listing) {
  return Boolean(connectedScriptHash.value && listing?.buyerScriptHash && listing.buyerScriptHash === connectedScriptHash.value);
}

function purchaseForm(id) {
  if (!purchaseDrafts[id]) {
    purchaseDrafts[id] = reactive({
      newBackupOwner: connectedAccount.value || '',
    });
  }
  if (!purchaseDrafts[id].newBackupOwner && connectedAccount.value) {
    purchaseDrafts[id].newBackupOwner = connectedAccount.value;
  }
  return purchaseDrafts[id];
}

async function refreshListings() {
  loading.value = true;
  try {
    listings.value = await listAddressListings();
    hasLoaded.value = true;
    listings.value.forEach((listing) => {
      if (!(listing.id in priceDrafts)) {
        priceDrafts[listing.id] = listing.price_gas;
      }
      purchaseForm(listing.id);
    });
    const hashes = listings.value.map((l) => l.accountIdHash).filter(Boolean);
    if (hashes.length) {
      try { listingMetadata.value = await fetchAccountMetadataBatch(hashes); } catch (err) { if (import.meta.env.DEV) console.warn('[AddressMarketView] Metadata batch fetch failed:', err?.message); }
    }
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    loading.value = false;
  }
}

async function refreshOne(listingId) {
  try {
    const next = await readAddressListing(listingId);
    listings.value = listings.value.map((item) => (item.id === String(listingId) ? next : item));
    return next;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[AddressMarketView] refreshOne failed, falling back to full refresh:', e?.message);
    await refreshListings();
    return null;
  }
}

async function submitListing() {
  if (!canSubmitListing.value) return;
  submitting.value = true;
  try {
    const result = await createAddressListing({
      accountSeed: createForm.accountSeed,
      title: createForm.title,
      price_gas: createForm.price_gas,
      metadataUri: createForm.metadataUri,
    });
    toast.success(t('market.successListingSubmitted', 'Listing submitted on-chain.') + ` Tx: ${result.txid || 'pending'}`);
    Object.assign(createForm, {
      accountSeed: '',
      title: '',
      price_gas: '',
      metadataUri: '',
    });
    await refreshListings();
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    submitting.value = false;
  }
}

async function buyListingAction(listing) {
  buyingId.value = listing.id;
  try {
    const form = purchaseForm(listing.id);
    const result = await buyAddressListing(listing.id, {
      newBackupOwner: form.newBackupOwner,
    });
    toast.success(t('market.successEscrowSettlement', 'Escrow settlement submitted.') + ` Tx: ${result.txid || 'pending'}`);
    await refreshOne(listing.id);
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    buyingId.value = '';
  }
}

async function cancelListingAction(listing) {
  cancellingId.value = listing.id;
  try {
    const result = await cancelAddressListing(listing.id);
    toast.success(t('market.successCancellation', 'Listing cancellation submitted.') + ` Tx: ${result.txid || 'pending'}`);
    await refreshOne(listing.id);
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    cancellingId.value = '';
  }
}

async function refundAction(listing) {
  refundId.value = listing.id;
  try {
    const result = await refundPendingAddressPurchase(listing.id);
    toast.success(t('market.successRefund', 'Pending payment refund submitted.') + ` Tx: ${result.txid || 'pending'}`);
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    refundId.value = '';
  }
}

async function updatePriceAction(listing) {
  priceUpdatingId.value = listing.id;
  try {
    const nextPrice = String(priceDrafts[listing.id] || '').trim();
    const result = await updateAddressListingPrice(listing.id, nextPrice);
    toast.success(t('market.successPriceUpdate', 'Listing price update submitted.') + ` Tx: ${result.txid || 'pending'}`);
    await refreshOne(listing.id);
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    priceUpdatingId.value = '';
  }
}

onMounted(() => {
  void refreshListings();
});

onUnmounted(() => {
  clearTimeout(addressCopiedTimer);
});

watch(() => createForm.accountSeed, (val) => {
  const trimmed = String(val || '').trim();
  if (!trimmed) {
    accountSeedError.value = '';
    return;
  }
  const isValidHex64 = /^[0-9a-fA-F]{64}$/.test(trimmed);
  const isValidHex40 = /^(0x)?[0-9a-fA-F]{40}$/.test(trimmed);
  if (!isValidHex64 && !isValidHex40) {
    accountSeedError.value = t('market.errorInvalidAccountSeed', 'Enter 64-char hex seed or 40-char accountId hash');
  } else {
    accountSeedError.value = '';
  }
});
</script>
