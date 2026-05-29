<template>
  <div
    class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-aa-success/20 mb-6 border border-aa-success/30"
  >
    <svg
      aria-hidden="true"
      class="h-8 w-8 text-aa-success animate-fade-in"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2.5"
        d="M5 13l4 4L19 7"
      />
    </svg>
  </div>
  <h1 class="text-2xl font-bold text-white mb-2 text-center">
    {{ t("sharedDraft.transactionSubmitted", "Transaction Submitted") }}
  </h1>
  <p class="text-sm text-aa-muted mb-8 max-w-lg mx-auto text-center">
    {{
      t(
        "sharedDraft.transactionSubmittedDesc",
        "Your transaction has been securely broadcast to the Neo N3 network.",
      )
    }}
  </p>
  <div class="glass-panel p-5 mb-8 inline-block w-full max-w-full">
    <div class="flex items-center justify-between mb-2">
      <p class="text-xs font-semibold text-aa-muted uppercase">
        {{ t("sharedDraft.transactionHash", "Transaction Hash") }}
      </p>
      <button
        @click="$emit('copy')"
        :aria-label="t('operations.copyTxHash', 'Copy transaction hash')"
        class="text-xs font-medium text-aa-text hover:text-aa-orange bg-aa-dark border border-aa-border px-3 py-2 sm:py-1 rounded transition-colors duration-200"
      >
        {{
          copiedKey === "txid"
            ? t("sharedDraft.copied", "Copied!")
            : t("sharedDraft.copy", "Copy")
        }}
      </button>
    </div>
    <code
      class="block text-sm font-mono text-aa-text break-all bg-aa-dark border border-aa-border p-3 rounded-md select-all"
      >{{ txid }}</code
    >
  </div>
  <div class="flex flex-col sm:flex-row justify-center gap-3">
    <RouterLink to="/" class="btn-secondary w-full sm:w-auto">{{
      t("sharedDraft.returnHome", "Return Home")
    }}</RouterLink>
    <a
      :href="explorerUrl || '#'"
      target="_blank"
      rel="noopener noreferrer"
      class="btn-primary w-full sm:w-auto"
      >{{ t("sharedDraft.viewInExplorer", "View in Explorer") }}</a
    >
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";
import { useI18n } from "@/i18n";

const { t } = useI18n();

defineProps({
  txid: { type: String, default: "" },
  explorerUrl: { type: String, default: "" },
  copiedKey: { type: String, default: "" },
});

defineEmits(["copy"]);
</script>
