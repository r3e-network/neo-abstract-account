<template>
  <div class="space-y-4">
    <div class="rounded-lg bg-aa-orange/10 border border-aa-orange/30 p-4">
      <div class="flex items-start gap-3">
        <svg
          aria-hidden="true"
          class="w-5 h-5 text-aa-orange flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div class="text-sm text-aa-orange">
          <p class="font-medium mb-1">
            {{ t("operations.batchAccountCreation", "Batch Account Creation") }}
          </p>
          <p class="text-aa-orange/80">
            {{
              t(
                "operations.batchAccountCreationDesc",
                "Create multiple accounts with shared governance in a single transaction. All accounts will have the same signer configuration.",
              )
            }}
          </p>
        </div>
      </div>
    </div>

    <label class="space-y-1.5 text-sm" for="op-composer-batch-account-ids">
      <span class="flex items-center gap-1.5 font-medium text-aa-text">
        <svg
          aria-hidden="true"
          class="w-4 h-4 text-aa-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          ></path>
        </svg>
        {{ t("operations.accountIds", "Account IDs") }}
        <span class="text-xs text-aa-muted font-normal">{{
          t("operations.accountIdsHint", "(JSON array of strings)")
        }}</span>
      </span>
      <textarea
        id="op-composer-batch-account-ids"
        :value="batchAccountIds"
        rows="3"
        class="input-field font-mono text-xs resize-none"
        :class="{ 'border-aa-error': errors.batchAccountIds }"
        :placeholder="
          t(
            'operations.batchAccountIdsPlaceholder',
            '[&#34;alice-wallet&#34;, &#34;bob-wallet&#34;, &#34;charlie-wallet&#34;]',
          )
        "
        @input="$emit('update:batchAccountIds', $event.target.value)"
      />
      <p
        v-if="errors.batchAccountIds"
        role="alert"
        class="text-xs text-aa-error mt-1"
      >
        {{ errors.batchAccountIds }}
      </p>
      <p v-else class="text-xs text-aa-muted mt-1">
        {{
          t(
            "operations.accountIdsDesc",
            "Enter account IDs as a JSON array. Each ID will be created with the same governance settings.",
          )
        }}
      </p>
    </label>

    <div class="border-t border-aa-border pt-4">
      <h3 class="text-sm font-semibold text-aa-text mb-3 flex items-center gap-2">
        <svg
          aria-hidden="true"
          class="w-4 h-4 text-aa-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          ></path>
        </svg>
        {{ t("operations.signerConfig", "Signer Configuration") }}
      </h3>
      <div class="grid gap-4 md:grid-cols-2">
        <label
          class="space-y-1.5 text-sm md:col-span-2"
          for="op-composer-batch-signers"
        >
          <span class="font-medium text-aa-text">{{
            t("operations.signerAddresses", "Signer Addresses")
          }}</span>
          <textarea
            id="op-composer-batch-signers"
            :value="batchSigners"
            rows="2"
            class="input-field font-mono text-xs resize-none"
            :class="{ 'border-aa-error': errors.batchSigners }"
            :placeholder="
              t(
                'operations.batchSignersPlaceholder',
                '[&#34;NXXXaddress1&#34;, &#34;0xhash2&#34;]',
              )
            "
            @input="$emit('update:batchSigners', $event.target.value)"
          />
          <p
            v-if="errors.batchSigners"
            role="alert"
            class="text-xs text-aa-error mt-1"
          >
            {{ errors.batchSigners }}
          </p>
          <p v-else class="text-xs text-aa-muted">
            {{
              t(
                "operations.signerAddressesHint",
                "JSON array of Neo addresses or script hashes",
              )
            }}
          </p>
        </label>
        <label class="space-y-1.5 text-sm" for="op-composer-batch-threshold">
          <span class="font-medium text-aa-text">{{
            t("operations.signerThreshold", "Signer Threshold")
          }}</span>
          <input
            id="op-composer-batch-threshold"
            :value="batchThreshold"
            type="number"
            min="1"
            class="input-field"
            @input="$emit('update:batchThreshold', $event.target.value)"
          />
          <p class="text-xs text-aa-muted">
            {{ t("operations.minSignatures", "Minimum signatures required") }}
          </p>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

defineProps({
  batchAccountIds: { type: String, default: "[]" },
  batchSigners: { type: String, default: "[]" },
  batchThreshold: { type: String, default: "1" },
  errors: { type: Object, default: () => ({}) },
});

defineEmits([
  "update:batchAccountIds",
  "update:batchSigners",
  "update:batchThreshold",
]);

const { t } = useI18n();
</script>
