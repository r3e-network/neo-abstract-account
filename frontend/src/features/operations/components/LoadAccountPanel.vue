<template>
  <section class="rounded-lg border border-ata-border bg-ata-panel/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-mono font-bold text-white uppercase tracking-wider tracking-widest">{{ t('operations.loadAccountTitle', 'Load Abstract Account') }}</h2>
        <p class="text-sm text-slate-400">{{ t('operations.loadAccountSubtitle', 'Load a bound AA from an address, hash, or .matrix domain.') }}</p>
      </div>
      <button class="rounded-lg bg-ata-green px-4 py-2 text-sm font-semibold text-white" @click="$emit('load')">{{ t('operations.loadAction', 'Load') }}</button>
    </div>
    <div class="space-y-4">
      <label class="block space-y-1 text-sm">
        <span class="font-medium text-slate-300">{{ t('operations.boundAddressHashLabel', 'Abstract Account Address / Hash / .matrix') }}</span>
        <input :value="accountAddressScriptHash" class="w-full rounded-lg border border-ata-border px-3 py-2 font-mono text-sm placeholder:text-slate-400 focus:border-ata-green focus:ring-ata-green bg-ata-dark" placeholder="N... or alice.matrix" @input="$emit('update:accountAddressScriptHash', $event.target.value)" />
      </label>
      <div v-if="resolvedOwnerAddress" class="rounded-lg border border-ata-border bg-ata-panel px-3 py-2 text-xs text-slate-400">
        Resolved .matrix owner: <span class="font-mono">{{ resolvedOwnerAddress }}</span>
      </div>
      <div v-if="candidateAddresses.length > 1" class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Discovered Abstract Accounts</p>
        <button
          v-for="candidate in candidateAddresses"
          :key="candidate"
          class="w-full rounded-lg border border-ata-border bg-ata-panel px-3 py-2 text-left font-mono text-xs text-slate-300 hover:border-ata-green hover:bg-ata-green"
          @click="$emit('select-address', candidate)"
        >
          {{ candidate }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from '@/i18n';

defineProps({
  accountAddressScriptHash: { type: String, default: '' },
  candidateAddresses: { type: Array, default: () => [] },
  resolvedOwnerAddress: { type: String, default: '' },
});
defineEmits(['load', 'update:accountAddressScriptHash', 'select-address']);

const { t } = useI18n();
</script>
