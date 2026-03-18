<template>
  <div>
    <div class="mb-4 flex flex-wrap gap-2">
      <button
        v-for="filter in filters"
        :key="filter.id"
        class="rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200"
        :class="filter.id === activeFilter ? 'border-biconomy-orange/50 bg-biconomy-orange/20 text-biconomy-orange shadow-sm' : 'border-biconomy-border bg-biconomy-panel/40 text-biconomy-muted hover:bg-biconomy-panel hover:text-biconomy-text'"
        @click="activeFilter = filter.id"
      >
        <span>{{ filter.label }}</span>
        <span class="ml-2 rounded-full px-2 py-0.5 text-[11px]" :class="filter.id === activeFilter ? 'bg-biconomy-orange/30 text-biconomy-orange' : 'bg-biconomy-dark text-biconomy-text'">{{ filterCounts[filter.id] ?? 0 }}</span>
      </button>
    </div>

    <div v-if="groupedItems.length === 0" class="rounded-lg border border-dashed border-slate-700 bg-slate-800/20 p-8 text-center">
      <div class="mx-auto w-12 h-12 rounded-full bg-slate-700/30 flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </div>
      <p class="text-sm text-slate-400 font-medium mb-1">{{ emptyStateMessage }}</p>
      <p class="text-xs text-slate-500">Activity will appear here as you work with the workspace</p>
    </div>
    <div v-else class="space-y-4">
      <section v-for="group in groupedItems" :key="group.date">
        <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-biconomy-muted">{{ formatActivityDateLabel(group.date) }}</p>
        <ul class="space-y-3">
          <li class="rounded-lg border border-biconomy-border bg-biconomy-panel/40 px-4 py-3 hover:bg-biconomy-panel/60 transition-colors">
            <div v-for="item in group.items" :key="item.id" class="py-2 first:pt-0 last:pb-0">
              <div class="flex items-center justify-between gap-3 mb-2">
                <div class="flex items-center gap-3">
                  <span class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold flex-shrink-0" :class="toneClass(buildActivityPresentation(item).tone)" :aria-label="buildActivityPresentation(item).label">
                    {{ buildActivityPresentation(item).icon }}
                  </span>
                  <div>
                    <div class="text-xs font-bold uppercase tracking-[0.12em] text-biconomy-muted">{{ buildActivityPresentation(item).label }}</div>
                    <div class="text-sm text-biconomy-text mt-0.5 leading-relaxed">{{ item.detail }}</div>
                  </div>
                </div>
                <div class="text-xs text-biconomy-muted font-mono whitespace-nowrap">{{ formatActivityTimeLabel(item.createdAt) }}</div>
              </div>
              <div v-if="buildActivityActions(item, actionContext).length > 0" class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="action in buildActivityActions(item, actionContext)"
                  :key="`${item.id}:${action.id}`"
                  class="rounded-lg border border-biconomy-border bg-biconomy-panel hover:bg-biconomy-dark hover:text-white px-3 py-1.5 text-xs font-semibold text-biconomy-text transition-colors min-h-[32px]"
                  @click="emitActivityAction(item, action)"
                >
                  <span class="flex items-center gap-1.5">
                    <svg v-if="action.id === 'open-url'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    <svg v-else-if="action.id === 'jump-relay'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    {{ feedbackLabel(action, `${item.id}:${action.id}`) }}
                  </span>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ACTIVITY_FILTERS, buildActivityActions, buildActivityEmptyState, buildActivityFilterCounts, buildActivityGroups, buildActivityPresentation, filterActivityEntries, formatActivityDateLabel, formatActivityTimeLabel } from '@/features/operations/activityTimeline.js';
import { createOperationsPreferences } from '@/features/operations/preferences.js';

const props = defineProps({
  items: { type: Array, default: () => [] },
  actionContext: { type: Object, default: () => ({}) },
  preferenceKey: { type: String, default: '' },
});

const emit = defineEmits(['activity-action']);

const preferences = createOperationsPreferences();
const activeFilter = ref(props.preferenceKey ? preferences.getActivityFilter(props.preferenceKey) : 'all');
const filters = ACTIVITY_FILTERS;
const filterCounts = computed(() => buildActivityFilterCounts(props.items));
const groupedItems = computed(() => buildActivityGroups(filterActivityEntries(props.items, activeFilter.value)));
const emptyStateMessage = computed(() => buildActivityEmptyState(activeFilter.value));
const copiedActionKey = ref('');
let copiedTimer = null;

watch(activeFilter, (value) => {
  if (!props.preferenceKey) return;
  preferences.setActivityFilter(props.preferenceKey, value);
});

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
  if (action.id === 'jump-relay') return 'Jumped!';
  return 'Copied!';
}

function emitActivityAction(item, action) {
  const key = `${item.id}:${action.id}`;
  markCopied(key);
  emit('activity-action', { event: item, action });
}

function toneClass(tone) {
  if (tone === 'identity') return 'bg-sky-500/10 text-sky-300 border border-sky-500/30';
  if (tone === 'signature') return 'bg-biconomy-lightOrange/10 text-biconomy-lightOrange border border-biconomy-lightOrange/30';
  if (tone === 'relay') return 'bg-biconomy-orange/10 text-biconomy-orange border border-biconomy-orange/30';
  if (tone === 'broadcast') return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
  return 'bg-biconomy-panel text-biconomy-muted border border-biconomy-border';
}

onBeforeUnmount(() => {
  resetCopiedTimer();
});
</script>
