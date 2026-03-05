<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in-up">
    <div class="relative bg-white/80 backdrop-blur-xl shadow-2xl shadow-neo-500/10 rounded-3xl overflow-hidden border border-slate-200/60 p-8 sm:p-12 text-center">
      
      <!-- Decorative background blur -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-neo-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

      <div class="relative z-10">
        <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-green-50 mb-6 shadow-inner border border-green-200">
          <svg class="h-10 w-10 text-green-500 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight mb-3">
          Transaction Submitted
        </h1>
        
        <p class="text-base text-slate-500 mb-10 max-w-lg mx-auto leading-relaxed">
          Your transaction has been securely broadcast to the Neo N3 network. Depending on network congestion, it will be confirmed in the next block.
        </p>
        
        <div class="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 mb-10 inline-block mx-auto max-w-full shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Hash</p>
            <button @click="copyHash" class="text-xs font-semibold text-neo-600 hover:text-neo-800 transition-colors bg-neo-50 px-2 py-1 rounded">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <code class="block text-sm sm:text-base font-mono text-slate-800 break-all bg-white border border-slate-200 p-4 rounded-xl shadow-inner select-all">
            {{ txid }}
          </code>
        </div>
        
        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <RouterLink to="/studio" class="btn-secondary py-3 px-6 text-base w-full sm:w-auto flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Studio
          </RouterLink>
          
          <a :href="`https://testnet.ndoras.com/transaction/${txid}`" target="_blank" rel="noopener noreferrer" class="btn-primary py-3 px-6 text-base w-full sm:w-auto flex items-center justify-center gap-2">
            View in Explorer
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  txid: {
    type: String,
    default: ''
  }
});

const copied = ref(false);

function copyHash() {
  if (!props.txid) return;
  navigator.clipboard.writeText(props.txid).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}
</script>