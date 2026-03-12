<template>
  <section class="bg-ata-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-ata-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.permissionsTitle', 'Permissions & Limits') }}</h2>
    <p class="text-sm text-slate-400 mb-8">Manage whitelists, blacklists, execution limits, and custom contract verifiers.</p>

    <div class="space-y-8">
      <div class="bg-ata-panel p-5 rounded-lg border border-ata-border/60">
        <label class="block text-sm font-semibold text-slate-300 mb-3">Target Account Address (Neo N3)</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            v-model="permissionsForm.accountAddress"
            type="text"
            list="loaded-permissions-accounts"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4 bg-ata-dark"
            placeholder="N..."
          />
          <datalist id="loaded-permissions-accounts">
            <option v-for="addr in autoLoadedAccounts" :key="addr" :value="addr" />
          </datalist>
        </div>
        <p class="mt-2 text-xs text-slate-400">Required for all actions below.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Custom Verifier -->
        <div class="border border-ata-border rounded-lg p-5 hover:border-ata-border transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-white mb-5 uppercase tracking-widest font-mono">Custom Verifier Contract</h3>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-400 mb-1">Verifier Hash / Address</label>
            <input v-model="permissionsForm.verifierContract" type="text" class="input-field text-sm font-mono py-2 px-3 bg-ata-dark" placeholder="Leave empty to clear..." />
          </div>
          <div class="mt-auto border-t border-ata-border pt-5">
            <button type="button" class="btn-primary w-full" :disabled="permissionsBusy.verifier || !canManagePermissions" @click="setVerifierContractByAddress">
              {{ permissionsBusy.verifier ? 'Updating...' : 'Set Custom Verifier' }}
            </button>
            <p class="mt-3 text-xs text-slate-400 text-center">Overrides native multisig validation logic with a custom Neo contract.</p>
          </div>
        </div>

        <!-- Token Limits -->
        <div class="border border-ata-border rounded-lg p-5 hover:border-ata-border transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-white mb-5 uppercase tracking-widest font-mono">Token Transfer Limit</h3>
          <div class="space-y-4 mb-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Token Address</label>
              <input v-model="permissionsForm.limitToken" type="text" class="input-field text-sm font-mono py-2 px-3 bg-ata-dark" placeholder="N..." />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Max Amount per Transfer</label>
              <input v-model.number="permissionsForm.limitAmount" type="number" min="0" class="input-field text-sm py-2 px-3 bg-ata-dark" placeholder="e.g. 1000000" />
              <p class="text-[11px] text-slate-400 mt-1">Set to 0 to remove the limit.</p>
            </div>
          </div>
          <div class="mt-auto border-t border-ata-border pt-5">
            <button type="button" class="btn-secondary w-full" :disabled="permissionsBusy.limit || !canManagePermissions" @click="setMaxTransferByAddress">
              {{ permissionsBusy.limit ? 'Updating...' : 'Set Maximum Transfer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Whitelist & Blacklist -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Whitelist Configuration -->
        <div class="bg-gradient-to-br from-ata-green/10 to-ata-panel/40 rounded-lg border border-ata-green/30 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-ata-green flex items-center gap-2 uppercase tracking-widest font-mono">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Global Whitelist
            </h3>
            <label class="flex items-center cursor-pointer">
              <div class="relative">
                <input type="checkbox" class="sr-only bg-ata-dark text-white" v-model="permissionsForm.whitelistMode" @change="setWhitelistModeByAddress" :disabled="permissionsBusy.whitelistMode || !canManagePermissions" />
                <div class="w-10 h-6 bg-ata-dark rounded-full shadow-inner transition-colors border border-ata-border" :class="{ 'bg-ata-green': permissionsForm.whitelistMode }"></div>
                <div class="absolute w-4 h-4 bg-ata-panel rounded-full shadow inset-y-1 left-1 transition-transform" :class="{ 'transform translate-x-4': permissionsForm.whitelistMode }"></div>
              </div>
            </label>
          </div>
          <p class="text-xs text-ata-green mb-4">If enabled, the account can ONLY interact with explicitly whitelisted smart contracts.</p>
          
          <div class="space-y-3">
            <input v-model="permissionsForm.whitelistTarget" type="text" class="input-field text-sm font-mono py-2 px-3 border-ata-green/30 focus:border-ata-green focus:ring-ata-green bg-ata-dark" placeholder="Contract address to whitelist..." />
            <div class="flex gap-2">
              <button type="button" class="btn-primary bg-ata-green flex-1 py-1.5" :disabled="permissionsBusy.whitelist || !canManagePermissions" @click="updateWhitelistByAddress(true)">Add</button>
              <button type="button" class="btn-secondary text-rose-400 border-rose-500/30 hover:bg-rose-500/10 flex-1 py-1.5" :disabled="permissionsBusy.whitelist || !canManagePermissions" @click="updateWhitelistByAddress(false)">Remove</button>
            </div>
          </div>
        </div>

        <!-- Blacklist Configuration -->
        <div class="bg-gradient-to-br from-rose-900/20 to-ata-panel/40 rounded-lg border border-rose-500/30 p-5 shadow-sm">
          <div class="mb-4">
            <h3 class="text-sm font-bold text-rose-400 flex items-center gap-2 uppercase tracking-widest font-mono">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              Global Blacklist
            </h3>
          </div>
          <p class="text-xs text-rose-400 mb-4">Blacklisted contracts are universally blocked and cannot be called under any circumstance.</p>
          
          <div class="space-y-3">
            <input v-model="permissionsForm.blacklistTarget" type="text" class="input-field text-sm font-mono py-2 px-3 border-rose-500/30 focus:border-rose-500/50 focus:ring-rose-500 bg-ata-dark" placeholder="Contract address to blacklist..." />
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

const { t } = useI18n();

const studio = inject('studio');
const {
  permissionsForm,
  permissionsBusy,
  canManagePermissions,
  autoLoadedAccounts,
  setVerifierContractByAddress,
  setWhitelistModeByAddress,
  updateWhitelistByAddress,
  updateBlacklistByAddress,
  setMaxTransferByAddress
} = studio;
</script>