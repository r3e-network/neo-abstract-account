<template>
  <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">{{ t('operations.relayPreflightTitle', 'Relay Preflight') }}</h2>
        <p class="text-sm text-slate-500">{{ t('operations.relayPreflightSubtitle', 'Inspect the latest relay simulation result before broadcasting.') }}</p>
      </div>
      <span class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" :class="badgeClass">
        {{ statusLabel }}
      </span>
    </div>

    <div class="mb-4 flex flex-wrap gap-3">
      <button class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canCopyPayload" @click="emitCopy('payload')">{{ copyActionKey === 'payload' ? t('operations.copied', 'Copied!') : t('operations.copyPayload', 'Copy Payload') }}</button>
      <button class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canCopyStack" @click="emitCopy('stack')">{{ copyActionKey === 'stack' ? t('operations.copied', 'Copied!') : t('operations.copyStack', 'Copy Stack') }}</button>
      <button class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canExportJson" @click="emitCopy('export')">{{ copyActionKey === 'export' ? t('operations.copied', 'Copied!') : t('operations.exportJson', 'Export JSON') }}</button>
    </div>

    <dl class="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
      <div>
        <dt class="font-medium text-slate-700">Payload Mode</dt>
        <dd>{{ payloadMode || 'best' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">VM State</dt>
        <dd>{{ vmState || 'Not available' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Gas Consumed</dt>
        <dd>{{ gasConsumed || 'Not available' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Operation</dt>
        <dd class="break-all font-mono text-xs">{{ operation || 'Not available' }}</dd>
      </div>
      <div class="md:col-span-2">
        <dt class="font-medium text-slate-700">Summary</dt>
        <dd>{{ detail }}</dd>
      </div>
      <div v-if="exception" class="md:col-span-2">
        <dt class="font-medium text-slate-700">Exception</dt>
        <dd class="break-all font-mono text-xs text-rose-700">{{ exception }}</dd>
      </div>
    </dl>

    <details v-if="formattedStack.length > 0" class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary class="cursor-pointer text-sm font-semibold text-slate-800">View Stack</summary>
      <div class="mt-3">
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Stack Preview</p>
        <div class="space-y-3">
          <div v-for="(item, index) in formattedStack" :key="index" class="rounded-xl border border-slate-200 bg-white p-3">
            <div class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Item {{ index }}</div>
            <div class="mt-2 text-xs text-slate-700"><strong>Type:</strong> {{ item.type }}</div>
            <div class="mt-1 text-xs text-slate-700"><strong>Raw Value:</strong></div>
            <pre class="mt-1 whitespace-pre-wrap break-all text-xs text-slate-600">{{ serialize(item.raw) }}</pre>
            <div class="mt-2 text-xs text-slate-700"><strong>Decoded Value:</strong></div>
            <pre class="mt-1 whitespace-pre-wrap break-all text-xs text-slate-600">{{ serialize(item.decoded) }}</pre>
          </div>
        </div>
      </div>
    </details>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { formatRelayStack } from '@/features/operations/relayStackFormatter.js';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const props = defineProps({
  level: { type: String, default: 'idle' },
  statusLabel: { type: String, default: 'Not Checked' },
  detail: { type: String, default: 'Run a relay preflight before submitting.' },
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
const badgeClass = computed(() => {
  if (props.level === 'ready') return 'bg-emerald-50 text-emerald-700';
  if (props.level === 'warning') return 'bg-amber-50 text-amber-700';
  if (props.level === 'blocked') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
});
const formattedStack = computed(() => formatRelayStack(props.stack || []));
const copyActionKey = ref('');
let copiedTimer = null;
function resetCopiedTimer() {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
    copiedTimer = null;
  }
}
function markCopied(value) {
  copyActionKey.value = value;
  resetCopiedTimer();
  copiedTimer = setTimeout(() => {
    copyActionKey.value = '';
    copiedTimer = null;
  }, 1200);
}
function emitCopy(kind) {
  markCopied(kind);
  if (kind === 'payload') emit('copy-payload');
  if (kind === 'stack') emit('copy-stack');
  if (kind === 'export') emit('export-json');
}
function serialize(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
onBeforeUnmount(() => resetCopiedTimer());
</script>
