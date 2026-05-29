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
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        ></path>
      </svg>
    </div>
    <p class="text-sm text-aa-text font-medium mb-1">
      {{ t("security.noAccountLoaded", "No account loaded") }}
    </p>
    <p class="text-xs text-aa-muted">
      {{
        t(
          "security.loadAccountForSecurity",
          "Load an account to view its security dashboard.",
        )
      }}
    </p>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();
</script>
