<template>
  <section class="rounded-lg border border-ata-border bg-ata-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.broadcastOptionsTitle', 'Broadcast Options') }}</h2>
        <p class="text-sm text-slate-400">{{ t('operations.broadcastOptionsSubtitle', 'Choose local wallet broadcast or relay submission.') }}</p>
      </div>
      <button class="rounded-lg bg-ata-dark px-4 py-2 text-sm font-semibold text-white" @click="$emit('persist-draft')">{{ t('operations.createShareDraft', 'Create Share Draft') }}</button>
    </div>
    <div class="flex gap-3">
      <button
        v-for="mode in modes"
        :key="mode"
        class="rounded-lg border px-4 py-2 text-sm font-semibold"
        :class="mode === activeMode ? 'border-ata-green bg-ata-green text-ata-green' : 'border-ata-border text-slate-400'"
        @click="$emit('set-mode', mode)"
      >
        {{ modeLabels[mode] || mode }}
      </button>
    </div>

    <div v-if="relayPayloadOptions.length > 0" class="mt-4">
      <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{{ t('operations.relayPayloadLabel', 'Relay Payload') }}</p>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="option in relayPayloadOptions"
          :key="option"
          class="rounded-lg border px-4 py-2 text-sm font-semibold"
          :class="option === activeRelayPayloadMode ? 'border-ata-green/30 bg-ata-green/10 text-ata-green' : 'border-ata-border text-slate-400'"
          @click="$emit('set-relay-payload-mode', option)"
        >
          {{ relayPayloadLabels[option] || option }}
        </button>
      </div>
    </div>

    <p class="mt-4 text-xs text-slate-400">{{ t('operations.relayEndpointLabel', 'Relay endpoint:') }} {{ relayEndpoint || t('operations.notConfigured', 'not configured') }}</p>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const relayPayloadLabels = computed(() => ({
  best: t('operations.bestAvailable', 'Best Available'),
  raw: t('operations.signedRawTx', 'Signed Raw Tx'),
  meta: t('operations.metaInvocation', 'Meta Invocation'),
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
});
defineEmits(['persist-draft', 'set-mode', 'set-relay-payload-mode']);
</script>
