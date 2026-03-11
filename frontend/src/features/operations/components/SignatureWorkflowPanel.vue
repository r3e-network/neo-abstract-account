<template>
  <section class="rounded-lg border border-ata-border bg-ata-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.signatureWorkflowTitle', 'Signature Workflow') }}</h2>
        <p class="text-sm text-slate-400">{{ t('operations.signatureWorkflowSubtitle', 'Collect Neo and EVM approvals against one immutable shared draft.') }}</p>
      </div>
      <button class="rounded-lg bg-ata-green px-4 py-2 text-sm font-semibold text-white" @click="$emit('append-signature')">{{ t('operations.appendManualSignature', 'Append Manual Signature') }}</button>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-300">{{ t('operations.signerIdLabel', 'Signer ID') }}</span>
        <input :value="signerId" class="w-full rounded-lg border border-ata-border px-3 py-2 bg-ata-dark text-white" @input="$emit('update:signerId', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-300">{{ t('operations.signerKindLabel', 'Signer Kind') }}</span>
        <select :value="signerKind" class="w-full rounded-lg border border-ata-border px-3 py-2 bg-ata-dark text-white" @change="$emit('update:signerKind', $event.target.value)">
          <option value="neo">Neo</option>
          <option value="evm">EVM</option>
        </select>
      </label>
      <label class="space-y-1 text-sm md:col-span-1">
        <span class="font-medium text-slate-300">{{ t('operations.signatureHexLabel', 'Signature Hex') }}</span>
        <input :value="signatureHex" class="w-full rounded-lg border border-ata-border px-3 py-2 font-mono text-xs bg-ata-dark" @input="$emit('update:signatureHex', $event.target.value)" />
      </label>
    </div>
    <div class="mt-4 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
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
