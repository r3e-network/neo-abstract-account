<template>
  <div class="empty-state">
    <div
      class="mx-auto w-12 h-12 rounded-full bg-aa-panel/30 flex items-center justify-center mb-3"
    >
      <svg
        aria-hidden="true"
        class="w-6 h-6 text-aa-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        ></path>
      </svg>
    </div>
    <p class="text-sm text-aa-text font-medium mb-1">
      {{ t("studioPanels.noAccountLoaded", "No account loaded") }}
    </p>
    <p class="text-xs text-aa-muted">
      {{
        t(
          "studioPanels.loadAccountHint",
          'Enter an accountId hash above and click "Load V3 State" to get started.',
        )
      }}
    </p>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();
</script>
