<template>
  <div class="relative min-h-screen overflow-hidden bg-slate-900 font-sans text-biconomy-text">
    <div class="absolute inset-0 z-0">
      <div class="absolute left-1/4 top-0 h-[480px] w-[480px] rounded-full bg-sky-500/10 blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl"></div>
    </div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section class="mb-10">
        <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-300">AA Address Market</p>
        <h1 class="mt-3 text-4xl font-extrabold text-white font-outfit md:text-5xl">Trustless escrow for AA address transfers</h1>
        <p class="mt-4 max-w-4xl text-base leading-8 text-slate-300">
          Sellers list an AA account and atomically lock it into escrow. Buyers settle in one chain transaction:
          transfer GAS to the market contract, rotate control to the new owner, and release seller payment only if the transfer succeeds.
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <router-link to="/app" class="btn-primary">Open App Workspace</router-link>
          <router-link :to="{ path: '/docs', query: { doc: 'addressMarket' } }" class="btn-secondary">Read Market Guide</router-link>
          <router-link :to="{ path: '/docs', query: { doc: 'pluginGuide' } }" class="btn-secondary">Read Hook & Plugin Guide</router-link>
        </div>
      </section>

      <section v-if="!marketConfigured" class="mb-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-amber-100">
        <h2 class="text-lg font-bold text-white">Market Contract Not Configured</h2>
        <p class="mt-3 text-sm leading-7">
          Set <code>VITE_AA_MARKET_HASH</code> for the current deployment before using the trustless escrow market.
          The UI will not fall back to local listings anymore.
        </p>
      </section>

      <section class="mb-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div class="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 backdrop-blur-xl">
          <h2 class="text-lg font-bold text-white">Create Escrow Listing</h2>
          <p class="mt-2 text-sm leading-7 text-slate-400">
            Listing creation is a real on-chain action. The seller must be the current backup owner, and the account is frozen in escrow immediately after the listing transaction succeeds.
          </p>

          <div class="mt-6 space-y-4">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Account Seed / AccountId Hash</span>
              <input v-model="createForm.accountSeed" type="text" class="input-field w-full bg-biconomy-dark font-mono text-sm" :class="accountSeedInputClass" placeholder="64-char hex, 40-char hash, or Neo address" />
              <p v-if="accountSeedError" class="mt-1 text-xs text-rose-400">{{ accountSeedError }}</p>
              <p v-else-if="listingPreview.address" class="mt-1 text-xs text-emerald-400/70">Valid account detected</p>
            </label>

            <div class="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4">
              <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Derived AA Address</p>
              <p class="mt-2 break-all font-mono text-sm text-slate-200">{{ listingPreview.address || 'Waiting for account seed / accountId hash' }}</p>
              <p v-if="listingPreview.accountIdHash" class="mt-2 break-all font-mono text-xs text-slate-500">accountId: 0x{{ listingPreview.accountIdHash }}</p>
            </div>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Listing Title</span>
              <input v-model="createForm.title" type="text" maxlength="80" class="input-field w-full bg-biconomy-dark text-sm" placeholder="Short and descriptive" />
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Price (GAS)</span>
              <input v-model="createForm.price_gas" type="text" class="input-field w-full bg-biconomy-dark font-mono text-sm" :class="priceInputClass" placeholder="e.g. 25.5" @input="validatePrice" />
              <p v-if="priceError" class="mt-1 text-xs text-rose-400">{{ priceError }}</p>
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Metadata / Docs URL</span>
              <input v-model="createForm.metadataUri" type="text" maxlength="240" class="input-field w-full bg-biconomy-dark text-sm" placeholder="Optional URL with listing context" />
            </label>

            <button type="button" class="btn-primary w-full" :disabled="submitting || !canSubmitListing || !marketConfigured" @click="submitListing">
              {{ submitting ? 'Submitting Listing...' : 'Create Trustless Listing' }}
            </button>

            <p class="text-xs leading-6 text-slate-500">
              Seller wallet:
              <span class="font-mono text-slate-300">{{ connectedAccount || 'connect a Neo wallet' }}</span>
            </p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-bold text-white">On-Chain Listings</h2>
              <p class="mt-1 text-sm text-slate-400">Listings, escrow status, and settlement are read directly from the market contract and AA core contract.</p>
            </div>
            <button type="button" class="btn-secondary" :disabled="loading || !marketConfigured" @click="refreshListings">
              {{ loading ? 'Refreshing...' : 'Refresh Listings' }}
            </button>
          </div>

          <div v-if="marketConfigured && listings.length === 0" class="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 p-12 text-center">
            <div class="mx-auto w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <p class="text-slate-300 font-medium mb-2">No listings found on-chain yet</p>
            <p class="text-sm text-slate-500 max-w-md mx-auto mb-6">Be the first to list your Abstract Account address for sale. Listings are secured by trustless on-chain escrow.</p>
            <router-link to="/app" class="inline-flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors">
              Create an AA account first <span aria-hidden="true">→</span>
            </router-link>
          </div>

          <div v-else class="space-y-4">
            <article v-for="listing in listings" :key="listing.id" class="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 backdrop-blur-xl">
              <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-xl font-bold text-white">{{ listing.title || `Listing #${listing.id}` }}</h3>
                    <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest" :class="statusBadgeClass(listing.status)">
                      {{ listing.status }}
                    </span>
                    <span v-if="listing.escrow_active" class="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                      escrow locked
                    </span>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">AA Address</p>
                      <p class="mt-1 break-all font-mono text-sm text-slate-200">{{ listing.account_address }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">AA Contract</p>
                      <p class="mt-1 break-all font-mono text-sm text-slate-300">0x{{ listing.aaContractHash }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">accountId</p>
                      <p class="mt-1 break-all font-mono text-sm text-slate-300">0x{{ listing.accountIdHash }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Seller</p>
                      <p class="mt-1 break-all font-mono text-sm text-slate-300">{{ listing.seller_address || 'unknown' }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Verifier</p>
                      <p class="mt-1 break-all text-sm text-slate-300">{{ listing.verifier_profile }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Hook</p>
                      <p class="mt-1 break-all text-sm text-slate-300">{{ listing.hook_profile }}</p>
                    </div>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Backup Owner</p>
                      <p class="mt-1 break-all font-mono text-sm text-slate-300">{{ listing.backup_owner || 'unset' }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Metadata</p>
                      <a v-if="listing.metadataUri" :href="listing.metadataUri" target="_blank" rel="noopener noreferrer" class="mt-1 break-all text-sm text-sky-300 underline decoration-sky-500/30 underline-offset-4">
                        {{ listing.metadataUri }}
                      </a>
                      <p v-else class="mt-1 text-sm text-slate-500">No metadata URL</p>
                    </div>
                  </div>
                </div>

                <div class="shrink-0 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 xl:w-[340px]">
                  <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Price</p>
                  <p class="mt-2 text-3xl font-extrabold text-white font-outfit">{{ listing.price_gas }} <span class="text-sm font-semibold text-slate-400">GAS</span></p>

                  <div class="mt-5 rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4">
                    <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Buyer Transfer Plan</p>
                    <p class="mt-2 text-sm leading-7 text-slate-400">
                      Settlement transfers only the AA shell. Existing verifier and hook bindings are cleared during settlement, so old permissions stop applying. Reconfigure fresh plugins in the app workspace afterward.
                    </p>

                    <div class="mt-4 space-y-3">
                      <label class="block">
                        <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">New Backup Owner</span>
                        <input v-model="purchaseForm(listing.id).newBackupOwner" type="text" class="input-field w-full bg-biconomy-dark font-mono text-sm" :placeholder="connectedAccount || 'N...'" />
                      </label>
                    </div>
                  </div>

                  <div class="mt-4 flex flex-col gap-2">
                    <button type="button" class="btn-primary w-full" :disabled="buyingId === listing.id || listing.status !== 'active' || !marketConfigured || !connectedAccount" @click="buyListingAction(listing)">
                      {{ buyingId === listing.id ? 'Settling...' : 'Buy With Escrow' }}
                    </button>
                    <button v-if="isSeller(listing)" type="button" class="btn-secondary w-full" :disabled="cancellingId === listing.id || listing.status !== 'active'" @click="cancelListingAction(listing)">
                      {{ cancellingId === listing.id ? 'Cancelling...' : 'Cancel Listing' }}
                    </button>
                    <button type="button" class="btn-secondary w-full" :disabled="refundId === listing.id || !connectedAccount" @click="refundAction(listing)">
                      {{ refundId === listing.id ? 'Refunding...' : 'Refund Pending Payment' }}
                    </button>
                  </div>

                  <div v-if="isSeller(listing) && listing.status === 'active'" class="mt-4 rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4">
                    <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Update Price</p>
                    <div class="mt-3 flex gap-2">
                      <input v-model="priceDrafts[listing.id]" type="text" class="input-field flex-1 bg-biconomy-dark font-mono text-sm" :placeholder="listing.price_gas" />
                      <button type="button" class="btn-secondary" :disabled="priceUpdatingId === listing.id" @click="updatePriceAction(listing)">
                        {{ priceUpdatingId === listing.id ? 'Updating...' : 'Update' }}
                      </button>
                    </div>
                  </div>
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedAccount } from '@/utils/wallet';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig.js';
import { getScriptHashFromAddress } from '@/utils/neo.js';
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

const toast = useToast();
const marketConfigured = isAddressMarketConfigured();
const listings = ref([]);
const loading = ref(false);
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

const priceError = ref('');

const accountSeedError = ref('');

const accountSeedInputClass = computed(() => {
  if (accountSeedError.value) return 'border-rose-500 focus:border-rose-400 focus:ring-rose-400/20';
  if (listingPreview.value.accountIdHash) return 'border-emerald-500/50';
  return '';
});

function validatePrice() {
  const val = createForm.price_gas.trim();
  if (!val) {
    priceError.value = '';
    return true;
  }
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) {
    priceError.value = 'Enter a positive number (e.g. 25 or 25.5)';
    return false;
  }
  if (num > 1000000) {
    priceError.value = 'Price seems too high - enter a reasonable GAS amount';
    return false;
  }
  priceError.value = '';
  return true;
}

const priceInputClass = computed(() => {
  if (priceError.value) return 'border-rose-500 focus:border-rose-400 focus:ring-rose-400/20';
  if (createForm.price_gas && !priceError.value) return 'border-emerald-500/50';
  return '';
});

const connectedScriptHash = computed(() => {
  try {
    return connectedAccount.value ? getScriptHashFromAddress(connectedAccount.value) : '';
  } catch {
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
  } catch {
    return { accountIdHash: '', address: '' };
  }
});

const canSubmitListing = computed(() => {
  return Boolean(
    createForm.accountSeed && 
    createForm.price_gas && 
    !priceError.value &&
    connectedAccount.value && 
    listingPreview.value.accountIdHash
  );
});

function statusBadgeClass(status) {
  if (status === 'active') return 'border-emerald-400/40 text-emerald-300';
  if (status === 'sold') return 'border-sky-400/40 text-sky-300';
  if (status === 'cancelled') return 'border-slate-600 text-slate-400';
  return 'border-slate-600 text-slate-400';
}

function isSeller(listing) {
  return Boolean(connectedScriptHash.value && listing?.sellerScriptHash === connectedScriptHash.value);
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
    listings.value.forEach((listing) => {
      if (!(listing.id in priceDrafts)) {
        priceDrafts[listing.id] = listing.price_gas;
      }
      purchaseForm(listing.id);
    });
  } catch (error) {
    toast.error(`Failed to load listings: ${error?.message || error}`);
  } finally {
    loading.value = false;
  }
}

async function refreshOne(listingId) {
  try {
    const next = await readAddressListing(listingId);
    listings.value = listings.value.map((item) => (item.id === String(listingId) ? next : item));
    return next;
  } catch {
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
    toast.success(`Listing submitted on-chain. Tx: ${result.txid || 'pending'}`);
    Object.assign(createForm, {
      accountSeed: '',
      title: '',
      price_gas: '',
      metadataUri: '',
    });
    await refreshListings();
  } catch (error) {
    toast.error(`Failed to create listing: ${error?.message || error}`);
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
    toast.success(`Escrow settlement submitted. Tx: ${result.txid || 'pending'}`);
    await refreshOne(listing.id);
  } catch (error) {
    toast.error(`Failed to buy listing: ${error?.message || error}`);
  } finally {
    buyingId.value = '';
  }
}

async function cancelListingAction(listing) {
  cancellingId.value = listing.id;
  try {
    const result = await cancelAddressListing(listing.id);
    toast.success(`Listing cancellation submitted. Tx: ${result.txid || 'pending'}`);
    await refreshOne(listing.id);
  } catch (error) {
    toast.error(`Failed to cancel listing: ${error?.message || error}`);
  } finally {
    cancellingId.value = '';
  }
}

async function refundAction(listing) {
  refundId.value = listing.id;
  try {
    const result = await refundPendingAddressPurchase(listing.id);
    toast.success(`Pending payment refund submitted. Tx: ${result.txid || 'pending'}`);
  } catch (error) {
    toast.error(`Failed to refund pending payment: ${error?.message || error}`);
  } finally {
    refundId.value = '';
  }
}

async function updatePriceAction(listing) {
  priceUpdatingId.value = listing.id;
  try {
    const nextPrice = String(priceDrafts[listing.id] || '').trim();
    const result = await updateAddressListingPrice(listing.id, nextPrice);
    toast.success(`Listing price update submitted. Tx: ${result.txid || 'pending'}`);
    await refreshOne(listing.id);
  } catch (error) {
    toast.error(`Failed to update price: ${error?.message || error}`);
  } finally {
    priceUpdatingId.value = '';
  }
}

onMounted(() => {
  void refreshListings();
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
    accountSeedError.value = 'Enter 64-char hex seed or 40-char accountId hash';
  } else {
    accountSeedError.value = '';
  }
});
</script>
