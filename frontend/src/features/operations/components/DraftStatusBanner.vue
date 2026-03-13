<template>
  <section class="rounded-lg border p-4 shadow-sm"
    :class="toneClass"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em]" :class="titleToneClass">{{ title }}</p>
        <div class="mt-1 text-sm font-semibold text-white">{{ label }}</div>
        <div class="text-sm text-biconomy-muted">{{ detail }}</div>
      </div>
      <div class="text-[11px] font-medium text-biconomy-muted">{{ timestamp || 'Just now' }}</div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { buildDraftStatusBanner } from '@/features/operations/draftStatusBanner.js';

const props = defineProps({
  status: { type: String, default: 'draft' },
  activity: { type: Array, default: () => [] },
});

const DEFAULT_DRAFT_STATUS_TITLE = 'Latest Draft State';

const banner = computed(() => buildDraftStatusBanner({
  status: props.status,
  activity: props.activity,
}));

const title = computed(() => banner.value.title || DEFAULT_DRAFT_STATUS_TITLE);
const label = computed(() => banner.value.label);
const detail = computed(() => banner.value.detail);
const timestamp = computed(() => banner.value.timestamp);

const toneClass = computed(() => {
  if (banner.value.tone === 'relay') return 'border-biconomy-orange/30 bg-biconomy-orange/10';
  if (banner.value.tone === 'client') return 'border-biconomy-lightOrange/30 bg-biconomy-lightOrange/10';
  if (banner.value.tone === 'identity') return 'border-sky-500/30 bg-sky-500/10';
  return 'border-amber-500/30 bg-amber-500/10';
});

const titleToneClass = computed(() => {
  if (banner.value.tone === 'relay') return 'text-biconomy-orange';
  if (banner.value.tone === 'client') return 'text-biconomy-lightOrange';
  if (banner.value.tone === 'identity') return 'text-sky-300';
  return 'text-amber-400';
});
</script>
