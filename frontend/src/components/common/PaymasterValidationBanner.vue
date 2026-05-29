<template>
  <section
    class="mb-6 rounded-[20px] border border-emerald-200 bg-white p-6 shadow-sm"
  >
    <div
      class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
    >
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
          {{
            t(
              `${i18nKeyPrefix}.paymasterValidationLabel`,
              "Live-Validated Paymaster Path",
            )
          }}
        </p>
        <p class="mt-2 text-lg font-semibold text-slate-950">
          {{
            t(
              `${i18nKeyPrefix}.paymasterValidationTitle`,
              "AA + Morpheus paymaster is verified on Neo N3 testnet",
            )
          }}
        </p>
        <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          {{
            t(
              `${i18nKeyPrefix}.paymasterValidationBody`,
              "The current workspace path has passed live validation for registerAccount, updateVerifier, remote allowlist update, paymaster authorization, relay submission, and on-chain executeUserOp execution.",
            )
          }}
        </p>
        <code
          class="mt-3 block break-all rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 text-xs font-medium text-emerald-200"
        >
          {{
            t(
              `${i18nKeyPrefix}.paymasterValidationTx`,
              `Latest full-path relay tx: ${txid}`,
            )
          }}
        </code>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-3">
        <router-link
          class="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors duration-200 hover:border-emerald-300 hover:bg-emerald-100"
          :to="{ path: '/docs', query: { doc: 'paymasterValidation' } }"
        >
          {{
            t(
              `${i18nKeyPrefix}.paymasterValidationLink`,
              "Open Validation Ledger",
            )
          }}
        </router-link>
        <a
          v-if="explorerUrl"
          class="inline-flex items-center rounded-md border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800"
          :href="explorerUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{
            t(
              `${i18nKeyPrefix}.paymasterValidationExplorer`,
              "Open Explorer Tx",
            )
          }}
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "@/i18n";
import { buildTransactionExplorerUrl } from "@/features/operations/explorer.js";
import { LATEST_PAYMASTER_VALIDATION_TXID } from "@/config/constants.js";

const props = defineProps({
  explorerBaseUrl: { type: String, default: "" },
  i18nKeyPrefix: { type: String, default: "sharedDraft" },
});

const { t } = useI18n();
const txid = LATEST_PAYMASTER_VALIDATION_TXID;
const explorerUrl = computed(() =>
  buildTransactionExplorerUrl(props.explorerBaseUrl, txid),
);
</script>
