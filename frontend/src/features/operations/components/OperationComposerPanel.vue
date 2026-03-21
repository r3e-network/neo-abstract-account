<template>
  <section class="glass-panel p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-white">{{ t('operations.composeTitle', 'Compose Operation') }}</h2>
        <p class="text-sm text-aa-muted">{{ t('operations.composeSubtitle', 'Build common AA wrapper payloads with presets, then stage an immutable draft.') }}</p>
      </div>
      <button class="btn-secondary" :disabled="!canStage" :aria-label="t('operations.ariaStageOperation', 'Stage operation')" :title="canStage ? '' : stageDisabledReason" @click="$emit('stage')">{{ t('operations.stageAction', 'Stage') }}</button>
    </div>

    <div v-if="!resolvedContractHash && !targetContract.trim() && preset !== 'nep17Transfer' && preset !== 'batchCreate'" class="empty-state mb-5">
      <svg aria-hidden="true" class="mx-auto mb-3 w-8 h-8 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      <p class="text-sm font-medium text-aa-text">{{ t('operations.composerEmptyTitle', 'Enter a contract hash above to begin composing an operation') }}</p>
      <p class="mt-1 text-xs text-aa-muted">{{ t('operations.composerEmptyHint', 'You can search by name, NNS address, or paste a script hash directly.') }}</p>
    </div>
    <div class="mb-5 grid gap-3 lg:grid-cols-4">
      <button
        v-for="option in presetOptions"
        :key="option.id"
        :aria-label="option.label"
        class="rounded-lg border p-4 text-left transition-all duration-200"
        :class="option.id === preset ? 'border-aa-orange bg-aa-orange/15 shadow-md ring-2 ring-aa-orange' : 'border-aa-border bg-aa-panel hover:border-aa-orange hover:shadow-sm'"
        @click="$emit('update:preset', option.id)"
      >
        <div class="flex items-start gap-2">
          <div class="flex-shrink-0 mt-0.5">
            <svg aria-hidden="true" v-if="option.id === 'invoke'" class="w-5 h-5 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
            <svg aria-hidden="true" v-else-if="option.id === 'nep17Transfer'" class="w-5 h-5 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            <svg aria-hidden="true" v-else-if="option.id === 'batchCreate'" class="w-5 h-5 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <svg aria-hidden="true" v-else class="w-5 h-5 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-aa-text">{{ option.label }}</div>
            <div class="mt-1 text-xs text-aa-muted line-clamp-2">{{ option.description }}</div>
          </div>
        </div>
      </button>
    </div>

    <div v-if="preset === 'nep17Transfer'" class="space-y-4">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1.5 text-sm" for="op-composer-token-script-hash">
          <span class="flex items-center gap-1.5 font-medium text-aa-text">
            <svg aria-hidden="true" class="w-4 h-4 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {{ t('operations.tokenScriptHashLabel', 'Token Script Hash') }}
          </span>
          <input id="op-composer-token-script-hash" :value="transferTokenScriptHash" class="input-field font-mono text-xs" :class="{ 'border-aa-error': nep17TransferErrors.transferTokenScriptHash }" :placeholder="t('operations.tokenScriptHashPlaceholder', '0x...')" @input="onTransferTokenInput" />
          <p v-if="nep17TransferErrors.transferTokenScriptHash" role="alert" class="text-xs text-aa-error mt-1">{{ nep17TransferErrors.transferTokenScriptHash }}</p>
        </label>
        <label class="space-y-1.5 text-sm" for="op-composer-transfer-recipient">
          <span class="flex items-center gap-1.5 font-medium text-aa-text">
            <svg aria-hidden="true" class="w-4 h-4 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            {{ t('operations.recipientLabel', 'Recipient Address / Hash') }}
          </span>
          <input id="op-composer-transfer-recipient" :value="transferRecipient" class="input-field" :class="{ 'border-aa-error': nep17TransferErrors.transferRecipient }" :placeholder="t('operations.recipientPlaceholder', 'N... or 0x...')" @input="onTransferRecipientInput" />
          <p v-if="nep17TransferErrors.transferRecipient" role="alert" class="text-xs text-aa-error mt-1">{{ nep17TransferErrors.transferRecipient }}</p>
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1.5 text-sm" for="op-composer-transfer-amount">
          <span class="flex items-center gap-1.5 font-medium text-aa-text">
            <svg aria-hidden="true" class="w-4 h-4 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
            {{ t('operations.amountLabel', 'Amount') }}
          </span>
          <input id="op-composer-transfer-amount" :value="transferAmount" type="number" class="input-field" :class="{ 'border-aa-error': nep17TransferErrors.transferAmount }" placeholder="0" @input="onTransferAmountInput" />
          <p v-if="nep17TransferErrors.transferAmount" role="alert" class="text-xs text-aa-error mt-1">{{ nep17TransferErrors.transferAmount }}</p>
        </label>
        <label class="space-y-1.5 text-sm" for="op-composer-transfer-data">
          <span class="flex items-center gap-1.5 font-medium text-aa-text">
            <svg aria-hidden="true" class="w-4 h-4 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
            {{ t('operations.dataLabel', 'Data (Optional)') }}
          </span>
          <input id="op-composer-transfer-data" :value="transferData" class="input-field" :placeholder="t('operations.dataPlaceholder', 'null or JSON')" @input="$emit('update:transferData', $event.target.value)" />
        </label>
      </div>
    </div>

    <div v-else-if="preset === 'batchCreate'" class="space-y-4">
      <div class="rounded-lg bg-aa-orange/10 border border-aa-orange/30 p-4">
        <div class="flex items-start gap-3">
          <svg aria-hidden="true" class="w-5 h-5 text-aa-orange flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div class="text-sm text-aa-orange">
            <p class="font-medium mb-1">{{ t('operations.batchAccountCreation', 'Batch Account Creation') }}</p>
            <p class="text-aa-orange/80">{{ t('operations.batchAccountCreationDesc', 'Create multiple accounts with shared governance in a single transaction. All accounts will have the same signer configuration.') }}</p>
          </div>
        </div>
      </div>

      <label class="space-y-1.5 text-sm" for="op-composer-batch-account-ids">
        <span class="flex items-center gap-1.5 font-medium text-aa-text">
          <svg aria-hidden="true" class="w-4 h-4 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          {{ t('operations.accountIds', 'Account IDs') }}
          <span class="text-xs text-aa-muted font-normal">{{ t('operations.accountIdsHint', '(JSON array of strings)') }}</span>
        </span>
        <textarea id="op-composer-batch-account-ids" :value="batchAccountIds" rows="3" class="input-field font-mono text-xs resize-none" :class="{ 'border-aa-error': batchCreateErrors.batchAccountIds }" :placeholder="t('operations.batchAccountIdsPlaceholder', '[&#34;alice-wallet&#34;, &#34;bob-wallet&#34;, &#34;charlie-wallet&#34;]')" @input="onBatchAccountIdsInput" />
        <p v-if="batchCreateErrors.batchAccountIds" role="alert" class="text-xs text-aa-error mt-1">{{ batchCreateErrors.batchAccountIds }}</p>
        <p v-else class="text-xs text-aa-muted mt-1">{{ t('operations.accountIdsDesc', 'Enter account IDs as a JSON array. Each ID will be created with the same governance settings.') }}</p>
      </label>

      <div class="border-t border-aa-border pt-4">
        <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <svg aria-hidden="true" class="w-4 h-4 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          {{ t('operations.signerConfig', 'Signer Configuration') }}
        </h3>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1.5 text-sm md:col-span-2" for="op-composer-batch-signers">
            <span class="font-medium text-aa-text">{{ t('operations.signerAddresses', 'Signer Addresses') }}</span>
            <textarea id="op-composer-batch-signers" :value="batchSigners" rows="2" class="input-field font-mono text-xs resize-none" :class="{ 'border-aa-error': batchCreateErrors.batchSigners }" :placeholder="t('operations.batchSignersPlaceholder', '[&#34;NXXXaddress1&#34;, &#34;0xhash2&#34;]')" @input="onBatchSignersInput" />
            <p v-if="batchCreateErrors.batchSigners" role="alert" class="text-xs text-aa-error mt-1">{{ batchCreateErrors.batchSigners }}</p>
            <p v-else class="text-xs text-aa-muted">{{ t('operations.signerAddressesHint', 'JSON array of Neo addresses or script hashes') }}</p>
          </label>
          <label class="space-y-1.5 text-sm" for="op-composer-batch-threshold">
            <span class="font-medium text-aa-text">{{ t('operations.signerThreshold', 'Signer Threshold') }}</span>
            <input id="op-composer-batch-threshold" :value="batchThreshold" type="number" min="1" class="input-field" @input="$emit('update:batchThreshold', $event.target.value)" />
            <p class="text-xs text-aa-muted">{{ t('operations.minSignatures', 'Minimum signatures required') }}</p>
          </label>
        </div>
      </div>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-3">
      <label v-if="preset === 'multisigDraft'" class="space-y-1.5 text-sm md:col-span-1" for="op-composer-multisig-title">
        <span class="font-medium text-aa-text">{{ t('operations.draftTitleLabel', 'Draft Title') }}</span>
        <input id="op-composer-multisig-title" :value="multisigTitle" class="input-field" @input="$emit('update:multisigTitle', $event.target.value)" />
      </label>
      <label v-if="preset === 'multisigDraft'" class="space-y-1.5 text-sm md:col-span-2" for="op-composer-multisig-description">
        <span class="font-medium text-aa-text">{{ t('operations.draftDescriptionLabel', 'Draft Description') }}</span>
        <input id="op-composer-multisig-description" :value="multisigDescription" class="input-field" @input="$emit('update:multisigDescription', $event.target.value)" />
      </label>
      <div class="space-y-2 text-sm md:col-span-2">
        <span id="target-contract-label" class="font-medium text-aa-text">{{ t('operations.targetContractLabel', 'Target Contract') }}</span>
        <input :value="targetContract" class="input-field font-mono text-xs" :class="{ 'border-aa-error': invokeErrors.targetContract }" aria-labelledby="target-contract-label" :placeholder="t('operations.targetContractPlaceholder', 'Contract hash, name, N address, alice.matrix, or app.neo')" @input="onTargetContractInput" />
        <p v-if="invokeErrors.targetContract" role="alert" class="text-xs text-aa-error mt-1">{{ invokeErrors.targetContract }}</p>
        <p v-else-if="contractLookupError" role="alert" class="text-xs text-aa-error">{{ contractLookupError }}</p>
        <p v-else-if="contractLookupStatus" role="status" aria-live="polite" class="text-xs text-aa-muted">{{ contractLookupStatus }}</p>
        <div v-if="resolvedContractHash" class="glass-panel px-3 py-2 text-xs text-aa-muted">
          <div class="font-semibold text-aa-text">{{ t('operations.resolvedContract', 'Resolved Contract') }}</div>
          <div class="font-mono">{{ resolvedContractName || t('operations.contract', 'Contract') }} · 0x{{ resolvedContractHash }}</div>
        </div>
        <div v-if="contractSuggestions.length > 0" class="glass-panel shadow-sm overflow-hidden">
          <button
            v-for="suggestion in contractSuggestions"
            :key="`${suggestion.contractHash}-${suggestion.displayName}`"
            :aria-label="suggestion.displayName"
            type="button"
            class="w-full border-b border-aa-border px-3 py-2 text-left last:border-b-0 hover:bg-aa-panel transition-colors duration-200"
            @click="$emit('select-contract-suggestion', suggestion)"
          >
            <div class="text-xs font-semibold text-aa-text">{{ suggestion.displayName }}</div>
            <div class="font-mono text-[11px] text-aa-muted">0x{{ suggestion.contractHash }}</div>
          </button>
        </div>
        <p v-if="targetContract.trim() && contractSuggestions.length === 0 && !resolvedContractHash && !contractLookupStatus && !contractLookupError" class="text-xs text-aa-muted px-3 py-2">{{ t('operations.noContractsFound', 'No matching contracts found yet.') }}</p>
      </div>
      <label class="space-y-1.5 text-sm md:col-span-1" for="op-composer-method">
        <span class="font-medium text-aa-text">{{ t('operations.methodLabel', 'Method') }}</span>
        <select id="op-composer-method" v-if="methodOptions.length" :value="method" class="input-field" :class="{ 'border-aa-error': invokeErrors.method }" @change="onMethodInput">
          <option value="">{{ t('operations.selectMethod', 'Select method') }}</option>
          <option v-for="option in methodOptions" :key="option.name" :value="option.name">{{ option.name }}</option>
        </select>
        <input id="op-composer-method" v-else :value="method" class="input-field" :class="{ 'border-aa-error': invokeErrors.method }" @input="onMethodInput" />
        <p v-if="invokeErrors.method" role="alert" class="text-xs text-aa-error mt-1">{{ invokeErrors.method }}</p>
      </label>
      <div v-if="parameterFields.length" class="grid gap-4 md:grid-cols-2 md:col-span-3">
        <label v-for="field in parameterFields" :key="field.key" class="space-y-1.5 text-sm" :for="'op-composer-param-' + field.key">
          <span class="font-medium text-aa-text">{{ field.name }} <span class="text-xs text-aa-muted">({{ field.type }})</span></span>
          <input v-if="!isBooleanField(field.type) && !isComplexField(field.type)" :id="'op-composer-param-' + field.key" :value="field.value" class="input-field font-mono text-xs" @input="$emit('update:parameterValue', { key: field.key, value: $event.target.value })" />
          <div v-else-if="isBooleanField(field.type)" class="flex items-center">
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-aa-orange focus:ring-offset-2 focus:ring-offset-aa-dark"
              :class="field.value ? 'bg-aa-orange' : 'bg-aa-dark'"
              @click="$emit('update:parameterValue', { key: field.key, value: !field.value })"
            >
              <span class="sr-only">{{ t('operations.toggleField', 'Toggle') }} {{ field.name }}</span>
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
                :class="field.value ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
            <span class="ml-3 text-sm text-aa-muted">{{ field.value ? t('operations.true', 'true') : t('operations.false', 'false') }}</span>
          </div>
          <textarea v-else :id="'op-composer-param-' + field.key" :value="field.value" rows="3" class="input-field font-mono text-xs resize-none" @input="$emit('update:parameterValue', { key: field.key, value: $event.target.value })" />
        </label>
      </div>
      <label v-if="!parameterFields.length" class="space-y-1.5 text-sm md:col-span-3" for="op-composer-args-json">
        <span class="font-medium text-aa-text">{{ t('operations.argsJsonLabel', 'Args JSON') }}</span>
        <textarea id="op-composer-args-json" :value="argsText" rows="4" class="input-field font-mono text-xs resize-none" :placeholder="argsPlaceholder" @input="$emit('update:argsText', $event.target.value)" @blur="validateArgsJson" />
        <p v-if="argsError" role="alert" class="text-xs text-aa-error mt-1">{{ argsError }}</p>
      </label>
    </div>

    <div class="mt-5 rounded-lg border border-aa-border bg-gradient-to-br from-aa-dark to-aa-panel px-4 py-3.5 shadow-sm">
      <div class="flex items-start gap-3">
        <svg aria-hidden="true" class="w-5 h-5 text-aa-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-aa-muted uppercase tracking-wide mb-1">{{ t('operations.presetSummaryLabel', 'Operation Summary') }}</p>
          <p class="text-sm font-medium text-aa-text">{{ summaryTitle }}</p>
          <p class="text-sm text-aa-muted mt-0.5">{{ summaryDetail }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, getCurrentInstance, ref } from 'vue';
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
  contractLookupError: { type: String, default: '' },
  resolvedContractHash: { type: String, default: '' },
  resolvedContractName: { type: String, default: '' },
  contractSuggestions: { type: Array, default: () => [] },
  methodOptions: { type: Array, default: () => [] },
  parameterFields: { type: Array, default: () => [] },
});

const { t } = useI18n();
const argsPlaceholder = t('operations.argsJsonPlaceholder', '[{"type":"String","value":"hello"}]');
const argsError = ref('');

function validateArgsJson() {
  const props = getCurrentInstance().props;
  const text = (props.argsText || '').trim();
  if (!text) { argsError.value = ''; return; }
  try { JSON.parse(text); argsError.value = ''; } catch { argsError.value = t('operations.invalidJson', 'Invalid JSON format'); }
}

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

// -- nep17Transfer validation --
const nep17TransferErrors = computed(() => {
  const props = getCurrentInstance().props;
  return {
    transferTokenScriptHash: !props.transferTokenScriptHash?.trim()
      ? t('operations.validationTokenRequired', 'Token script hash is required')
      : '',
    transferRecipient: !props.transferRecipient?.trim()
      ? t('operations.validationRecipientRequired', 'Recipient address is required')
      : '',
    transferAmount: !props.transferAmount || Number(props.transferAmount) <= 0
      ? t('operations.validationAmountPositive', 'Amount must be greater than 0')
      : '',
  };
});

const nep17TransferFieldsValid = computed(() => {
  const e = nep17TransferErrors.value;
  return !e.transferTokenScriptHash && !e.transferRecipient && !e.transferAmount;
});

// -- batchCreate validation --
const batchCreateErrors = computed(() => {
  const props = getCurrentInstance().props;
  let batchAccountIdsJsonError = '';
  let batchSignersJsonError = '';
  try {
    const parsed = JSON.parse(props.batchAccountIds || '[]');
    if (!Array.isArray(parsed)) batchAccountIdsJsonError = t('operations.validationJsonArray', 'Must be a valid JSON array');
  } catch {
    batchAccountIdsJsonError = t('operations.validationJsonArray', 'Must be a valid JSON array');
  }
  try {
    const parsed = JSON.parse(props.batchSigners || '[]');
    if (!Array.isArray(parsed)) batchSignersJsonError = t('operations.validationJsonArray', 'Must be a valid JSON array');
  } catch {
    batchSignersJsonError = t('operations.validationJsonArray', 'Must be a valid JSON array');
  }
  return {
    batchAccountIds: batchAccountIdsJsonError,
    batchSigners: batchSignersJsonError,
  };
});

const batchCreateFieldsValid = computed(() => {
  const e = batchCreateErrors.value;
  return !e.batchAccountIds && !e.batchSigners;
});

// -- invoke validation --
const invokeErrors = computed(() => {
  const props = getCurrentInstance().props;
  return {
    targetContract: !props.targetContract?.trim()
      ? t('operations.resolveContractBeforeStaging', 'Resolve or select a contract before staging the operation.')
      : '',
    method: !props.method?.trim()
      ? t('operations.pickMethodBeforeStaging', 'Pick a contract method before staging the operation.')
      : '',
  };
});

const invokeFieldsValid = computed(() => {
  const e = invokeErrors.value;
  return !e.targetContract && !e.method;
});

// -- canStage: gates the Stage button --
const canStage = computed(() => {
  const props = getCurrentInstance().props;
  if (props.preset === 'nep17Transfer') return nep17TransferFieldsValid.value;
  if (props.preset === 'batchCreate') return batchCreateFieldsValid.value;
  return invokeFieldsValid.value;
});

const stageDisabledReason = computed(() => {
  const props = getCurrentInstance().props;
  if (props.preset === 'nep17Transfer') {
    const e = nep17TransferErrors.value;
    return e.transferTokenScriptHash || e.transferRecipient || e.transferAmount || '';
  }
  if (props.preset === 'batchCreate') {
    const e = batchCreateErrors.value;
    return e.batchAccountIds || e.batchSigners || '';
  }
  const e = invokeErrors.value;
  return e.targetContract || e.method || '';
});

// -- Field interaction handlers --
function onTransferTokenInput(e) {
  getCurrentInstance().emit('update:transferTokenScriptHash', e.target.value);
}
function onTransferRecipientInput(e) {
  getCurrentInstance().emit('update:transferRecipient', e.target.value);
}
function onTransferAmountInput(e) {
  getCurrentInstance().emit('update:transferAmount', e.target.value);
}
function onBatchAccountIdsInput(e) {
  getCurrentInstance().emit('update:batchAccountIds', e.target.value);
}
function onBatchSignersInput(e) {
  getCurrentInstance().emit('update:batchSigners', e.target.value);
}
function onTargetContractInput(e) {
  getCurrentInstance().emit('update:targetContract', e.target.value);
}
function onMethodInput(e) {
  getCurrentInstance().emit('update:method', e.target.value);
}

function isBooleanField(type = '') {
  return String(type) === 'Boolean';
}

function isComplexField(type = '') {
  return ['Array', 'Map', 'Any'].includes(String(type));
}
</script>
