<template>
  <section class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.composeTitle', 'Compose Operation') }}</h2>
        <p class="text-sm text-biconomy-muted">{{ t('operations.composeSubtitle', 'Build common AA wrapper payloads with presets, then stage an immutable draft.') }}</p>
      </div>
      <button class="rounded-lg bg-biconomy-dark px-4 py-2 text-sm font-semibold text-white hover:bg-biconomy-panel transition-colors" @click="$emit('stage')">{{ t('operations.stageAction', 'Stage') }}</button>
    </div>

    <div class="mb-5 grid gap-3 lg:grid-cols-4">
      <button
        v-for="option in presetOptions"
        :key="option.id"
        class="rounded-lg border p-4 text-left transition-all duration-200"
        :class="option.id === preset ? 'border-biconomy-orange bg-biconomy-orange shadow-md ring-2 ring-biconomy-orange' : 'border-biconomy-border bg-biconomy-panel hover:border-biconomy-orange hover:shadow-sm'"
        @click="$emit('update:preset', option.id)"
      >
        <div class="flex items-start gap-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg v-if="option.id === 'invoke'" class="w-5 h-5 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            <svg v-else-if="option.id === 'nep17Transfer'" class="w-5 h-5 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            <svg v-else-if="option.id === 'batchCreate'" class="w-5 h-5 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <svg v-else class="w-5 h-5 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-white">{{ option.label }}</div>
            <div class="mt-1 text-xs text-biconomy-muted line-clamp-2">{{ option.description }}</div>
          </div>
        </div>
      </button>
    </div>

    <div v-if="preset === 'nep17Transfer'" class="space-y-4">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1.5 text-sm">
          <span class="flex items-center gap-1.5 font-medium text-biconomy-text">
            <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {{ t('operations.tokenScriptHashLabel', 'Token Script Hash') }}
          </span>
          <input :value="transferTokenScriptHash" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark" placeholder="0x..." @input="$emit('update:transferTokenScriptHash', $event.target.value)" />
        </label>
        <label class="space-y-1.5 text-sm">
          <span class="flex items-center gap-1.5 font-medium text-biconomy-text">
            <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            {{ t('operations.recipientLabel', 'Recipient Address / Hash') }}
          </span>
          <input :value="transferRecipient" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" placeholder="N... or 0x..." @input="$emit('update:transferRecipient', $event.target.value)" />
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1.5 text-sm">
          <span class="flex items-center gap-1.5 font-medium text-biconomy-text">
            <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
            {{ t('operations.amountLabel', 'Amount') }}
          </span>
          <input :value="transferAmount" type="number" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" placeholder="0" @input="$emit('update:transferAmount', $event.target.value)" />
        </label>
        <label class="space-y-1.5 text-sm">
          <span class="flex items-center gap-1.5 font-medium text-biconomy-text">
            <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
            {{ t('operations.dataLabel', 'Data (Optional)') }}
          </span>
          <input :value="transferData" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" placeholder="null or JSON" @input="$emit('update:transferData', $event.target.value)" />
        </label>
      </div>
    </div>

    <div v-else-if="preset === 'batchCreate'" class="space-y-4">
      <div class="rounded-lg bg-biconomy-orange border border-biconomy-orange p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-biconomy-orange flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div class="text-sm text-biconomy-orange">
            <p class="font-medium mb-1">Batch Account Creation</p>
            <p class="text-biconomy-orange">Create multiple accounts with shared governance in a single transaction. All accounts will have the same signer configuration.</p>
          </div>
        </div>
      </div>

      <label class="space-y-1.5 text-sm">
        <span class="flex items-center gap-1.5 font-medium text-biconomy-text">
          <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Account IDs
          <span class="text-xs text-biconomy-muted font-normal">(JSON array of strings)</span>
        </span>
        <textarea :value="batchAccountIds" rows="3" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all resize-none bg-biconomy-dark" placeholder='["alice-wallet", "bob-wallet", "charlie-wallet"]' @input="$emit('update:batchAccountIds', $event.target.value)" />
        <p class="text-xs text-biconomy-muted mt-1">Enter account IDs as a JSON array. Each ID will be created with the same governance settings.</p>
      </label>

      <div class="border-t border-biconomy-border pt-4">
        <h3 class="text-sm font-mono font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2 tracking-widest">
          <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          Signer Configuration
        </h3>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1.5 text-sm md:col-span-2">
            <span class="font-medium text-biconomy-text">Signer Addresses</span>
            <textarea :value="batchSigners" rows="2" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all resize-none bg-biconomy-dark" placeholder='["NXXXaddress1", "0xhash2"]' @input="$emit('update:batchSigners', $event.target.value)" />
            <p class="text-xs text-biconomy-muted">JSON array of Neo addresses or script hashes</p>
          </label>
          <label class="space-y-1.5 text-sm">
            <span class="font-medium text-biconomy-text">Signer Threshold</span>
            <input :value="batchThreshold" type="number" min="1" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" @input="$emit('update:batchThreshold', $event.target.value)" />
            <p class="text-xs text-biconomy-muted">Minimum signatures required</p>
          </label>
        </div>
      </div>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-3">
      <label v-if="preset === 'multisigDraft'" class="space-y-1.5 text-sm md:col-span-1">
        <span class="font-medium text-biconomy-text">{{ t('operations.draftTitleLabel', 'Draft Title') }}</span>
        <input :value="multisigTitle" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" @input="$emit('update:multisigTitle', $event.target.value)" />
      </label>
      <label v-if="preset === 'multisigDraft'" class="space-y-1.5 text-sm md:col-span-2">
        <span class="font-medium text-biconomy-text">{{ t('operations.draftDescriptionLabel', 'Draft Description') }}</span>
        <input :value="multisigDescription" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" @input="$emit('update:multisigDescription', $event.target.value)" />
      </label>
      <div class="space-y-2 text-sm md:col-span-2">
        <span class="font-medium text-biconomy-text">{{ t('operations.targetContractLabel', 'Target Contract') }}</span>
        <input :value="targetContract" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark" placeholder="Contract hash, name, N address, alice.matrix, or app.neo" @input="$emit('update:targetContract', $event.target.value)" />
        <p v-if="contractLookupStatus" class="text-xs text-biconomy-muted">{{ contractLookupStatus }}</p>
        <div v-if="resolvedContractHash" class="rounded-lg border border-biconomy-border bg-biconomy-panel px-3 py-2 text-xs text-biconomy-muted">
          <div class="font-semibold text-biconomy-text">Resolved Contract</div>
          <div class="font-mono">{{ resolvedContractName || 'Contract' }} · 0x{{ resolvedContractHash }}</div>
        </div>
        <div v-if="contractSuggestions.length > 0" class="rounded-lg border border-biconomy-border bg-biconomy-panel shadow-sm overflow-hidden">
          <button
            v-for="suggestion in contractSuggestions"
            :key="`${suggestion.contractHash}-${suggestion.displayName}`"
            type="button"
            class="w-full border-b border-biconomy-border px-3 py-2 text-left last:border-b-0 hover:bg-biconomy-panel"
            @click="$emit('select-contract-suggestion', suggestion)"
          >
            <div class="text-xs font-semibold text-biconomy-text">{{ suggestion.displayName }}</div>
            <div class="font-mono text-[11px] text-biconomy-muted">0x{{ suggestion.contractHash }}</div>
          </button>
        </div>
      </div>
      <label class="space-y-1.5 text-sm md:col-span-1">
        <span class="font-medium text-biconomy-text">{{ t('operations.methodLabel', 'Method') }}</span>
        <select v-if="methodOptions.length" :value="method" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" @change="$emit('update:method', $event.target.value)">
          <option value="">Select method</option>
          <option v-for="option in methodOptions" :key="option.name" :value="option.name">{{ option.name }}</option>
        </select>
        <input v-else :value="method" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" @input="$emit('update:method', $event.target.value)" />
      </label>
      <div v-if="parameterFields.length" class="grid gap-4 md:grid-cols-2 md:col-span-3">
        <label v-for="field in parameterFields" :key="field.key" class="space-y-1.5 text-sm">
          <span class="font-medium text-biconomy-text">{{ field.name }} <span class="text-xs text-biconomy-muted">({{ field.type }})</span></span>
          <input v-if="!isBooleanField(field.type) && !isComplexField(field.type)" :value="field.value" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark" @input="$emit('update:parameterValue', { key: field.key, value: $event.target.value })" />
          <select v-else-if="isBooleanField(field.type)" :value="String(field.value)" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all bg-biconomy-dark text-white" @change="$emit('update:parameterValue', { key: field.key, value: $event.target.value === 'true' })">
            <option value="false">false</option>
            <option value="true">true</option>
          </select>
          <textarea v-else :value="field.value" rows="3" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all resize-none bg-biconomy-dark" @input="$emit('update:parameterValue', { key: field.key, value: $event.target.value })" />
        </label>
      </div>
      <label class="space-y-1.5 text-sm md:col-span-3">
        <span class="font-medium text-biconomy-text">{{ t('operations.argsJsonLabel', 'Args JSON') }}</span>
        <textarea :value="argsText" rows="4" class="w-full rounded-lg border border-biconomy-border px-3 py-2.5 font-mono text-xs focus:border-biconomy-orange focus:ring-2 focus:ring-biconomy-orange transition-all resize-none bg-biconomy-dark" @input="$emit('update:argsText', $event.target.value)" />
      </label>
    </div>

    <div class="mt-5 rounded-lg border border-biconomy-border bg-gradient-to-br from-ata-dark to-ata-panel px-4 py-3.5 shadow-sm">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-biconomy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-biconomy-muted uppercase tracking-wide mb-1">{{ t('operations.presetSummaryLabel', 'Operation Summary') }}</p>
          <p class="text-sm font-medium text-white">{{ summaryTitle }}</p>
          <p class="text-sm text-biconomy-muted mt-0.5">{{ summaryDetail }}</p>
        </div>
      </div>
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
  batchAccountIds: { type: String, default: '[]' },
  batchSigners: { type: String, default: '[]' },
  batchThreshold: { type: String, default: '1' },
  summaryTitle: { type: String, default: '' },
  summaryDetail: { type: String, default: '' },
  contractLookupStatus: { type: String, default: '' },
  resolvedContractHash: { type: String, default: '' },
  resolvedContractName: { type: String, default: '' },
  contractSuggestions: { type: Array, default: () => [] },
  methodOptions: { type: Array, default: () => [] },
  parameterFields: { type: Array, default: () => [] },
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
  'update:batchAccountIds',
  'update:batchSigners',
  'update:batchThreshold',
  'select-contract-suggestion',
  'update:parameterValue',
]);

const { t } = useI18n();

function isBooleanField(type = '') {
  return String(type) === 'Boolean';
}

function isComplexField(type = '') {
  return ['Array', 'Map', 'Any'].includes(String(type));
}
</script>
