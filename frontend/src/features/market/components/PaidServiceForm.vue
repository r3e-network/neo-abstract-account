<template>
  <div class="rounded-lg border border-aa-border bg-aa-dark/50 p-4 space-y-4">
    <p class="text-sm font-semibold text-aa-text">
      {{ t('market.vanityPaidTitle', 'Paid Vanity Service') }}
    </p>
    <p class="text-xs text-aa-muted leading-6">
      {{ t('market.vanityPaidDescription', 'Submit your pattern to our backend service. You pay GAS based on estimated computation time. 1 GAS covers ~2 hours. 80% refunded on timeout.') }}
    </p>

    <div class="rounded-lg border border-aa-border bg-aa-dark/50 p-3 space-y-2">
      <div class="flex justify-between text-sm">
        <span class="text-aa-muted">{{ t('market.vanityPattern', 'Pattern') }}</span>
        <span class="font-mono text-aa-text">{{ patternType }}: {{ pattern }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-aa-muted">{{ t('market.vanityCostEstimate', 'Cost estimate') }}</span>
        <span class="font-mono text-aa-warning">{{ costGAS }} GAS</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-aa-muted">{{ t('market.vanityTimeout', 'Timeout') }}</span>
        <span class="font-mono text-aa-text">{{ timeoutHours }}h</span>
      </div>
    </div>

    <div class="rounded-lg border border-aa-warning/20 bg-aa-warning/5 p-3">
      <p class="text-xs text-aa-warning leading-5">
        {{ t('market.vanityRefundPolicy', '80% of GAS is refunded if the service times out before finding a match. Remaining 20% covers server costs.') }}
      </p>
    </div>

    <button
      type="button"
      class="btn-primary w-full"
      :class="{ 'btn-loading': submitting }"
      :disabled="!canSubmit || submitting"
      :aria-label="t('market.ariaSubmitOrder', 'Submit order')"
      @click="$emit('submit')"
    >
      {{ submitting
        ? t('market.vanityOrderPending', 'Processing...')
        : `${t('market.vanityPayAndStart', 'Pay & Start')} (${costGAS} GAS)` }}
    </button>

    <p class="text-xs text-aa-muted text-center">
      {{ t('market.vanityGasRate', 'Rate: 1 GAS = 2 hours of computation') }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '@/i18n';
import { estimateCostGAS } from '@/utils/vanityDifficulty.js';

const props = defineProps({
  pattern: { type: String, default: '' },
  patternType: { type: String, default: 'prefix' },
  difficultySeconds: { type: Number, default: 0 },
  submitting: { type: Boolean, default: false },
});

defineEmits(['submit']);

const { t } = useI18n();

const costGAS = computed(() => {
  if (!props.difficultySeconds) return '0.01';
  const cost = estimateCostGAS(props.difficultySeconds);
  return Math.max(cost, 0.01).toFixed(2);
});

const timeoutHours = computed(() => {
  const cost = parseFloat(costGAS.value);
  return Math.max(cost * 2, 2).toFixed(0);
});

const canSubmit = computed(() => Boolean(props.pattern.trim()));
</script>
