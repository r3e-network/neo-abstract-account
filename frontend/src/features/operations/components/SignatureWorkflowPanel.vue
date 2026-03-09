<template>
  <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">{{ t('operations.signatureWorkflowTitle', 'Signature Workflow') }}</h2>
        <p class="text-sm text-slate-500">{{ t('operations.signatureWorkflowSubtitle', 'Collect Neo and EVM approvals against one immutable shared draft.') }}</p>
      </div>
      <button class="rounded-xl bg-neo-600 px-4 py-2 text-sm font-semibold text-white" @click="$emit('append-signature')">{{ t('operations.appendManualSignature', 'Append Manual Signature') }}</button>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.signerIdLabel', 'Signer ID') }}</span>
        <input :value="signerId" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:signerId', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.signerKindLabel', 'Signer Kind') }}</span>
        <select :value="signerKind" class="w-full rounded-xl border border-slate-300 px-3 py-2" @change="$emit('update:signerKind', $event.target.value)">
          <option value="neo">Neo</option>
          <option value="evm">EVM</option>
        </select>
      </label>
      <label class="space-y-1 text-sm md:col-span-1">
        <span class="font-medium text-slate-700">{{ t('operations.signatureHexLabel', 'Signature Hex') }}</span>
        <input :value="signatureHex" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs" @input="$emit('update:signatureHex', $event.target.value)" />
      </label>
    </div>
    <div class="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
      <div><strong>{{ t('operations.requiredSignersLabel', 'Required Signers:') }}</strong> {{ requiredSignerCount }}</div>
      <div><strong>{{ t('operations.collectedSignaturesLabel', 'Collected Signatures:') }}</strong> {{ signatureCount }}</div>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from '@/i18n';

defineProps({
  signerId: { type: String, default: '' },
  signerKind: { type: String, default: 'neo' },
  signatureHex: { type: String, default: '' },
  requiredSignerCount: { type: Number, default: 0 },
  signatureCount: { type: Number, default: 0 },
});
defineEmits(['append-signature', 'update:signerId', 'update:signerKind', 'update:signatureHex']);

const { t } = useI18n();
</script>
