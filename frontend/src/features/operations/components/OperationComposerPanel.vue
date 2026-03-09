<template>
  <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-slate-900">{{ t('operations.composeTitle', 'Compose Operation') }}</h2>
        <p class="text-sm text-slate-500">{{ t('operations.composeSubtitle', 'Build common AA wrapper payloads with presets, then stage an immutable draft.') }}</p>
      </div>
      <button class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" @click="$emit('stage')">{{ t('operations.stageAction', 'Stage') }}</button>
    </div>

    <div class="mb-5 grid gap-3 lg:grid-cols-3">
      <button
        v-for="option in presetOptions"
        :key="option.id"
        class="rounded-2xl border p-4 text-left transition"
        :class="option.id === preset ? 'border-neo-400 bg-neo-50' : 'border-slate-200 bg-white hover:border-slate-300'"
        @click="$emit('update:preset', option.id)"
      >
        <div class="text-sm font-bold text-slate-900">{{ option.label }}</div>
        <div class="mt-1 text-xs text-slate-500">{{ option.description }}</div>
      </button>
    </div>

    <div v-if="preset === 'nep17Transfer'" class="grid gap-4 md:grid-cols-2">
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.tokenScriptHashLabel', 'Token Script Hash') }}</span>
        <input :value="transferTokenScriptHash" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs" @input="$emit('update:transferTokenScriptHash', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.recipientLabel', 'Recipient Address / Hash') }}</span>
        <input :value="transferRecipient" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:transferRecipient', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.amountLabel', 'Amount') }}</span>
        <input :value="transferAmount" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:transferAmount', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.dataLabel', 'Data JSON / Text') }}</span>
        <input :value="transferData" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:transferData', $event.target.value)" />
      </label>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-3">
      <label v-if="preset === 'multisigDraft'" class="space-y-1 text-sm md:col-span-1">
        <span class="font-medium text-slate-700">{{ t('operations.draftTitleLabel', 'Draft Title') }}</span>
        <input :value="multisigTitle" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:multisigTitle', $event.target.value)" />
      </label>
      <label v-if="preset === 'multisigDraft'" class="space-y-1 text-sm md:col-span-2">
        <span class="font-medium text-slate-700">{{ t('operations.draftDescriptionLabel', 'Draft Description') }}</span>
        <input :value="multisigDescription" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:multisigDescription', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm md:col-span-2">
        <span class="font-medium text-slate-700">{{ t('operations.targetContractLabel', 'Target Contract') }}</span>
        <input :value="targetContract" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs" @input="$emit('update:targetContract', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm md:col-span-1">
        <span class="font-medium text-slate-700">{{ t('operations.methodLabel', 'Method') }}</span>
        <input :value="method" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:method', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm md:col-span-3">
        <span class="font-medium text-slate-700">{{ t('operations.argsJsonLabel', 'Args JSON') }}</span>
        <textarea :value="argsText" rows="4" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs" @input="$emit('update:argsText', $event.target.value)" />
      </label>
    </div>

    <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <strong class="text-slate-900">{{ t('operations.presetSummaryLabel', 'Preset Summary:') }}</strong>
      {{ summaryTitle }} — {{ summaryDetail }}
    </div>
  </section>
</template>

<script setup>
import { useI18n } from '@/i18n';

defineProps({
  preset: { type: String, default: 'invoke' },
  presetOptions: { type: Array, default: () => [] },
  targetContract: { type: String, default: '' },
  method: { type: String, default: '' },
  argsText: { type: String, default: '[]' },
  transferTokenScriptHash: { type: String, default: '' },
  transferRecipient: { type: String, default: '' },
  transferAmount: { type: String, default: '' },
  transferData: { type: String, default: '' },
  multisigTitle: { type: String, default: '' },
  multisigDescription: { type: String, default: '' },
  summaryTitle: { type: String, default: '' },
  summaryDetail: { type: String, default: '' },
});

defineEmits([
  'stage',
  'update:preset',
  'update:targetContract',
  'update:method',
  'update:argsText',
  'update:transferTokenScriptHash',
  'update:transferRecipient',
  'update:transferAmount',
  'update:transferData',
  'update:multisigTitle',
  'update:multisigDescription',
]);

const { t } = useI18n();
</script>
