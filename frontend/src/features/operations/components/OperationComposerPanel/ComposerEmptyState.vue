<template>
  <div class="empty-state mb-5">
    <EmptyStateArt
      :size="160"
      class="mx-auto mb-3"
      :title="t('operations.composerEmptyTitle', 'Enter a contract hash above to begin composing an operation')"
    />
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
import { EmptyStateArt } from "@/components/illustrations";

const { t } = useI18n();
</script>
