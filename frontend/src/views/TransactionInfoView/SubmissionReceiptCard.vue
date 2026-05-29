<template>
  <div
    v-if="receipt"
    role="alert"
    class="mt-4 rounded-lg border px-4 py-3 text-sm"
    :class="
      receipt.tone === 'success'
        ? 'border-aa-success/30 bg-aa-success/10 text-aa-success'
        : receipt.tone === 'error'
          ? 'border-aa-error/30 bg-aa-error/10 text-aa-error'
          : 'border-aa-warning/30 bg-aa-warning/10 text-aa-warning'
    "
  >
    <p class="text-xs font-semibold uppercase">
      {{ t("sharedDraft.submissionReceipt", "Submission Receipt") }}
    </p>
    <div class="mt-1 text-sm font-medium">
      {{ receipt.title }}
    </div>
    <p class="mt-1 text-sm">
      {{ receipt.detail }}
    </p>
    <code
      v-if="receipt.txid"
      class="mt-2 block break-all rounded-md border border-aa-border bg-aa-dark/60 px-3 py-1.5 text-xs"
      >{{ receipt.txid }}</code
    >
    <a
      v-if="receipt.explorerUrl"
      :href="receipt.explorerUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-2 inline-flex font-medium text-xs underline"
      >{{ t("sharedDraft.openInExplorer", "Open in Explorer") }}</a
    >
    <div
      v-if="historyItems.length > 0"
      class="mt-4 border-t border-aa-border/40 pt-3"
    >
      <p class="text-xs font-semibold uppercase">
        {{ t("sharedDraft.receiptHistory", "Receipt History") }}
      </p>
      <div class="mt-2 space-y-2">
        <div
          v-for="item in historyItems"
          :key="`${item.createdAt}:${item.action}`"
          class="rounded-md border border-aa-border/40 bg-aa-panel/40 px-3 py-2"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-medium text-aa-text">
              {{ item.title }}
            </div>
            <div class="text-xs text-aa-muted">
              {{ item.createdLabel }}
            </div>
          </div>
          <div class="mt-1 text-xs text-aa-muted">
            {{ item.detail }}
          </div>
          <a
            v-if="item.explorerUrl"
            :href="item.explorerUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 inline-flex text-xs font-medium underline text-aa-text"
            >{{ t("sharedDraft.openInExplorer", "Open in Explorer") }}</a
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();

defineProps({
  receipt: { type: Object, default: null },
  historyItems: { type: Array, default: () => [] },
});
</script>
