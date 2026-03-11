<template>
  <section class="bg-ata-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-ata-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.createTitle', 'Create Abstract Account') }}</h2>
    <p class="text-sm text-slate-400 mb-8">{{ t('studioPanels.createSubtitle', 'Configure identity and signer roles, then register with a single transaction.') }}</p>

    <div class="space-y-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-300">.matrix Domain (optional)</label>
          <input v-model="createForm.matrixDomain" type="text" class="w-full rounded-lg border border-ata-border py-2.5 px-4 text-sm text-slate-300 focus:border-ata-green focus:ring-ata-green bg-ata-dark" placeholder="alice.matrix" />
          <p class="mt-1 text-xs text-slate-400">Register a memorable .matrix name in the same transaction and later discover your Abstract Accounts through that domain.</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-300">Derived Account Address</label>
          <div class="relative">
            <input :value="computedAddress || '—'" readonly type="text" class="w-full bg-ata-panel border border-ata-border rounded-lg py-2.5 px-4 font-mono text-sm text-slate-400 cursor-not-allowed" />
            <div v-if="computedAddress" class="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-ata-green shadow-[0_0_8px_rgba(0,255,102,0.6)] animate-pulse"></div>
          </div>
        </div>
      </div>

      <details class="rounded-lg border border-ata-border bg-ata-panel/80 p-4">
        <summary class="cursor-pointer text-sm font-semibold text-slate-300 uppercase tracking-widest font-mono">Advanced identity options</summary>
        <div class="mt-4 space-y-2">
          <label class="block text-sm font-semibold text-slate-300">Account ID (advanced override)</label>
          <div class="flex rounded-lg shadow-sm ring-1 ring-ata-border focus-within:ring-2 focus-within:ring-ata-green transition-shadow">
            <input
              v-model="createForm.accountId"
              type="text"
              class="flex-1 bg-transparent border-0 rounded-l-lg py-2.5 px-4 font-mono text-sm text-slate-300 focus:ring-0 placeholder:text-slate-400"
              :readonly="isEvmWallet"
              placeholder="550e8400-e29b-41d4..."
            />
            <button
              type="button"
              class="inline-flex items-center px-4 py-2.5 border-l border-ata-border rounded-r-lg bg-ata-panel text-slate-400 text-sm font-semibold hover:bg-ata-panel disabled:opacity-50 transition-colors"
              @click="generateUUID"
              :disabled="isEvmWallet"
            >
              Generate
            </button>
          </div>
          <p class="mt-1 text-xs text-slate-400">Most users do not need to manage Account ID directly; it is generated automatically unless you override it here.</p>
          <p class="mt-1 text-xs text-ata-green font-medium" v-if="isEvmWallet">Using connected wallet public key.</p>
        </div>
      </details>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Admins -->
        <div class="bg-gradient-to-br from-ata-dark/50 to-ata-panel/50 p-5 rounded-lg border border-ata-border shadow-sm relative overflow-hidden group hover:border-ata-green/50 transition-colors duration-300">
          <div class="absolute top-0 right-0 w-32 h-32 bg-ata-green/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-ata-green/20 transition-colors"></div>
          <div class="flex justify-between items-center mb-4 relative z-10">
            <h3 class="text-base font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest font-mono">
              <svg class="w-4 h-4 text-ata-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Admins
            </h3>
            <button type="button" class="text-xs text-ata-green hover:text-white font-bold bg-ata-green/20 px-2 py-1 rounded transition-colors" @click="addRow(createForm.admins)">+ Add</button>
          </div>
          <div class="space-y-3 mb-5 relative z-10">
            <div v-for="(admin, index) in createForm.admins" :key="`create-admin-${index}`" class="flex gap-2 group/input">
              <input v-model="createForm.admins[index]" type="text" class="input-field font-mono text-sm py-2 px-3 bg-ata-dark" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-ata-border rounded-lg bg-ata-panel text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-colors" @click="removeRow(createForm.admins, index)">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-ata-border/60 pt-4 relative z-10">
            <label class="block text-xs font-semibold text-slate-400">Required Threshold</label>
            <input v-model.number="createForm.adminThreshold" type="number" min="1" :max="Math.max(1, validCreateAdmins.length)" class="input-field w-20 text-center py-1 text-sm font-bold text-slate-300 bg-ata-dark" />
          </div>
        </div>

        <!-- Managers -->
        <div class="bg-gradient-to-br from-ata-dark/50 to-ata-panel/50 p-5 rounded-lg border border-ata-border shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors duration-300">
          <div class="absolute top-0 right-0 w-32 h-32 bg-ata-blue/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-ata-blue/20 transition-colors"></div>
          <div class="flex justify-between items-center mb-4 relative z-10">
            <h3 class="text-base font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest font-mono">
              <svg class="w-4 h-4 text-ata-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Managers
            </h3>
            <button type="button" class="text-xs text-ata-blue hover:text-white font-bold bg-ata-blue/20 px-2 py-1 rounded transition-colors" @click="addRow(createForm.managers)">+ Add</button>
          </div>
          <div class="space-y-3 mb-5 relative z-10">
            <div v-for="(manager, index) in createForm.managers" :key="`create-manager-${index}`" class="flex gap-2 group/input">
              <input v-model="createForm.managers[index]" type="text" class="input-field font-mono text-sm py-2 px-3 bg-ata-dark" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-ata-border rounded-lg bg-ata-panel text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-colors" @click="removeRow(createForm.managers, index)">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-ata-border/60 pt-4 relative z-10">
            <label class="block text-xs font-semibold text-slate-400">Required Threshold</label>
            <input v-model.number="createForm.managerThreshold" type="number" min="0" :max="Math.max(0, validCreateManagers.length)" class="input-field w-20 text-center py-1 text-sm font-bold text-slate-300 bg-ata-dark" />
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <label class="block text-sm font-semibold text-slate-300">Verification Script (Hex)</label>
        <div class="relative rounded-lg overflow-hidden border border-ata-border">
          <textarea :value="computedScriptHex || ''" readonly class="w-full bg-ata-dark border-0 p-4 font-mono text-xs text-slate-300 placeholder:text-slate-400 focus:ring-0 resize-none h-24" placeholder="Script will appear here once valid..."></textarea>
        </div>
      </div>

      <div class="pt-6 border-t border-ata-border/60 flex flex-col sm:flex-row items-center gap-4">
        <button type="button" class="btn-primary w-full sm:w-auto" :disabled="isCreating || !canCreate" @click="createAccount">
          <svg v-if="isCreating" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isCreating ? 'Submitting Transaction...' : 'Register Abstract Account' }}
        </button>
        <span class="text-xs text-slate-400 font-medium">Requires wallet signature and <code class="bg-ata-panel px-1 rounded text-slate-300">CalledByEntry</code> scope.</span>
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
  createForm,
  isEvmWallet,
  computedAddress,
  validCreateAdmins,
  validCreateManagers,
  computedScriptHex,
  isCreating,
  canCreate,
  generateUUID,
  addRow,
  removeRow,
  createAccount
} = studio;
</script>