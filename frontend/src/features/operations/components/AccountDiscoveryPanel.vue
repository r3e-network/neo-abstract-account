<template>
  <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-4">
      <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-neo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        Discover Your Accounts
      </h2>
      <p class="text-sm text-slate-500 mt-1">Find all accounts where you are an admin or manager</p>
    </div>

    <div class="space-y-3">
      <label class="space-y-1.5 text-sm">
        <span class="font-medium text-slate-700">Your Address</span>
        <div class="flex gap-2">
          <input v-model="searchAddress" class="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 focus:border-neo-500 focus:ring-2 focus:ring-neo-200 transition-all" placeholder="N... or 0x..." />
          <button class="rounded-xl bg-neo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!searchAddress || loading" @click="discover">
            <span v-if="loading">Searching...</span>
            <span v-else>Search</span>
          </button>
        </div>
      </label>

      <div v-if="error" class="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
        <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="text-sm text-red-900">{{ error }}</p>
      </div>

      <div v-if="results" class="space-y-3 mt-4">
        <div v-if="results.adminAccounts.length > 0" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            Admin Accounts ({{ results.adminAccounts.length }})
          </h3>
          <div class="space-y-2">
            <button v-for="(account, idx) in results.adminAccounts" :key="idx" class="w-full text-left rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-neo-300 hover:bg-neo-50 transition-all group" @click="$emit('select', account)">
              <div class="flex items-center justify-between">
                <span class="font-mono text-sm text-slate-900 group-hover:text-neo-700">{{ account }}</span>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-neo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </button>
          </div>
        </div>

        <div v-if="results.managerAccounts.length > 0" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            Manager Accounts ({{ results.managerAccounts.length }})
          </h3>
          <div class="space-y-2">
            <button v-for="(account, idx) in results.managerAccounts" :key="idx" class="w-full text-left rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-neo-300 hover:bg-neo-50 transition-all group" @click="$emit('select', account)">
              <div class="flex items-center justify-between">
                <span class="font-mono text-sm text-slate-900 group-hover:text-neo-700">{{ account }}</span>
                <svg class="w-4 h-4 text-slate-400 group-hover:text-neo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </button>
          </div>
        </div>

        <div v-if="results.adminAccounts.length === 0 && results.managerAccounts.length === 0" class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          <p class="text-sm font-medium text-slate-600">No accounts found</p>
          <p class="text-xs text-slate-500 mt-1">This address is not an admin or manager of any accounts</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

defineEmits(['select']);

const searchAddress = ref('');
const loading = ref(false);
const error = ref('');
const results = ref(null);

async function discover() {
  if (!searchAddress.value) return;
  
  loading.value = true;
  error.value = '';
  results.value = null;

  try {
    // TODO: Integrate with SDK
    // const client = new AbstractAccountClient(rpcUrl, contractHash);
    // const adminAccounts = await client.getAccountsByAdmin(searchAddress.value);
    // const managerAccounts = await client.getAccountsByManager(searchAddress.value);
    
    // Mock implementation for now
    await new Promise(resolve => setTimeout(resolve, 500));
    results.value = {
      adminAccounts: [],
      managerAccounts: [],
    };
  } catch (e) {
    error.value = e.message || 'Failed to discover accounts';
  } finally {
    loading.value = false;
  }
}
</script>
