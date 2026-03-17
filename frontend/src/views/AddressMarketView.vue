<template>
  <div class="relative min-h-screen bg-slate-900 overflow-hidden font-sans text-biconomy-text">
    <div class="absolute inset-0 z-0">
      <div class="absolute top-0 left-1/4 h-[480px] w-[480px] rounded-full bg-sky-500/10 blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl"></div>
    </div>
    <div class="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section class="mb-10">
        <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-sky-300">AA Address Market</p>
        <h1 class="mt-3 text-4xl font-extrabold text-white font-outfit md:text-5xl">List, price, and acquire high-signal AA addresses</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          Publish sale listings for existing Abstract Account addresses, describe the verifier and hook posture attached to the account, and record buyer intent in one place.
          Final ownership transfer still completes in the app workspace through the account governance flow.
        </p>
      </section>

      <section class="mb-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div class="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 backdrop-blur-xl">
          <h2 class="text-lg font-bold text-white">Create Listing</h2>
          <p class="mt-2 text-sm leading-7 text-slate-400">Use this to publish an address, price, and configuration summary. Connect a wallet so buyers can verify who listed the address.</p>
          <div class="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-7 text-amber-100">
            This market is currently a discovery and negotiation surface. The final control transfer still happens in the app workspace by rotating verifier, hook, and backup owner bindings after the commercial agreement is reached.
          </div>
          <div class="mt-6 space-y-4">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">AA Address</span>
              <input v-model="form.account_address" type="text" class="input-field w-full bg-biconomy-dark font-mono text-sm" placeholder="N... or 0x..." />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Listing Title</span>
              <input v-model="form.title" type="text" class="input-field w-full bg-biconomy-dark text-sm" placeholder="Short, descriptive listing name" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Price (GAS)</span>
              <input v-model="form.price_gas" type="text" class="input-field w-full bg-biconomy-dark font-mono text-sm" placeholder="25" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Verifier Profile</span>
              <input v-model="form.verifier_profile" type="text" class="input-field w-full bg-biconomy-dark text-sm" placeholder="Web3Auth + backup owner" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Hook Profile</span>
              <input v-model="form.hook_profile" type="text" class="input-field w-full bg-biconomy-dark text-sm" placeholder="Whitelist + daily limit" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">Notes</span>
              <textarea v-model="form.notes" class="input-field min-h-28 w-full bg-biconomy-dark text-sm" placeholder="Why the address is valuable, what transfer steps buyer should expect, any plugin caveats..."></textarea>
            </label>
            <button type="button" class="btn-primary w-full" :disabled="submitting || !canSubmit" @click="submitListing">
              {{ submitting ? 'Publishing...' : 'Publish Listing' }}
            </button>
            <p class="text-xs leading-6 text-slate-500">
              Seller of record:
              <span class="font-mono text-slate-300">{{ connectedAccount || 'connect wallet to publish on-chain identity context' }}</span>
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <router-link to="/app" class="btn-secondary">
                Open App Workspace
              </router-link>
              <router-link :to="{ path: '/docs', query: { doc: 'addressMarket' } }" class="btn-secondary">
                Market Guide
              </router-link>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-bold text-white">Live Listings</h2>
              <p class="mt-1 text-sm text-slate-400">Listings use Supabase when available and fall back to local browser storage when no shared backend is configured.</p>
            </div>
            <button type="button" class="btn-secondary" :disabled="loading" @click="refreshListings">
              {{ loading ? 'Refreshing...' : 'Refresh Listings' }}
            </button>
          </div>

          <div v-if="listings.length === 0" class="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 p-10 text-center text-slate-400">
            No listings yet. Publish the first AA address offer from this workspace.
          </div>

          <div v-else class="space-y-4">
            <article v-for="listing in listings" :key="listing.id" class="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 backdrop-blur-xl">
              <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-xl font-bold text-white">{{ listing.title || 'Untitled Listing' }}</h3>
                    <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
                      :class="listing.status === 'active' ? 'border-emerald-400/40 text-emerald-300' : listing.status === 'reserved' ? 'border-sky-400/40 text-sky-300' : 'border-slate-600 text-slate-400'">
                      {{ listing.status }}
                    </span>
                  </div>
                  <p class="mt-2 break-all font-mono text-sm text-slate-300">{{ listing.account_address }}</p>
                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Verifier</p>
                      <p class="mt-1 text-sm text-slate-300">{{ listing.verifier_profile || 'Not specified' }}</p>
                    </div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Hook</p>
                      <p class="mt-1 text-sm text-slate-300">{{ listing.hook_profile || 'Not specified' }}</p>
                    </div>
                  </div>
                  <p class="mt-4 text-sm leading-7 text-slate-400">{{ listing.notes || 'No extra listing notes provided.' }}</p>
                </div>

                <div class="shrink-0 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 md:w-64">
                  <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Price</p>
                  <p class="mt-2 text-3xl font-extrabold text-white font-outfit">{{ listing.price_gas || '—' }} <span class="text-sm font-semibold text-slate-400">GAS</span></p>
                  <p class="mt-3 text-xs text-slate-500">Seller: <span class="font-mono text-slate-300">{{ listing.seller_address || 'unknown' }}</span></p>
                  <p v-if="listing.buyer_address" class="mt-1 text-xs text-slate-500">Buyer: <span class="font-mono text-slate-300">{{ listing.buyer_address }}</span></p>
                  <div class="mt-4 flex flex-col gap-2">
                    <button type="button" class="btn-primary w-full" :disabled="listing.status !== 'active' || !connectedAccount" @click="buyListingAction(listing)">
                      Start Purchase
                    </button>
                    <router-link to="/app" class="btn-secondary w-full text-center">
                      Open In App
                    </router-link>
                    <button type="button" class="btn-secondary w-full" :disabled="listing.status !== 'active' || listing.seller_address !== connectedAccount" @click="cancelListingAction(listing)">
                      Cancel Listing
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-3">
        <div class="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 backdrop-blur-xl">
          <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-slate-400">Seller Checklist</p>
          <ul class="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>Document the active verifier and hook posture.</li>
            <li>State whether the buyer must rotate the verifier immediately.</li>
            <li>Disclose any backup owner or escape-path dependency.</li>
          </ul>
        </div>
        <div class="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 backdrop-blur-xl">
          <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-slate-400">Buyer Checklist</p>
          <ul class="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>Inspect the verifier profile before paying anything.</li>
            <li>Review hook restrictions and asset limits.</li>
            <li>Plan the post-purchase rotation sequence in the app workspace.</li>
          </ul>
        </div>
        <div class="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 backdrop-blur-xl">
          <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-slate-400">Current Mode</p>
          <p class="mt-4 text-sm leading-7 text-slate-300">
            This release optimizes listing quality, buyer discovery, and governance handoff planning. A trustless escrowed address marketplace is a separate product track and is not implied by the current UI.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { connectedAccount } from '@/utils/wallet';
import { buyAddressListing, cancelAddressListing, createAddressListing, listAddressListings } from '@/services/addressMarketService.js';

const toast = useToast();
const listings = ref([]);
const loading = ref(false);
const submitting = ref(false);
const form = reactive({
  account_address: '',
  title: '',
  price_gas: '',
  verifier_profile: '',
  hook_profile: '',
  notes: '',
  network: 'neo-n3',
});

const canSubmit = computed(() => Boolean(form.account_address && form.price_gas && connectedAccount.value));

async function refreshListings() {
  loading.value = true;
  try {
    listings.value = await listAddressListings();
  } catch (error) {
    toast.error(`Failed to load listings: ${error?.message || error}`);
  } finally {
    loading.value = false;
  }
}

async function submitListing() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const next = await createAddressListing({
      ...form,
      seller_address: connectedAccount.value,
      status: 'active',
    });
    listings.value = [next, ...listings.value];
    Object.assign(form, {
      account_address: '',
      title: '',
      price_gas: '',
      verifier_profile: '',
      hook_profile: '',
      notes: '',
      network: 'neo-n3',
    });
    toast.success('AA address listing published.');
  } catch (error) {
    toast.error(`Failed to publish listing: ${error?.message || error}`);
  } finally {
    submitting.value = false;
  }
}

async function buyListingAction(listing) {
  try {
    const next = await buyAddressListing(listing.id, connectedAccount.value);
    listings.value = listings.value.map((item) => item.id === next.id ? next : item);
    toast.success('Buyer reserved the listing. Final settlement and control transfer now complete in the app workspace.');
  } catch (error) {
    toast.error(`Failed to buy listing: ${error?.message || error}`);
  }
}

async function cancelListingAction(listing) {
  try {
    const next = await cancelAddressListing(listing.id);
    listings.value = listings.value.map((item) => item.id === next.id ? next : item);
    toast.info('Listing cancelled.');
  } catch (error) {
    toast.error(`Failed to cancel listing: ${error?.message || error}`);
  }
}

onMounted(() => {
  void refreshListings();
});
</script>
