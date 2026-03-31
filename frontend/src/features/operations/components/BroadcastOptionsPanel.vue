<template>
  <section class="glass-panel p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-white">{{ t('operations.broadcastOptionsTitle', 'Broadcast Options') }}</h2>
        <p class="text-sm text-aa-muted">{{ t('operations.broadcastOptionsSubtitle', 'Choose how to send your transaction to the network.') }}</p>
      </div>
    </div>

    <div class="mb-5 rounded-lg border border-aa-border bg-aa-dark/40 p-4">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-aa-muted mb-3">{{ t('operations.broadcastModeTitle', 'Broadcast Mode') }}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="mode in modes"
          :key="mode"
          :aria-label="modeLabels[mode]?.title || mode"
          class="rounded-lg border p-4 text-left transition-all duration-200"
          :class="mode === activeMode ? 'border-aa-orange bg-aa-orange/10 ring-1 ring-aa-orange' : 'border-aa-border bg-aa-panel hover:border-aa-muted'"
          :aria-pressed="mode === activeMode"
          @click="$emit('set-mode', mode)"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="mode === activeMode ? 'bg-aa-orange/20' : 'bg-aa-dark'">
              <svg v-if="mode === 'client'" aria-hidden="true" class="w-5 h-5" :class="mode === activeMode ? 'text-aa-orange' : 'text-aa-muted'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <svg v-else aria-hidden="true" class="w-5 h-5" :class="mode === activeMode ? 'text-aa-orange' : 'text-aa-muted'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div class="flex-1">
              <p class="font-semibold text-sm" :class="mode === activeMode ? 'text-aa-orange' : 'text-aa-text'">{{ modeLabels[mode]?.title || mode }}</p>
              <p class="text-xs text-aa-muted mt-1">{{ modeLabels[mode]?.desc || '' }}</p>
            </div>
            <div v-if="mode === activeMode" class="w-5 h-5 rounded-full bg-aa-orange flex items-center justify-center">
              <svg aria-hidden="true" class="w-3 h-3 text-aa-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div v-if="relayPayloadOptions.length > 0" class="mb-5 rounded-lg border border-aa-border bg-aa-dark/40 p-4">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-aa-muted mb-3">{{ t('operations.relayPayloadType', 'Relay Payload Type') }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in relayPayloadOptions"
          :key="option"
          :aria-label="relayPayloadLabels[option] || option"
          class="rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200"
          :class="option === activeRelayPayloadMode ? 'border-aa-orange/30 bg-aa-orange/10 text-aa-orange' : 'border-aa-border text-aa-muted hover:border-aa-muted'"
          @click="$emit('set-relay-payload-mode', option)"
        >
          {{ relayPayloadLabels[option] || option }}
        </button>
      </div>
    </div>
    <div v-else class="empty-state mb-5 bg-aa-dark/20 p-4">
      <svg aria-hidden="true" class="w-8 h-8 mx-auto mb-2 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
      <p class="text-xs text-aa-muted">{{ t('operations.relayPayloadEmpty', 'Relay payload options will appear once an operation is staged and signed.') }}</p>
    </div>

    <div class="rounded-lg border border-aa-border bg-aa-dark/40 p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-aa-muted">{{ t('operations.paymasterTitle', 'Morpheus Paymaster') }}</p>
            <span v-if="paymasterEnabled" class="badge-green">
              <span class="w-1.5 h-1.5 rounded-full bg-aa-success animate-pulse"></span>
              {{ t('operations.paymasterActive', 'Active') }}
            </span>
          </div>
          <p class="mt-1 text-sm text-aa-muted">{{ t('operations.paymasterSubtitle', 'Get your transaction fees sponsored by Morpheus.') }}</p>
        </div>
        <button
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-aa-orange focus:ring-offset-2 focus:ring-offset-aa-dark"
          :class="paymasterEnabled ? 'bg-aa-orange' : 'bg-aa-dark'"
          @click="$emit('set-paymaster-enabled', !paymasterEnabled)"
        >
          <span class="sr-only">{{ paymasterEnabled ? t('operations.disablePaymasterSr', 'Disable paymaster') : t('operations.enablePaymasterSr', 'Enable paymaster') }}</span>
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
            :class="paymasterEnabled ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>
      <div v-if="paymasterEnabled" class="mt-4 space-y-3">
        <div>
          <label for="paymaster-dapp-id-input" class="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-aa-muted">{{ t('operations.paymasterDappId', 'DApp ID') }}</label>
          <input
            id="paymaster-dapp-id-input"
            :value="paymasterDappId"
            type="text"
            maxlength="64"
            class="input-field w-full bg-aa-panel text-sm"
            :class="paymasterDappId && !isValidDappId(paymasterDappId) ? 'border-aa-error focus:border-aa-error-light focus:ring-aa-error' : ''"
            :placeholder="t('operations.paymasterDappIdPlaceholder', 'e.g. my-dapp-name')"
            @input="$emit('set-paymaster-dapp-id', $event.target.value.trim())"
          />
          <p v-if="paymasterDappId && !isValidDappId(paymasterDappId)" role="alert" class="mt-1 text-xs text-aa-error">{{ t('operations.invalidDappId', 'DApp ID should be lowercase alphanumeric with dashes only') }}</p>
        </div>
        <div class="rounded-lg border border-aa-success/20 bg-aa-success/5 p-3">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-aa-success">{{ t('operations.validatedOnTestnet', 'Validated on Neo N3 Testnet') }}</p>
          <p class="mt-1 text-xs leading-5 text-aa-muted">{{ t('operations.policyTestnetAaDescPrefix', 'Policy') }} <code class="font-mono text-neo-300">testnet-aa</code> {{ t('operations.policyTestnetAaDescSuffix', 'supports registerAccount, updateVerifier, paymaster authorization, and relay executeUserOp.') }}</p>
          <span class="sr-only">{{ t('operations.srOpenPaymasterValidation', 'Open Paymaster Live Validation') }}</span>
          <router-link
            class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-aa-success hover:text-aa-success-light transition-colors duration-200"
            :to="{ path: '/docs', query: { doc: 'paymasterValidation' } }"
          >
            {{ t('operations.viewValidationDetails', 'View validation details') }}
            <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </router-link>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <p class="text-xs text-aa-muted">{{ relayEndpoint ? t('operations.relayEndpointStatus', 'Relay: {endpoint}').replace('{endpoint}', relayEndpoint) : t('operations.relayNotConfigured', 'Relay: not configured') }}</p>
      <button class="btn-primary" :class="{ 'btn-loading': isPersisting }" :disabled="isPersisting" :aria-label="t('operations.ariaSaveDraft', 'Save draft')" @click="$emit('persist-draft')">
        {{ isPersisting ? t('operations.savingDraft', 'Saving…') : t('operations.createShareDraft', 'Save Draft') }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();

function isValidDappId(value) {
  return /^[a-z0-9]([a-z0-9\-]{0,62}[a-z0-9])?$/.test(String(value || '').trim());
}

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
  isPersisting: { type: Boolean, default: false },
});
defineEmits(['persist-draft', 'set-mode', 'set-relay-payload-mode', 'set-paymaster-enabled', 'set-paymaster-dapp-id']);
</script>
