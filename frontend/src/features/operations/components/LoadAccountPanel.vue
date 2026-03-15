<template>
  <section class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.loadAccountTitle', 'Load V3 Account') }}</h2>
        <p class="text-sm text-biconomy-muted">{{ t('operations.loadAccountSubtitle', 'Enter a deterministic account seed or 20-byte accountId hash. The virtual AA address is derived locally from that identity root.') }}</p>
      </div>
      <button class="rounded-lg bg-biconomy-orange px-4 py-2 text-sm font-semibold text-white" @click="$emit('load')">{{ t('operations.loadAction', 'Load') }}</button>
    </div>
    <div class="space-y-4">
      <label class="block space-y-1 text-sm">
        <span class="font-medium text-biconomy-text">{{ t('operations.boundAddressHashLabel', 'Account Seed / AccountId Hash') }}</span>
        <input :value="accountAddressScriptHash" class="w-full rounded-lg border border-biconomy-border px-3 py-2 font-mono text-sm placeholder:text-biconomy-muted focus:border-biconomy-orange focus:ring-biconomy-orange bg-biconomy-dark" placeholder="raw seed, pubkey, or 20-byte accountId hash" @input="$emit('update:accountAddressScriptHash', $event.target.value)" />
      </label>
      <div class="rounded-lg border border-biconomy-border bg-biconomy-panel px-3 py-2 text-xs text-biconomy-muted">
        V3 does not support reverse lookup from Neo addresses or legacy `.matrix` discovery. Load accounts from the original seed or the 20-byte `accountId` hash.
      </div>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from '@/i18n';

defineProps({
  accountAddressScriptHash: { type: String, default: '' },
});
defineEmits(['load', 'update:accountAddressScriptHash']);

const { t } = useI18n();
</script>
