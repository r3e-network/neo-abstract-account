<template>
  <div class="relative min-h-screen bg-aa-dark overflow-hidden font-sans text-aa-text">
    <div class="absolute inset-0 z-0">
      <div class="absolute top-12 right-[12%] h-72 w-72 rounded-full bg-aa-info/10 blur-3xl"></div>
      <div class="absolute bottom-16 left-[10%] h-80 w-80 rounded-full bg-aa-orange/10 blur-3xl"></div>
      <div class="absolute inset-0 bg-mesh opacity-60"></div>
    </div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="mb-2 text-xs font-bold uppercase tracking-widest text-aa-info">
            {{ t('identity.pageEyebrow', 'Identity Control Plane') }}
          </p>
          <h1 class="text-3xl font-extrabold tracking-tight text-white font-outfit md:text-4xl">
            {{ t('identity.pageTitle', 'Web3Auth / NeoDID Workspace') }}
          </h1>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-aa-muted md:text-base">
            {{ t('identity.pageSubtitle', 'Keep Web3 identity login, NeoDID binding, recovery, and private-session controls in one isolated workspace. The main AA workspace stays lighter and only links here when you need identity actions.') }}
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <router-link class="btn-secondary" :to="workspaceLink">
            {{ t('identity.openWorkspace', 'Open AA Workspace') }}
          </router-link>
          <router-link class="btn-primary" to="/docs">
            {{ t('identity.readDocs', 'Read Docs') }}
          </router-link>
        </div>
      </div>

      <div class="mb-6 grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-aa-border bg-aa-panel/50 p-5 backdrop-blur-md">
          <p class="text-xs font-bold uppercase tracking-widest text-aa-muted">
            {{ t('identity.connectedWallet', 'Connected Neo Wallet') }}
          </p>
          <p class="mt-2 break-all text-sm font-semibold text-aa-text">
            {{ walletLabel }}
          </p>
        </div>
        <div class="rounded-2xl border border-aa-border bg-aa-panel/50 p-5 backdrop-blur-md">
          <p class="text-xs font-bold uppercase tracking-widest text-aa-muted">
            {{ t('identity.boundAccount', 'Bound Account Context') }}
          </p>
          <p class="mt-2 break-all text-sm font-semibold text-aa-text">
            {{ accountContextLabel }}
          </p>
        </div>
        <div class="rounded-2xl border border-aa-border bg-aa-panel/50 p-5 backdrop-blur-md">
          <p class="text-xs font-bold uppercase tracking-widest text-aa-muted">
            {{ t('identity.aaContract', 'AA Contract') }}
          </p>
          <p class="mt-2 break-all text-sm font-semibold text-aa-text">
            {{ aaContractHash || t('identity.unconfigured', 'unconfigured') }}
          </p>
        </div>
      </div>

      <DidIdentityPanel
        :aa-contract-hash="aaContractHash"
        :account-address-script-hash="accountAddressScriptHash"
        :account-id-prefill="accountIdPrefill"
        :neo-wallet-address="neoWalletAddress"
        :recovery-verifier-prefill="recoveryVerifierPrefill"
        :recovery-new-owner-prefill="recoveryNewOwnerPrefill"
        :recovery-expiry-prefill="recoveryExpiryPrefill"
        :auto-preview-recovery="autoPreviewRecovery"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@/i18n';
import DidIdentityPanel from '@/features/operations/components/DidIdentityPanel.vue';
import { getAbstractAccountHash, walletService } from '@/services/walletService.js';
import { getScriptHashFromAddress } from '@/utils/neo.js';

const route = useRoute();
const { t } = useI18n();

const aaContractHash = getAbstractAccountHash();
const accountIdPrefill = computed(() => String(route.query.accountId || '').trim());
const accountAddressScriptHash = computed(() => {
  const raw = String(route.query.account || '').trim();
  if (!raw) return '';
  if (/^[Nn]/.test(raw)) {
    try {
      return `0x${getScriptHashFromAddress(raw)}`;
    } catch {
      return raw;
    }
  }
  return raw;
});
const recoveryVerifierPrefill = computed(() => String(route.query.recoveryVerifier || '').trim());
const recoveryNewOwnerPrefill = computed(() => String(route.query.recoveryNewOwner || '').trim());
const recoveryExpiryPrefill = computed(() => String(route.query.recoveryExpiryMinutes || '').trim());
const autoPreviewRecovery = computed(() => {
  const raw = String(route.query.autoPreviewRecovery || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
});
const neoWalletAddress = computed(() => walletService.address || '');
const walletLabel = computed(() => neoWalletAddress.value || t('identity.walletNotConnected', 'not connected'));
const accountContextLabel = computed(() => accountAddressScriptHash.value || accountIdPrefill.value || t('identity.noAccountContext', 'no account bound'));
const workspaceLink = computed(() =>
  accountAddressScriptHash.value
    ? { path: '/app', query: { account: accountAddressScriptHash.value } }
    : '/app'
);
</script>
