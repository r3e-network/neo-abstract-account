<template>
  <div class="rounded-lg border border-aa-border bg-aa-dark/50 p-4">
    <p class="text-xs font-semibold uppercase tracking-widest text-aa-success mb-3">
      {{ t('market.vanityResultsTitle', 'Generated Addresses') }}
    </p>

    <div v-if="results.length === 0" class="text-center py-8">
      <div class="mx-auto w-12 h-12 rounded-full bg-aa-panel/30 flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-aa-muted" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <p class="text-sm text-aa-muted font-medium mb-1">{{ t('market.vanityNoResultsYet', 'No results yet') }}</p>
      <p class="text-xs text-aa-muted">{{ t('market.vanityNoResultsHint', 'Start generation to find matching addresses') }}</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(result, index) in results"
        :key="index"
        class="rounded-lg border border-aa-border bg-aa-dark/50 p-3"
      >
        <p class="break-all font-mono text-sm text-aa-text">{{ result.address }}</p>
        <p class="mt-1 break-all font-mono text-xs text-aa-muted">{{ t('market.seed', 'Seed:') }} {{ result.seed }}</p>
        <p class="mt-0.5 break-all font-mono text-xs text-aa-muted">{{ t('market.hash', 'Hash:') }} {{ result.accountIdHash }}</p>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-secondary btn-sm"
            :aria-label="t('market.ariaCopySeed', 'Copy seed')"
            @click="copySeed(result.seed)"
          >
            {{ t('market.vanityCopySeed', 'Copy Seed') }}
          </button>
          <button
            type="button"
            class="btn-primary btn-sm"
            :aria-label="t('market.ariaUseForListing', 'Use for listing')"
            @click="$emit('useForListing', result.seed)"
          >
            {{ t('market.vanityUseForListing', 'Use for Listing') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n';
import { useToast } from 'vue-toastification';
import { useClipboard } from '@/composables/useClipboard.js';
import { translateError } from '@/config/errorCodes.js';

defineProps({
  results: { type: Array, default: () => [] },
});

defineEmits(['useForListing']);

const { t } = useI18n();
const toast = useToast();
const { markCopied, copyText } = useClipboard();

async function copySeed(seed) {
  try {
    await copyText(seed);
    markCopied(seed);
    toast.success(t('market.vanitySeedCopied', 'Seed copied to clipboard'));
  } catch (err) {
    toast.error(translateError(err?.message, t) || t('market.vanityCopyFailed', 'Failed to copy seed.'));
  }
}
</script>
