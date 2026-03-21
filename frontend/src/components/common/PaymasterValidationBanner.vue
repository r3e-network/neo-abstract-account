<template>
  <section class="mb-6 rounded-xl border border-aa-success/25 bg-aa-success/8 p-6 shadow-glow-emerald backdrop-blur-md">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-aa-success-light">{{ t(`${i18nKeyPrefix}.paymasterValidationLabel`, 'Live-Validated Paymaster Path') }}</p>
        <p class="mt-2 text-lg font-bold text-aa-text">{{ t(`${i18nKeyPrefix}.paymasterValidationTitle`, 'AA + Morpheus paymaster is verified on Neo N3 testnet') }}</p>
        <p class="mt-2 max-w-3xl text-sm leading-7 text-aa-text">
          {{ t(`${i18nKeyPrefix}.paymasterValidationBody`, 'The current workspace path has passed live validation for registerAccount, updateVerifier, remote allowlist update, paymaster authorization, relay submission, and on-chain executeUserOp execution.') }}
        </p>
        <code class="mt-3 block break-all rounded-xl border border-aa-border bg-aa-dark/80 px-4 py-3 text-xs font-medium text-aa-success-light shadow-inner">
          {{ t(`${i18nKeyPrefix}.paymasterValidationTx`, `Latest full-path relay tx: ${txid}`) }}
        </code>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-3">
        <router-link
          class="inline-flex items-center rounded-xl border border-aa-success/30 bg-aa-success/10 px-4 py-2 text-sm font-semibold text-aa-success-light transition-colors duration-200 hover:border-aa-success-light/60 hover:bg-aa-success/15"
          :to="{ path: '/docs', query: { doc: 'paymasterValidation' } }"
        >
          {{ t(`${i18nKeyPrefix}.paymasterValidationLink`, 'Open Validation Ledger') }}
        </router-link>
        <a
          v-if="explorerUrl"
          class="inline-flex items-center rounded-xl border border-aa-border bg-aa-dark/70 px-4 py-2 text-sm font-semibold text-aa-text transition-colors duration-200 hover:border-aa-muted hover:text-aa-text"
          :href="explorerUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t(`${i18nKeyPrefix}.paymasterValidationExplorer`, 'Open Explorer Tx') }}
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '@/i18n';
import { buildTransactionExplorerUrl } from '@/features/operations/explorer.js';
import { LATEST_PAYMASTER_VALIDATION_TXID } from '@/config/constants.js';

const props = defineProps({
  explorerBaseUrl: { type: String, default: '' },
  i18nKeyPrefix: { type: String, default: 'sharedDraft' },
});

const { t } = useI18n();
const txid = LATEST_PAYMASTER_VALIDATION_TXID;
const explorerUrl = computed(() => buildTransactionExplorerUrl(props.explorerBaseUrl, txid));
</script>
