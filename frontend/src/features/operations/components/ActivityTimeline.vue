<template>
  <div>
    <div class="mb-3 flex flex-wrap gap-2">
      <button
        v-for="filter in filters"
        :key="filter.id"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="filter.id === activeFilter ? 'border-neo-500/50 bg-neo-500/20 text-neo-300' : 'border-slate-700/50 bg-slate-800/40 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'"
        @click="activeFilter = filter.id"
      >
        <span>{{ filter.label }}</span>
        <span class="ml-2 rounded-full px-2 py-0.5 text-[11px]" :class="filter.id === activeFilter ? 'bg-neo-500/30 text-neo-100' : 'bg-slate-700 text-slate-300'">{{ filterCounts[filter.id] ?? 0 }}</span>
      </button>
    </div>

    <div v-if="groupedItems.length === 0" class="text-xs text-slate-500">{{ emptyStateMessage }}</div>
    <div v-else class="space-y-4">
      <section v-for="group in groupedItems" :key="group.date">
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{{ formatActivityDateLabel(group.date) }}</p>
        <ul class="space-y-2">
          <li v-for="item in group.items" :key="item.id" class="rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 hover:bg-slate-800/60 transition-colors">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" :class="toneClass(buildActivityPresentation(item).tone)">{{ buildActivityPresentation(item).icon }}</span>
                <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{{ buildActivityPresentation(item).label }}</div>
              </div>
              <div class="text-[11px] text-slate-500 font-mono">{{ formatActivityTimeLabel(item.createdAt) }}</div>
            </div>
            <div class="text-sm text-slate-300 mt-1.5 leading-relaxed">{{ item.detail }}</div>
            <div v-if="buildActivityActions(item, actionContext).length > 0" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="action in buildActivityActions(item, actionContext)"
                :key="`${item.id}:${action.id}`"
                class="rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 hover:text-white px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-colors"
                @click="emitActivityAction(item, action)"
              >
                {{ feedbackLabel(action, `${item.id}:${action.id}`) }}
              </button>
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
  if (tone === 'signature') return 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/30';
  if (tone === 'relay') return 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30';
  if (tone === 'broadcast') return 'bg-fuchsia-900/40 text-fuchsia-400 border border-fuchsia-500/30';
  return 'bg-slate-800 text-slate-400 border border-slate-700/50';
}

onBeforeUnmount(() => {
  resetCopiedTimer();
});
</script>
