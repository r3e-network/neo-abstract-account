<template>
  <section class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.signatureWorkflowTitle', 'Signature Workflow') }}</h2>
        <p class="text-sm text-biconomy-muted">{{ t('operations.signatureWorkflowSubtitle', 'Collect Neo and EVM approvals against one immutable shared draft.') }}</p>
      </div>
    </div>
    <div class="mb-5 rounded-lg border border-biconomy-border bg-biconomy-dark/50 p-4">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-bold uppercase tracking-widest text-biconomy-muted">Signature Progress</p>
        <p class="text-xs font-mono text-biconomy-muted">{{ signatureCount }} / {{ requiredSignerCount }} collected</p>
      </div>
      <div class="w-full bg-slate-700 rounded-full h-2">
        <div class="bg-neo-500 h-2 rounded-full transition-all duration-300" :style="{ width: requiredSignerCount > 0 ? Math.min(100, (signatureCount / requiredSignerCount) * 100) + '%' : '0%' }"></div>
      </div>
      <p v-if="signatureCount >= requiredSignerCount && requiredSignerCount > 0" class="mt-2 text-xs text-emerald-400 flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        All required signatures collected
      </p>
      <p v-else-if="requiredSignerCount === 0" class="mt-2 text-xs text-biconomy-muted">
        Stage an operation to see signature requirements
      </p>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="space-y-1 text-sm">
        <span class="font-medium text-biconomy-text">{{ t('operations.signerIdLabel', 'Signer ID') }}</span>
        <input :value="signerId" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 bg-biconomy-dark text-white font-mono text-sm" placeholder="N... address or 0x... for EVM" @input="$emit('update:signerId', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium text-biconomy-text">{{ t('operations.signerKindLabel', 'Signer Kind') }}</span>
        <select :value="signerKind" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 bg-biconomy-dark text-white" @change="$emit('update:signerKind', $event.target.value)">
          <option value="neo">Neo - Sign with NEO/GAS wallet</option>
          <option value="evm">EVM - Sign with MetaMask or similar</option>
        </select>
        <p class="text-xs text-biconomy-muted mt-1">Neo = NEO address, EVM = Ethereum-style address</p>
      </label>
    </div>
    <div class="mt-4">
      <label class="space-y-1 text-sm">
        <span class="font-medium text-biconomy-text">{{ t('operations.signatureHexLabel', 'Signature Hex') }}</span>
        <textarea :value="signatureHex" rows="3" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs bg-biconomy-dark resize-none" :class="signatureHex && !isValidHex(signatureHex) ? 'border-rose-500 focus:border-rose-400' : 'focus:border-biconomy-orange'" placeholder="Paste signature hex (e.g. 3045022100...)" @input="$emit('update:signatureHex', $event.target.value)"></textarea>
        <p v-if="signatureHex && !isValidHex(signatureHex)" class="text-xs text-rose-400 mt-1">Invalid hex format - signature should start with 3045...</p>
      </label>
    </div>
    <div class="mt-5 flex items-center justify-between gap-4">
      <p class="text-xs text-biconomy-muted">Or sign with your wallet:</p>
      <button class="rounded-lg bg-biconomy-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-biconomy-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!signatureHex || !isValidHex(signatureHex)" @click="$emit('append-signature')">{{ t('operations.appendManualSignature', 'Append Signature') }}</button>
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

function isValidHex(str) {
  return /^(0x)?[0-9a-fA-F]+$/.test(str) && str.length >= 64;
}
</script>
