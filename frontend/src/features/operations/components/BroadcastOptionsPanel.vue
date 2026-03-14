<template>
  <section class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.broadcastOptionsTitle', 'Broadcast Options') }}</h2>
        <p class="text-sm text-biconomy-muted">{{ t('operations.broadcastOptionsSubtitle', 'Choose local wallet broadcast or relay submission.') }}</p>
      </div>
      <button class="rounded-lg bg-biconomy-dark px-4 py-2 text-sm font-semibold text-white" @click="$emit('persist-draft')">{{ t('operations.createShareDraft', 'Create Share Draft') }}</button>
    </div>
    <div class="flex gap-3">
      <button
        v-for="mode in modes"
        :key="mode"
        class="rounded-lg border px-4 py-2 text-sm font-semibold"
        :class="mode === activeMode ? 'border-biconomy-orange bg-biconomy-orange text-biconomy-orange' : 'border-biconomy-border text-biconomy-muted'"
        @click="$emit('set-mode', mode)"
      >
        {{ modeLabels[mode] || mode }}
      </button>
    </div>

    <div v-if="relayPayloadOptions.length > 0" class="mt-4">
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted">{{ t('operations.relayPayloadLabel', 'Relay Payload') }}</p>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="option in relayPayloadOptions"
          :key="option"
          class="rounded-lg border px-4 py-2 text-sm font-semibold"
          :class="option === activeRelayPayloadMode ? 'border-biconomy-orange/30 bg-biconomy-orange/10 text-biconomy-orange' : 'border-biconomy-border text-biconomy-muted'"
          @click="$emit('set-relay-payload-mode', option)"
        >
          {{ relayPayloadLabels[option] || option }}
        </button>
      </div>
    </div>

    <div class="mt-5 rounded-lg border border-biconomy-border bg-biconomy-dark/40 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted">{{ t('operations.paymasterTitle', 'Paymaster') }}</p>
          <p class="mt-1 text-sm text-biconomy-muted">{{ t('operations.paymasterSubtitle', 'Request Morpheus sponsorship before relay submission.') }}</p>
        </div>
        <button
          class="rounded-lg border px-3 py-2 text-sm font-semibold"
          :class="paymasterEnabled ? 'border-biconomy-orange/30 bg-biconomy-orange/10 text-biconomy-orange' : 'border-biconomy-border text-biconomy-muted'"
          @click="$emit('set-paymaster-enabled', !paymasterEnabled)"
        >
          {{ paymasterEnabled ? t('operations.paymasterOn', 'Enabled') : t('operations.paymasterOff', 'Disabled') }}
        </button>
      </div>
      <div class="mt-3">
        <label class="mb-1 block text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted">{{ t('operations.paymasterDappId', 'DApp ID') }}</label>
        <input
          :value="paymasterDappId"
          type="text"
          class="input-field w-full bg-biconomy-dark text-sm"
          :placeholder="t('operations.paymasterDappPlaceholder', 'demo-dapp')"
          @input="$emit('set-paymaster-dapp-id', $event.target.value)"
        />
      </div>
      <div class="mt-3 rounded-lg border border-biconomy-border/60 bg-biconomy-dark/60 p-3">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-biconomy-orange">{{ t('operations.paymasterValidatedLabel', 'Validated Live On Neo N3 Testnet') }}</p>
        <p class="mt-1 text-xs leading-6 text-biconomy-muted">
          {{ t('operations.paymasterValidatedBody', 'Policy testnet-aa has passed full live validation for registerAccount, updateVerifier, paymaster authorization, and relay-backed executeUserOp submission. See the Paymaster Live Validation docs entry for txids and attestation hashes.') }}
        </p>
      </div>
    </div>

    <p class="mt-4 text-xs text-biconomy-muted">{{ t('operations.relayEndpointLabel', 'Relay endpoint:') }} {{ relayEndpoint || t('operations.notConfigured', 'not configured') }}</p>
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
  client: t('operations.clientMode', 'client'),
  relay: t('operations.relayMode', 'relay'),
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
