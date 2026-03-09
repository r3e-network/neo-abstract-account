<template>
  <section class="bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden border border-slate-200/60 p-6 sm:p-8">
    <h2 class="text-xl font-bold text-slate-900 mb-2">{{ t('studioPanels.permissionsTitle', 'Permissions & Limits') }}</h2>
    <p class="text-sm text-slate-500 mb-8">Manage whitelists, blacklists, execution limits, and custom contract verifiers.</p>

    <div class="space-y-8">
      <div class="bg-slate-50 p-5 rounded-xl border border-slate-200/60">
        <label class="block text-sm font-semibold text-slate-800 mb-3">Target Account Address (Neo N3)</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            v-model="permissionsForm.accountAddress"
            type="text"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4"
            placeholder="N..."
          />
        </div>
        <p class="mt-2 text-xs text-slate-500">Required for all actions below.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Custom Verifier -->
        <div class="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-slate-900 mb-5">Custom Verifier Contract</h3>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Verifier Hash / Address</label>
            <input v-model="permissionsForm.verifierContract" type="text" class="input-field text-sm font-mono py-2 px-3" placeholder="Leave empty to clear..." />
          </div>
          <div class="mt-auto border-t border-slate-100 pt-5">
            <button type="button" class="btn-primary w-full" :disabled="permissionsBusy.verifier || !canManagePermissions" @click="setVerifierContractByAddress">
              {{ permissionsBusy.verifier ? 'Updating...' : 'Set Custom Verifier' }}
            </button>
            <p class="mt-3 text-xs text-slate-500 text-center">Overrides native multisig validation logic with a custom Neo contract.</p>
          </div>
        </div>

        <!-- Token Limits -->
        <div class="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-slate-900 mb-5">Token Transfer Limit</h3>
          <div class="space-y-4 mb-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Token Address</label>
              <input v-model="permissionsForm.limitToken" type="text" class="input-field text-sm font-mono py-2 px-3" placeholder="N..." />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Max Amount per Transfer</label>
              <input v-model.number="permissionsForm.limitAmount" type="number" min="0" class="input-field text-sm py-2 px-3" placeholder="e.g. 1000000" />
              <p class="text-[11px] text-slate-500 mt-1">Set to 0 to remove the limit.</p>
            </div>
          </div>
          <div class="mt-auto border-t border-slate-100 pt-5">
            <button type="button" class="btn-secondary w-full" :disabled="permissionsBusy.limit || !canManagePermissions" @click="setMaxTransferByAddress">
              {{ permissionsBusy.limit ? 'Updating...' : 'Set Maximum Transfer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Whitelist & Blacklist -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Whitelist Configuration -->
        <div class="bg-gradient-to-br from-green-50/50 to-white rounded-xl border border-green-200/60 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-green-900 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Global Whitelist
            </h3>
            <label class="flex items-center cursor-pointer">
              <div class="relative">
                <input type="checkbox" class="sr-only" v-model="permissionsForm.whitelistMode" @change="setWhitelistModeByAddress" :disabled="permissionsBusy.whitelistMode || !canManagePermissions" />
                <div class="w-10 h-6 bg-slate-200 rounded-full shadow-inner transition-colors" :class="{ 'bg-green-500': permissionsForm.whitelistMode }"></div>
                <div class="absolute w-4 h-4 bg-white rounded-full shadow inset-y-1 left-1 transition-transform" :class="{ 'transform translate-x-4': permissionsForm.whitelistMode }"></div>
              </div>
            </label>
          </div>
          <p class="text-xs text-green-700 mb-4">If enabled, the account can ONLY interact with explicitly whitelisted smart contracts.</p>
          
          <div class="space-y-3">
            <input v-model="permissionsForm.whitelistTarget" type="text" class="input-field text-sm font-mono py-2 px-3 border-green-200 focus:border-green-500 focus:ring-green-500" placeholder="Contract address to whitelist..." />
            <div class="flex gap-2">
              <button type="button" class="btn-primary bg-gradient-to-r from-green-600 to-green-500 flex-1 py-1.5" :disabled="permissionsBusy.whitelist || !canManagePermissions" @click="updateWhitelistByAddress(true)">Add</button>
              <button type="button" class="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex-1 py-1.5" :disabled="permissionsBusy.whitelist || !canManagePermissions" @click="updateWhitelistByAddress(false)">Remove</button>
            </div>
          </div>
        </div>

        <!-- Blacklist Configuration -->
        <div class="bg-gradient-to-br from-red-50/50 to-white rounded-xl border border-red-200/60 p-5 shadow-sm">
          <div class="mb-4">
            <h3 class="text-sm font-bold text-red-900 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              Global Blacklist
            </h3>
          </div>
          <p class="text-xs text-red-700 mb-4">Blacklisted contracts are universally blocked and cannot be called under any circumstance.</p>
          
          <div class="space-y-3">
            <input v-model="permissionsForm.blacklistTarget" type="text" class="input-field text-sm font-mono py-2 px-3 border-red-200 focus:border-red-500 focus:ring-red-500" placeholder="Contract address to blacklist..." />
            <div class="flex gap-2">
              <button type="button" class="btn-danger flex-1 py-1.5" :disabled="permissionsBusy.blacklist || !canManagePermissions" @click="updateBlacklistByAddress(true)">Ban Contract</button>
              <button type="button" class="btn-secondary flex-1 py-1.5" :disabled="permissionsBusy.blacklist || !canManagePermissions" @click="updateBlacklistByAddress(false)">Lift Ban</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from '@/i18n';

const studio = inject('studio');
const {
  permissionsForm,
  permissionsBusy,
  canManagePermissions,
  setVerifierContractByAddress,
  setWhitelistModeByAddress,
  updateWhitelistByAddress,
  updateBlacklistByAddress,
  setMaxTransferByAddress
} = studio;
</script>