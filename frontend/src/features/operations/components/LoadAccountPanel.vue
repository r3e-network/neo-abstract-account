<template>
  <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-slate-900">{{ t('operations.loadAccountTitle', 'Load Abstract Account') }}</h2>
        <p class="text-sm text-slate-500">{{ t('operations.loadAccountSubtitle', 'Load a bound AA from an address, hash, or .matrix domain.') }}</p>
      </div>
      <button class="rounded-xl bg-neo-600 px-4 py-2 text-sm font-semibold text-white" @click="$emit('load')">{{ t('operations.loadAction', 'Load') }}</button>
    </div>
    <div class="space-y-4">
      <label class="block space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.boundAddressHashLabel', 'Abstract Account Address / Hash / .matrix') }}</span>
        <input :value="accountAddressScriptHash" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm placeholder:text-slate-400 focus:border-neo-500 focus:ring-neo-500" placeholder="N... or alice.matrix" @input="$emit('update:accountAddressScriptHash', $event.target.value)" />
      </label>
      <div v-if="resolvedOwnerAddress" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Resolved .matrix owner: <span class="font-mono">{{ resolvedOwnerAddress }}</span>
      </div>
      <div v-if="candidateAddresses.length > 1" class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Discovered Abstract Accounts</p>
        <button
          v-for="candidate in candidateAddresses"
          :key="candidate"
          class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left font-mono text-xs text-slate-700 hover:border-neo-400 hover:bg-neo-50"
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
  accountIdHex: { type: String, default: '' },
  accountAddressScriptHash: { type: String, default: '' },
  candidateAddresses: { type: Array, default: () => [] },
  resolvedOwnerAddress: { type: String, default: '' },
});
defineEmits(['load', 'update:accountIdHex', 'update:accountAddressScriptHash', 'select-address']);

const { t } = useI18n();
</script>
