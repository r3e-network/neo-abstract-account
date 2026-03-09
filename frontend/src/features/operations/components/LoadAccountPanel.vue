<template>
  <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-slate-900">{{ t('operations.loadAccountTitle', 'Load Abstract Account') }}</h2>
        <p class="text-sm text-slate-500">{{ t('operations.loadAccountSubtitle', 'Load a bound AA and derive both lookup and signer forms.') }}</p>
      </div>
      <button class="rounded-xl bg-neo-600 px-4 py-2 text-sm font-semibold text-white" @click="$emit('load')">{{ t('operations.loadAction', 'Load') }}</button>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.accountIdHexLabel', 'Account ID (hex)') }}</span>
        <input :value="accountIdHex" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:accountIdHex', $event.target.value)" />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium text-slate-700">{{ t('operations.boundAddressHashLabel', 'Bound Address Hash') }}</span>
        <input :value="accountAddressScriptHash" class="w-full rounded-xl border border-slate-300 px-3 py-2" @input="$emit('update:accountAddressScriptHash', $event.target.value)" />
      </label>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from '@/i18n';

defineProps({
  accountIdHex: { type: String, default: '' },
  accountAddressScriptHash: { type: String, default: '' },
});
defineEmits(['load', 'update:accountIdHex', 'update:accountAddressScriptHash']);

const { t } = useI18n();
</script>
