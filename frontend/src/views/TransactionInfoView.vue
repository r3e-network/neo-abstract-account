<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="bg-white shadow sm:rounded-lg overflow-hidden border border-slate-200">
      <div class="px-4 py-5 sm:p-6 text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-neo-100 mb-4">
          <svg class="h-6 w-6 text-neo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Transaction Submitted</h1>
        <p class="text-sm text-slate-500 mb-6">Your transaction has been submitted to the network. You can view the details using the hash below.</p>
        
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 inline-block mx-auto max-w-full">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-left">Transaction Hash</p>
          <code class="block text-sm font-mono text-slate-800 break-all bg-white border border-slate-200 p-3 rounded">{{ txid }}</code>
        </div>
        
        <div class="flex justify-center gap-4">
          <RouterLink to="/studio" class="btn-secondary">
            Return to Studio
          </RouterLink>
          <a :href="`https://testnet.ndoras.com/transaction/${txid}`" target="_blank" rel="noopener noreferrer" class="btn-primary">
            View in Explorer
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  txid: {
    type: String,
    default: ''
  }
});
</script>
