<template>
  <section class="glass-panel p-6">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">{{ t('operations.relayPreflightTitle', 'Relay Preflight') }}</h2>
        <p class="text-sm text-aa-muted">{{ t('operations.relayPreflightSubtitle', 'Inspect the latest relay simulation result before broadcasting.') }}</p>
      </div>
      <span class="badge" :class="badgeClass">
        <span class="w-1.5 h-1.5 rounded-full" :class="badgeDotClass"></span>
        {{ displayStatusLabel }}
      </span>
    </div>

    <div v-if="level === 'idle'" class="empty-state">
      <div class="mx-auto w-12 h-12 rounded-full bg-aa-dark/50 flex items-center justify-center mb-4">
        <svg aria-hidden="true" class="w-6 h-6 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
      </div>
      <p class="text-aa-text font-medium mb-2">{{ t('operations.preflightIdle', 'No preflight check run yet') }}</p>
      <p class="text-sm text-aa-muted max-w-md mx-auto">{{ t('operations.preflightIdleHint', 'Run a relay preflight check from the Broadcast section to simulate your transaction before committing to the blockchain.') }}</p>
    </div>

    <template v-else>
      <div class="sr-only">{{ t('operations.srStackPreview', 'Stack Preview. View Stack. Decoded Value.') }}</div>
      <div class="mb-4 flex flex-wrap gap-3">
        <button class="btn-secondary" :aria-label="t('operations.copyPayload', 'Copy Payload')" :disabled="!canCopyPayload" @click="emitCopy('payload')">
          <span class="flex items-center gap-2">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            {{ copyActionKey === 'payload' ? t('operations.copied', 'Copied!') : t('operations.copyPayload', 'Copy Payload') }}
          </span>
        </button>
        <button class="btn-secondary" :aria-label="t('operations.copyStack', 'Copy Stack')" :disabled="!canCopyStack" @click="emitCopy('stack')">
          <span class="flex items-center gap-2">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            {{ copyActionKey === 'stack' ? t('operations.copied', 'Copied!') : t('operations.copyStack', 'Copy Stack') }}
          </span>
        </button>
        <button class="btn-secondary" :aria-label="t('operations.exportJson', 'Export JSON')" :disabled="!canExportJson" @click="emitCopy('export')">
          <span class="flex items-center gap-2">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            {{ copyActionKey === 'export' ? t('operations.exported', 'Exported!') : t('operations.exportJson', 'Export JSON') }}
          </span>
        </button>
      </div>

      <dl class="grid gap-4 text-sm text-aa-muted md:grid-cols-2">
        <div>
          <dt class="font-medium text-aa-text">{{ t('operations.payloadMode', 'Payload Mode') }}</dt>
          <dd class="mt-1 rounded bg-aa-panel/50 px-2 py-1 font-mono text-xs">{{ payloadMode || 'best' }}</dd>
        </div>
        <div>
          <dt class="font-medium text-aa-text">{{ t('operations.vmState', 'VM State') }}</dt>
          <dd class="mt-1 font-mono text-xs" :class="vmState === 'HALT' ? 'text-aa-success' : 'text-aa-error'">{{ vmState || t('operations.notAvailable', 'Not available') }}</dd>
        </div>
        <div>
          <dt class="font-medium text-aa-text">{{ t('operations.gasConsumed', 'Gas Consumed') }}</dt>
          <dd class="mt-1 rounded bg-aa-panel/50 px-2 py-1 font-mono text-xs">{{ gasConsumed || t('operations.notAvailable', 'Not available') }}</dd>
        </div>
        <div>
          <dt class="font-medium text-aa-text">{{ t('operations.operation', 'Operation') }}</dt>
          <dd class="mt-1 break-all font-mono text-xs">{{ operation || t('operations.notAvailable', 'Not available') }}</dd>
        </div>
        <div class="md:col-span-2">
          <dt class="font-medium text-aa-text">{{ t('operations.summary', 'Summary') }}</dt>
          <dd class="mt-1 rounded bg-aa-panel/50 px-3 py-2 text-sm">{{ displayDetail }}</dd>
        </div>
        <div v-if="exception" class="md:col-span-2">
          <dt class="font-medium text-aa-error">{{ t('operations.exception', 'Exception') }}</dt>
          <dd class="mt-1 break-all rounded border border-aa-error/30 bg-aa-error/10 px-3 py-2 font-mono text-xs text-aa-error-light">{{ exception }}</dd>
        </div>
      </dl>

      <details v-if="formattedStack.length > 0" class="mt-5 glass-panel p-4">
        <summary class="cursor-pointer text-sm font-semibold text-aa-text hover:text-aa-text transition-colors duration-200">{{ t('operations.viewStackTrace', 'View Stack Trace') }} ({{ formattedStack.length }} {{ t('operations.items', 'items') }})</summary>
        <div class="mt-4 space-y-3">
          <div v-for="(item, index) in formattedStack" :key="index" class="rounded-lg border border-aa-border bg-aa-panel/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="rounded bg-aa-dark px-2 py-0.5 text-xs font-mono text-aa-text">{{ t('operations.item', 'Item') }} {{ index }}</span>
              <span class="rounded px-2 py-0.5 text-xs font-mono" :class="item.type === 'Integer' ? 'bg-aa-success/10 text-aa-success-light' : 'bg-aa-info/10 text-aa-info-light'">{{ item.type }}</span>
            </div>
            <div class="grid gap-2 text-xs">
              <div>
                <span class="text-aa-muted">{{ t('operations.raw', 'Raw:') }}</span>
                <pre class="mt-1 whitespace-pre-wrap break-all text-aa-muted font-mono">{{ serialize(item.raw) }}</pre>
              </div>
              <div>
                <span class="text-aa-muted">{{ t('operations.decoded', 'Decoded:') }}</span>
                <pre class="mt-1 whitespace-pre-wrap break-all text-aa-text font-mono">{{ serialize(item.decoded) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </details>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { formatRelayStack } from '@/features/operations/relayStackFormatter.js';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@/i18n';

const { t } = useI18n();
const { copiedKey: copyActionKey, markCopied } = useClipboard();

const props = defineProps({
  level: { type: String, default: 'idle' },
  statusLabel: { type: String, default: '' },
  detail: { type: String, default: '' },
  payloadMode: { type: String, default: 'best' },
  vmState: { type: String, default: '' },
  gasConsumed: { type: String, default: '' },
  operation: { type: String, default: '' },
  exception: { type: String, default: '' },
  stack: { type: Array, default: () => [] },
  canCopyPayload: { type: Boolean, default: false },
  canCopyStack: { type: Boolean, default: false },
  canExportJson: { type: Boolean, default: false },
});

const emit = defineEmits(['copy-payload', 'copy-stack', 'export-json']);
const displayStatusLabel = computed(() => !props.statusLabel
  ? t('operations.relayNotChecked', 'Not Checked')
  : props.statusLabel);
const displayDetail = computed(() => !props.detail
  ? t('operations.relayPreflightHint', 'Run a relay preflight before submitting.')
  : props.detail);
const badgeClass = computed(() => {
  if (props.level === 'ready') return 'badge-orange';
  if (props.level === 'warning') return 'badge-amber';
  if (props.level === 'blocked') return 'badge-red';
  return 'bg-aa-panel text-aa-muted';
});
const badgeDotClass = computed(() => {
  if (props.level === 'ready') return 'bg-aa-orange animate-pulse';
  if (props.level === 'warning') return 'bg-aa-warning';
  if (props.level === 'blocked') return 'bg-aa-error';
  return 'bg-aa-muted';
});
const formattedStack = computed(() => formatRelayStack(props.stack || []));
function emitCopy(kind) {
  markCopied(kind);
  if (kind === 'payload') emit('copy-payload');
  if (kind === 'stack') emit('copy-stack');
  if (kind === 'export') emit('export-json');
}
function serialize(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
</script>
