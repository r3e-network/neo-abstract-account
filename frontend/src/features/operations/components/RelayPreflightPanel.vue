<template>
  <section class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.relayPreflightTitle', 'Relay Preflight') }}</h2>
        <p class="text-sm text-biconomy-muted">{{ t('operations.relayPreflightSubtitle', 'Inspect the latest relay simulation result before broadcasting.') }}</p>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" :class="badgeClass">
        <span class="w-1.5 h-1.5 rounded-full" :class="badgeDotClass"></span>
        {{ statusLabel }}
      </span>
    </div>

    <div v-if="level === 'idle'" class="rounded-lg border border-dashed border-slate-600 bg-slate-800/30 p-8 text-center">
      <div class="mx-auto w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
      </div>
      <p class="text-slate-300 font-medium mb-2">No preflight check run yet</p>
      <p class="text-sm text-slate-500 max-w-md mx-auto">Run a relay preflight check from the Broadcast section to simulate your transaction before committing to the blockchain.</p>
    </div>

    <template v-else>
      <div class="mb-4 flex flex-wrap gap-3">
        <button class="rounded-lg border border-biconomy-border bg-biconomy-panel px-4 py-2 text-sm font-semibold text-biconomy-text disabled:cursor-not-allowed disabled:opacity-50 hover:bg-biconomy-panel/80 transition-colors" :disabled="!canCopyPayload" @click="emitCopy('payload')">
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            {{ copyActionKey === 'payload' ? 'Copied!' : 'Copy Payload' }}
          </span>
        </button>
        <button class="rounded-lg border border-biconomy-border bg-biconomy-panel px-4 py-2 text-sm font-semibold text-biconomy-text disabled:cursor-not-allowed disabled:opacity-50 hover:bg-biconomy-panel/80 transition-colors" :disabled="!canCopyStack" @click="emitCopy('stack')">
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            {{ copyActionKey === 'stack' ? 'Copied!' : 'Copy Stack' }}
          </span>
        </button>
        <button class="rounded-lg border border-biconomy-border bg-biconomy-panel px-4 py-2 text-sm font-semibold text-biconomy-text disabled:cursor-not-allowed disabled:opacity-50 hover:bg-biconomy-panel/80 transition-colors" :disabled="!canExportJson" @click="emitCopy('export')">
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            {{ copyActionKey === 'export' ? 'Exported!' : 'Export JSON' }}
          </span>
        </button>
      </div>

      <dl class="grid gap-4 text-sm text-biconomy-muted md:grid-cols-2">
        <div>
          <dt class="font-medium text-biconomy-text">Payload Mode</dt>
          <dd class="mt-1 rounded bg-slate-800/50 px-2 py-1 font-mono text-xs">{{ payloadMode || 'best' }}</dd>
        </div>
        <div>
          <dt class="font-medium text-biconomy-text">VM State</dt>
          <dd class="mt-1 font-mono text-xs" :class="vmState === 'HALT' ? 'text-emerald-400' : 'text-rose-400'">{{ vmState || 'Not available' }}</dd>
        </div>
        <div>
          <dt class="font-medium text-biconomy-text">Gas Consumed</dt>
          <dd class="mt-1 rounded bg-slate-800/50 px-2 py-1 font-mono text-xs">{{ gasConsumed || 'Not available' }}</dd>
        </div>
        <div>
          <dt class="font-medium text-biconomy-text">Operation</dt>
          <dd class="mt-1 break-all font-mono text-xs">{{ operation || 'Not available' }}</dd>
        </div>
        <div class="md:col-span-2">
          <dt class="font-medium text-biconomy-text">Summary</dt>
          <dd class="mt-1 rounded bg-slate-800/50 px-3 py-2 text-sm">{{ detail }}</dd>
        </div>
        <div v-if="exception" class="md:col-span-2">
          <dt class="font-medium text-rose-400">Exception</dt>
          <dd class="mt-1 break-all rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-300">{{ exception }}</dd>
        </div>
      </dl>

      <details v-if="formattedStack.length > 0" class="mt-5 rounded-lg border border-biconomy-border bg-biconomy-panel p-4">
        <summary class="cursor-pointer text-sm font-semibold text-biconomy-text uppercase tracking-widest font-mono hover:text-white transition-colors">View Stack Trace ({{ formattedStack.length }} items)</summary>
        <div class="mt-4 space-y-3">
          <div v-for="(item, index) in formattedStack" :key="index" class="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="rounded bg-slate-700 px-2 py-0.5 text-xs font-mono text-slate-300">Item {{ index }}</span>
              <span class="rounded px-2 py-0.5 text-xs font-mono" :class="item.type === 'Integer' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-sky-500/10 text-sky-300'">{{ item.type }}</span>
            </div>
            <div class="grid gap-2 text-xs">
              <div>
                <span class="text-slate-500">Raw:</span>
                <pre class="mt-1 whitespace-pre-wrap break-all text-slate-400 font-mono">{{ serialize(item.raw) }}</pre>
              </div>
              <div>
                <span class="text-slate-500">Decoded:</span>
                <pre class="mt-1 whitespace-pre-wrap break-all text-slate-300 font-mono">{{ serialize(item.decoded) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </details>
    </template>
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
  if (props.level === 'ready') return 'bg-biconomy-orange/10 text-biconomy-orange';
  if (props.level === 'warning') return 'bg-amber-500/10 text-amber-400';
  if (props.level === 'blocked') return 'bg-rose-500/10 text-rose-400';
  return 'bg-biconomy-panel text-biconomy-muted';
});
const badgeDotClass = computed(() => {
  if (props.level === 'ready') return 'bg-biconomy-orange animate-pulse';
  if (props.level === 'warning') return 'bg-amber-400';
  if (props.level === 'blocked') return 'bg-rose-400';
  return 'bg-slate-500';
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
