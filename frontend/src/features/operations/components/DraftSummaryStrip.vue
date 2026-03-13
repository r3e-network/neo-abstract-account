<template>
  <section class="rounded-lg border border-biconomy-border bg-biconomy-panel/60 p-5 shadow-[0_0_15px_rgba(0,163,255,0.05)] backdrop-blur-xl">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-white uppercase tracking-widest font-mono">{{ title }}</h2>
        <p class="text-sm text-biconomy-muted">Quick scan of the account, operation, signer progress, relay mode, and latest activity.</p>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <div v-for="item in summaryItems" :key="item.label" class="rounded-lg border border-biconomy-border bg-biconomy-dark/40 p-4 shadow-inner hover:bg-biconomy-dark/60 transition-colors">
        <div class="mb-2 flex items-start justify-between gap-3">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-biconomy-orange">{{ item.label }}</p>
          <button
            v-if="summaryActions[item.label]"
            class="rounded-lg border border-slate-600 bg-biconomy-panel hover:bg-biconomy-dark hover:text-white px-2.5 py-1 text-[11px] font-semibold text-biconomy-text transition-colors"
            @click="emitSummaryAction(item, summaryActions[item.label])"
          >
            {{ feedbackLabel(summaryActions[item.label], item.label) }}
          </button>
        </div>
        <div class="text-sm font-semibold text-biconomy-text break-all">{{ item.value }}</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { buildDraftSummaryActions, buildDraftSummaryItems } from '@/features/operations/draftSummary.js';

const props = defineProps({
  title: { type: String, default: 'Draft Overview' },
  draft: { type: Object, default: () => ({}) },
  actionContext: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['summary-action']);

const summaryItems = computed(() => buildDraftSummaryItems({ draft: props.draft || {} }));
const summaryActions = computed(() => buildDraftSummaryActions({
  draft: props.draft || {},
  shareUrl: props.actionContext?.shareUrl || '',
  collaboratorUrl: props.actionContext?.collaboratorUrl || '',
  operatorUrl: props.actionContext?.operatorUrl || '',
  explorerBaseUrl: props.actionContext?.explorerBaseUrl || '',
}));
const copiedActionKey = ref('');
let copiedTimer = null;

function resetCopiedTimer() {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
    copiedTimer = null;
  }
}

function markCopied(key) {
  copiedActionKey.value = key;
  resetCopiedTimer();
  copiedTimer = setTimeout(() => {
    copiedActionKey.value = '';
    copiedTimer = null;
  }, 1200);
}

function feedbackLabel(action, key) {
  if (copiedActionKey.value !== key) return action.label;
  if (action.id === 'open-url') return 'Opened!';
  return 'Copied!';
}

function emitSummaryAction(item, action) {
  markCopied(item.label);
  emit('summary-action', { item, action });
}

onBeforeUnmount(() => {
  resetCopiedTimer();
});
</script>
