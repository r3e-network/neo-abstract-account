<template>
  <section class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.broadcastOptionsTitle', 'Broadcast Options') }}</h2>
        <p class="text-sm text-biconomy-muted">{{ t('operations.broadcastOptionsSubtitle', 'Choose how to send your transaction to the network.') }}</p>
      </div>
    </div>

    <div class="mb-5 rounded-lg border border-biconomy-border bg-biconomy-dark/40 p-4">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted mb-3">Broadcast Mode</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="mode in modes"
          :key="mode"
          class="rounded-lg border p-4 text-left transition-all duration-200"
          :class="mode === activeMode ? 'border-biconomy-orange bg-biconomy-orange/10 ring-1 ring-biconomy-orange' : 'border-biconomy-border bg-biconomy-panel hover:border-biconomy-muted'"
          @click="$emit('set-mode', mode)"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="mode === activeMode ? 'bg-biconomy-orange/20' : 'bg-slate-700'">
              <svg v-if="mode === 'client'" class="w-5 h-5" :class="mode === activeMode ? 'text-biconomy-orange' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <svg v-else class="w-5 h-5" :class="mode === activeMode ? 'text-biconomy-orange' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div class="flex-1">
              <p class="font-semibold text-sm" :class="mode === activeMode ? 'text-biconomy-orange' : 'text-white'">{{ modeLabels[mode]?.title || mode }}</p>
              <p class="text-xs text-biconomy-muted mt-1">{{ modeLabels[mode]?.desc || '' }}</p>
            </div>
            <div v-if="mode === activeMode" class="w-5 h-5 rounded-full bg-biconomy-orange flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div v-if="relayPayloadOptions.length > 0" class="mb-5 rounded-lg border border-biconomy-border bg-biconomy-dark/40 p-4">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted mb-3">Relay Payload Type</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in relayPayloadOptions"
          :key="option"
          class="rounded-lg border px-4 py-2 text-sm font-semibold transition-all"
          :class="option === activeRelayPayloadMode ? 'border-biconomy-orange/30 bg-biconomy-orange/10 text-biconomy-orange' : 'border-biconomy-border text-biconomy-muted hover:border-biconomy-muted'"
          @click="$emit('set-relay-payload-mode', option)"
        >
          {{ relayPayloadLabels[option] || option }}
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-biconomy-border bg-biconomy-dark/40 p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted">{{ t('operations.paymasterTitle', 'Morpheus Paymaster') }}</p>
            <span v-if="paymasterEnabled" class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Active
            </span>
          </div>
          <p class="mt-1 text-sm text-biconomy-muted">{{ t('operations.paymasterSubtitle', 'Get your transaction fees sponsored by Morpheus.') }}</p>
        </div>
        <button
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-biconomy-orange focus:ring-offset-2 focus:ring-offset-biconomy-dark"
          :class="paymasterEnabled ? 'bg-biconomy-orange' : 'bg-slate-600'"
          @click="$emit('set-paymaster-enabled', !paymasterEnabled)"
        >
          <span class="sr-only">{{ paymasterEnabled ? 'Disable' : 'Enable' }} paymaster</span>
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform"
            :class="paymasterEnabled ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>
      <div v-if="paymasterEnabled" class="mt-4 space-y-3">
        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted">{{ t('operations.paymasterDappId', 'DApp ID') }}</label>
          <input
            :value="paymasterDappId"
            type="text"
            class="input-field w-full bg-biconomy-panel text-sm"
            placeholder="e.g. my-dapp-name"
            @input="$emit('set-paymaster-dapp-id', $event.target.value)"
          />
        </div>
        <div class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Validated on Neo N3 Testnet</p>
          <p class="mt-1 text-xs leading-5 text-biconomy-muted">
            Policy <code class="font-mono text-emerald-300">testnet-aa</code> supports registerAccount, updateVerifier, paymaster authorization, and relay executeUserOp.
          </p>
          <router-link
            class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            :to="{ path: '/docs', query: { doc: 'paymasterValidation' } }"
          >
            View validation details
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </router-link>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <p class="text-xs text-biconomy-muted">Relay: {{ relayEndpoint || 'not configured' }}</p>
      <button class="rounded-lg bg-biconomy-orange px-4 py-2 text-sm font-semibold text-white hover:bg-biconomy-orange/90 transition-colors" @click="$emit('persist-draft')">
        {{ t('operations.createShareDraft', 'Save Draft') }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const relayPayloadLabels = computed(() => ({
  best: t('operations.bestAvailable', 'Best Available'),
  raw: t('operations.signedRawTx', 'Signed Raw Tx'),
  meta: t('operations.metaInvocation', 'Relay Invocation'),
}));

const modeLabels = computed(() => ({
  client: {
    title: t('operations.clientModeTitle', 'Local Wallet'),
    desc: t('operations.clientModeDesc', 'Sign and broadcast directly from your connected wallet'),
  },
  relay: {
    title: t('operations.relayModeTitle', 'Relay Network'),
    desc: t('operations.relayModeDesc', 'Submit via public relay endpoint for gasless transactions'),
  },
}));

defineProps({
  activeMode: { type: String, default: 'client' },
  activeRelayPayloadMode: { type: String, default: 'best' },
  modes: { type: Array, default: () => ['client', 'relay'] },
  relayPayloadOptions: { type: Array, default: () => [] },
  relayEndpoint: { type: String, default: '' },
  paymasterEnabled: { type: Boolean, default: false },
  paymasterDappId: { type: String, default: '' },
});
defineEmits(['persist-draft', 'set-mode', 'set-relay-payload-mode', 'set-paymaster-enabled', 'set-paymaster-dapp-id']);
</script>
