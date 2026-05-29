<template>
  <div class="empty-state">
    <div
      class="mx-auto w-16 h-16 rounded-full bg-aa-dark/50 flex items-center justify-center mb-4"
    >
      <svg
        aria-hidden="true"
        class="w-8 h-8 text-aa-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        ></path>
      </svg>
    </div>
    <p class="text-aa-text font-medium mb-2">
      {{
        t("market.noListingsFound", "No listings found on-chain yet")
      }}
    </p>
    <p class="text-sm text-aa-muted max-w-md mx-auto mb-6">
      {{
        t(
          "market.noListingsHint",
          "Be the first to list your Abstract Account address for sale. Listings are secured by trustless on-chain escrow.",
        )
      }}
    </p>
    <router-link
      to="/app"
      class="inline-flex items-center gap-2 text-sm font-semibold text-aa-info hover:text-aa-info-light transition-colors duration-200"
    >
      {{
        t("market.createAaAccountFirst", "Create an AA account first")
      }}
      <span>&rarr;</span>
    </router-link>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();
</script>
