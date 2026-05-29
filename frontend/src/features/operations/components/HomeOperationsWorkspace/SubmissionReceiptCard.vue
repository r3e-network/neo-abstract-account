<template>
  <div
    class="mt-6 rounded-xl border border-aa-border/50 bg-aa-panel/80 backdrop-blur-md px-6 py-5 shadow-xl"
    :class="
      receipt.tone === 'success'
        ? 'border-neo-500/30 shadow-glow-green'
        : receipt.tone === 'error'
          ? 'border-aa-error/40 bg-aa-error/5'
          : 'border-aa-warning/30'
    "
  >
    <div class="flex items-center gap-2 mb-3">
      <span
        class="w-2.5 h-2.5 rounded-full"
        :class="
          receipt.tone === 'success'
            ? 'bg-neo-500 shadow-glow-green-sm'
            : receipt.tone === 'error'
              ? 'bg-aa-error shadow-glow-error-sm'
              : 'bg-aa-warning'
        "
      ></span>
      <p class="text-xs font-bold uppercase text-aa-text">
        {{ t("operations.receiptTitle", "Submission Receipt") }}
      </p>
    </div>
    <div
      v-if="receipt.tone === 'error'"
      class="mt-1 flex items-start gap-2"
    >
      <p
        role="alert"
        class="flex-1 text-sm text-aa-error-light leading-relaxed"
      >
        {{ receipt.detail }}
      </p>
      <button
        type="button"
        :aria-label="
          t('sharedDraft.copyErrorDetail', 'Copy error details')
        "
        class="shrink-0 mt-0.5 text-xs text-aa-muted hover:text-aa-text transition-colors duration-200"
        @click="
          emit('copy', {
            text: receipt.rawDetail || receipt.detail,
            key: 'receipt-error',
          })
        "
      >
        <svg
          aria-hidden="true"
          v-if="copiedKey !== 'receipt-error'"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          ></path>
        </svg>
        <svg
          aria-hidden="true"
          v-else
          class="w-4 h-4 text-aa-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
      </button>
    </div>
    <p v-else class="mt-1 text-sm text-aa-text leading-relaxed">
      {{ receipt.detail }}
    </p>
    <div
      v-if="receipt.txid"
      class="mt-3 flex items-start gap-2"
    >
      <code
        class="block flex-1 break-all rounded-lg border border-aa-border bg-aa-dark px-4 py-3 text-sm text-neo-300 font-mono shadow-inner"
        >{{ receipt.txid }}</code
      >
      <button
        type="button"
        :aria-label="
          t('operations.copyTxid', 'Copy transaction ID')
        "
        class="shrink-0 mt-2 text-xs text-aa-muted hover:text-aa-text transition-colors duration-200"
        @click="
          emit('copy', { text: receipt.txid, key: 'receipt-txid' })
        "
      >
        <svg
          aria-hidden="true"
          v-if="copiedKey !== 'receipt-txid'"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          ></path>
        </svg>
        <svg
          aria-hidden="true"
          v-else
          class="w-4 h-4 text-aa-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
      </button>
    </div>
    <a
      v-if="receipt.explorerUrl"
      :href="receipt.explorerUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-4 inline-flex items-center text-sm font-semibold text-neo-400 hover:text-neo-300 transition-colors duration-200"
    >
      {{ t("operations.openInExplorer", "Open in Explorer") }}
      <svg
        aria-hidden="true"
        class="w-4 h-4 ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        ></path>
      </svg>
    </a>
    <div
      v-if="historyItems && historyItems.length > 0"
      class="mt-6 border-t border-aa-border pt-5"
    >
      <p class="text-xs font-bold uppercase text-aa-muted mb-4">
        {{ t("operations.receiptHistoryTitle", "Receipt History") }}
      </p>
      <div class="space-y-3">
        <div
          v-for="item in historyItems"
          :key="`${item.createdAt}:${item.action}`"
          class="rounded-lg border px-4 py-3 transition-colors duration-200"
          :class="
            item.tone === 'error'
              ? 'border-aa-error/30 bg-aa-error/5 hover:bg-aa-error/10'
              : 'border-aa-border bg-aa-panel/40 hover:bg-aa-dark/60'
          "
        >
          <div class="flex items-center justify-between gap-3 mb-1">
            <div class="flex items-center gap-2">
              <span
                v-if="item.tone === 'error'"
                class="w-1.5 h-1.5 rounded-full bg-aa-error shrink-0"
              ></span>
              <span
                v-else-if="item.tone === 'success'"
                class="w-1.5 h-1.5 rounded-full bg-aa-success shrink-0"
              ></span>
              <div class="text-sm font-semibold text-aa-text">
                {{ item.title }}
              </div>
            </div>
            <div class="text-xs text-aa-muted">
              {{ item.createdLabel }}
            </div>
          </div>
          <div
            class="text-sm leading-relaxed"
            :class="
              item.tone === 'error'
                ? 'text-aa-error-light'
                : 'text-aa-text'
            "
          >
            {{ item.detail }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

defineProps({
  receipt: {
    type: Object,
    required: true,
  },
  historyItems: {
    type: Array,
    default: () => [],
  },
  copiedKey: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["copy"]);

const { t } = useI18n();
</script>
