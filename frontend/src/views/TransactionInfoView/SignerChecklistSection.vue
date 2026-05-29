<template>
  <section class="glass-panel p-5">
    <div class="mb-4">
      <h2 class="text-base font-bold font-outfit text-aa-text">
        {{ t("sharedDraft.signerChecklist", "Signer Checklist") }}
      </h2>
      <p class="text-sm text-aa-muted">{{ progressText }}.</p>
    </div>
    <div v-if="items.length === 0" class="empty-state">
      <svg
        aria-hidden="true"
        class="w-8 h-8 mx-auto mb-2 text-aa-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        ></path>
      </svg>
      <p class="text-sm text-aa-muted">
        {{
          t(
            "sharedDraft.noSignerChecklist",
            "No signer checklist has been recorded for this draft yet.",
          )
        }}
      </p>
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="item in items"
        :key="item.key"
        class="flex items-start justify-between gap-3 rounded-lg border border-aa-border/40 bg-aa-dark/40 p-4"
      >
        <div class="min-w-0">
          <div class="text-sm font-semibold text-aa-text break-all">
            {{ item.label }}
          </div>
          <div class="mt-1 text-xs text-aa-muted">
            {{ item.detail }}
          </div>
          <code
            v-if="item.signaturePreview"
            class="mt-2 block text-xs text-aa-muted"
            >{{ item.signaturePreview }}</code
          >
        </div>
        <span
          :class="
            item.statusKey === 'collected' ? 'badge-green' : 'badge-orange'
          "
          class="shrink-0"
          >{{ item.status }}</span
        >
      </div>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();

defineProps({
  items: { type: Array, default: () => [] },
  progressText: { type: String, default: "" },
});
</script>
