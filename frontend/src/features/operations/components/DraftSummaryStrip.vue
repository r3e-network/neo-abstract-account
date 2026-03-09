<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900">{{ title }}</h2>
        <p class="text-sm text-slate-500">Quick scan of the account, operation, signer progress, relay mode, and latest activity.</p>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <div v-for="item in summaryItems" :key="item.label" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-2 flex items-start justify-between gap-3">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{{ item.label }}</p>
          <button
            v-if="summaryActions[item.label]"
            class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
            @click="emitSummaryAction(item, summaryActions[item.label])"
          >
            {{ feedbackLabel(summaryActions[item.label], item.label) }}
          </button>
        </div>
        <div class="text-sm text-slate-700 break-all">{{ item.value }}</div>
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
