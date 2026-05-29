<template>
  <div class="empty-state mb-5">
    <svg
      aria-hidden="true"
      class="mx-auto mb-3 w-8 h-8 text-aa-muted"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      ></path>
    </svg>
    <p class="text-sm font-medium text-aa-text">
      {{
        t(
          "operations.composerEmptyTitle",
          "Enter a contract hash above to begin composing an operation",
        )
      }}
    </p>
    <p class="mt-1 text-xs text-aa-muted">
      {{
        t(
          "operations.composerEmptyHint",
          "You can search by name, NNS address, or paste a script hash directly.",
        )
      }}
    </p>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();
</script>
