<template>
  <section class="rounded-2xl border p-4 shadow-sm"
    :class="toneClass"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em]" :class="titleToneClass">{{ title }}</p>
        <div class="mt-1 text-sm font-semibold text-slate-900">{{ label }}</div>
        <div class="text-sm text-slate-600">{{ detail }}</div>
      </div>
      <div class="text-[11px] font-medium text-slate-500">{{ timestamp || 'Just now' }}</div>
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
  if (banner.value.tone === 'relay') return 'border-emerald-200 bg-emerald-50';
  if (banner.value.tone === 'client') return 'border-blue-200 bg-blue-50';
  return 'border-amber-200 bg-amber-50';
});

const titleToneClass = computed(() => {
  if (banner.value.tone === 'relay') return 'text-emerald-700';
  if (banner.value.tone === 'client') return 'text-blue-700';
  return 'text-amber-700';
});
</script>
