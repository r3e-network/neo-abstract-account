<template>
  <section class="glass-panel p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-white">{{ t('operations.loadAccountTitle', 'Load V3 Account') }}</h2>
        <p class="text-sm text-aa-muted">{{ t('operations.loadAccountSubtitle', 'Enter a deterministic account seed or 20-byte accountId hash. The virtual AA address is derived locally from that identity root.') }}</p>
        <p class="mt-1 text-xs text-aa-muted">{{ t('operations.loadAccountHelp', 'Enter the 64-char seed from account registration, or the 40-char accountId hash.') }}</p>
      </div>
      <button class="btn-primary" :class="{ 'btn-loading': loading }" :disabled="!canLoad" @click="$emit('load')">
        <svg v-if="loading" aria-hidden="true" class="animate-spin -ml-1 mr-2 h-4 w-4 text-aa-text inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        {{ loading ? t('operations.loadingAction', 'Loading…') : t('operations.loadAction', 'Load') }}
      </button>
    </div>
    <div class="space-y-4">
      <label class="block space-y-1 text-sm" for="load-account-seed">
        <span class="font-medium text-aa-text">{{ t('operations.boundAddressHashLabel', 'Account Seed / AccountId Hash') }}</span>
        <input
          id="load-account-seed"
          :value="accountAddressScriptHash"
          class="input-field w-full font-mono"
          :class="validationError ? '!border-aa-error' : ''"
          :placeholder="t('operations.accountSeedPlaceholder', 'e.g. 02a7...3f9c or 40-char hex seed')"
          @input="$emit('update:accountAddressScriptHash', $event.target.value)"
        />
        <div v-if="detectedFormat" class="mt-1.5">
          <span class="badge-blue">{{ detectedFormat }}</span>
        </div>
        <p v-if="validationError" role="alert" class="text-xs text-aa-error mt-1">{{ validationError }}</p>
      </label>
      <div class="glass-panel px-3 py-2 text-xs text-aa-muted space-y-1">
        <p class="font-medium text-aa-text">{{ t('operations.supportedFormatsTitle', 'Supported formats:') }}</p>
        <ul class="list-disc list-inside space-y-0.5 text-aa-muted">
          <li><code class="font-mono text-neo-300">{{ t('operations.formatLabel64CharHex', '64-char hex') }}</code> — {{ t('operations.format64CharHex', 'EVM private key or session seed') }}</li>
          <li><code class="font-mono text-neo-300">{{ t('operations.formatLabel40CharHex', '40-char hex') }}</code> — {{ t('operations.format40CharHex', 'Pre-derived accountId hash') }}</li>
          <li><code class="font-mono text-neo-300">{{ t('operations.formatLabelNeoAddress', 'NEO address') }}</code> — {{ t('operations.formatNeoAddress', 'Legacy bound address (reverse lookup not supported)') }}</li>
          <li><code class="font-mono text-neo-300">.matrix</code> — {{ t('operations.formatMatrixDomain', 'Registration-only naming surface; V3 reverse discovery is not supported here.') }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '@/i18n';

const props = defineProps({
  accountAddressScriptHash: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});
defineEmits(['load', 'update:accountAddressScriptHash']);

const { t } = useI18n();

const HEX_RE = /^[0-9a-fA-F]+$/;
const NEO_ADDRESS_RE = /^N[0-9a-zA-Z]{33}$/;

const detectedFormat = computed(() => {
  const raw = props.accountAddressScriptHash.trim();
  if (!raw) return '';
  if (raw.startsWith('0x') || raw.startsWith('0X')) {
    const hex = raw.slice(2);
    if (hex.length === 40 && HEX_RE.test(hex)) return t('operations.formatDetected0xHash', '0x-prefixed hash');
    if (hex.length === 64 && HEX_RE.test(hex)) return t('operations.formatDetected0xSeed', '0x-prefixed seed');
    return '';
  }
  if (raw.length === 64 && HEX_RE.test(raw)) return t('operations.formatDetectedRawSeed', 'Raw hex seed');
  if (raw.length === 40 && HEX_RE.test(raw)) return t('operations.formatDetectedAccountId', 'Account ID hash');
  if (NEO_ADDRESS_RE.test(raw)) return t('operations.formatDetectedNeoAddress', 'NEO address');
  return '';
});

const validationError = computed(() => {
  const raw = props.accountAddressScriptHash.trim();
  if (!raw) return '';
  if (raw.startsWith('0x') || raw.startsWith('0X')) {
    const hex = raw.slice(2);
    if (hex.length > 0 && !HEX_RE.test(hex)) return t('operations.invalidHexChars', 'Contains non-hexadecimal characters');
    if (hex.length > 0 && hex.length !== 40 && hex.length !== 64) return t('operations.invalidHexLength', 'Expected 40 or 64 hex characters after 0x');
    return '';
  }
  if (/^[0-9a-fA-F]+$/.test(raw)) {
    if (raw.length !== 40 && raw.length !== 64) return t('operations.invalidHexLength', 'Expected 40 or 64 hex characters');
    return '';
  }
  if (/^N/.test(raw) && !NEO_ADDRESS_RE.test(raw)) return t('operations.invalidNeoAddress', 'Invalid NEO address format');
  if (!NEO_ADDRESS_RE.test(raw)) return t('operations.unrecognizedFormat', 'Unrecognized format');
  return '';
});

const canLoad = computed(() => {
  return props.accountAddressScriptHash.trim() !== '' && !props.loading && !validationError.value;
});
</script>
