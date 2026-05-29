<template>
  <section class="glass-panel p-5">
    <h2 class="text-base font-bold font-outfit text-aa-text mb-3">
      {{ t("sharedDraft.collectedSignaturesTitle", "Collected Signatures") }}
    </h2>
    <div v-if="signatures.length === 0" class="text-sm text-aa-muted">
      {{
        t(
          "sharedDraft.noSignaturesYet",
          "No signatures have been attached yet.",
        )
      }}
    </div>
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="signature in signatures"
        :key="signature.key"
        class="rounded-lg border border-aa-border/40 bg-aa-dark/40 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold text-aa-text break-all">
              {{ signature.label }}
            </div>
            <div class="mt-1 text-xs text-aa-muted">
              {{ t("sharedDraft.addedPrefix", "Added") }}
              {{ signature.createdLabel }}
            </div>
          </div>
          <div class="flex flex-wrap justify-end gap-1">
            <span
              v-for="badge in signature.badges"
              :key="badge"
              class="rounded border border-aa-border bg-aa-panel px-2 py-0.5 text-xs font-medium text-aa-muted"
              >{{ badge }}</span
            >
          </div>
        </div>
        <code
          class="mt-3 block break-all rounded-md border border-aa-border bg-aa-panel px-3 py-1.5 text-xs text-aa-muted"
          >{{ signature.signaturePreview }}</code
        >
        <details class="mt-3">
          <summary
            class="cursor-pointer text-xs font-medium text-aa-muted hover:text-aa-text transition-colors duration-200"
          >
            {{ t("sharedDraft.viewFullSignature", "View Full Signature") }}
          </summary>
          <code
            class="mt-2 block break-all text-xs text-aa-muted bg-aa-panel border border-aa-border p-2 rounded-md"
            >{{ signature.signatureHex }}</code
          >
        </details>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from "@/i18n";

const { t } = useI18n();

defineProps({
  signatures: { type: Array, default: () => [] },
});
</script>
