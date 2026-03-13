<template>
  <section class="bg-biconomy-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-biconomy-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.createTitle', 'Create Abstract Account') }}</h2>
    <p class="text-sm text-biconomy-muted mb-8">{{ t('studioPanels.createSubtitle', 'Configure identity and signer roles, then register with a single transaction.') }}</p>

    <div class="space-y-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-biconomy-text">.matrix Domain (optional)</label>
          <div class="flex rounded-lg border border-biconomy-border overflow-hidden bg-biconomy-dark focus-within:border-biconomy-orange focus-within:ring-1 focus-within:ring-biconomy-orange transition-all">
            <input v-model="createForm.matrixDomain" type="text" class="flex-1 bg-transparent py-2.5 px-4 text-sm text-biconomy-text border-none focus:ring-0" placeholder="alice" />
            <span class="flex items-center px-3 bg-biconomy-panel border-l border-biconomy-border text-biconomy-muted text-sm font-mono select-none">.matrix</span>
            <button type="button" @click="checkMatrixDomain" class="bg-biconomy-lightOrange/10 hover:bg-biconomy-lightOrange/20 text-biconomy-lightOrange px-4 text-xs font-bold uppercase tracking-wider transition-colors border-l border-biconomy-border" :disabled="!createForm.matrixDomain">Check</button>
          </div>
          <p class="mt-1 text-xs" :class="matrixCheckResult?.available ? 'text-biconomy-orange' : (matrixCheckResult?.error ? 'text-rose-400' : 'text-biconomy-muted')">
            {{ matrixCheckResult?.message || 'Register a memorable name in the same transaction.' }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-biconomy-text">Derived Account Address</label>
          <div class="relative">
            <input :value="computedAddress || '—'" readonly type="text" class="w-full bg-biconomy-panel border border-biconomy-border rounded-lg py-2.5 px-4 font-mono text-sm text-biconomy-muted cursor-not-allowed" />
            <div v-if="computedAddress" class="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-biconomy-orange shadow-[0_0_8px_rgba(0,255,102,0.6)] animate-pulse"></div>
          </div>
        </div>
      </div>

      <details class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-4">
        <summary class="cursor-pointer text-sm font-semibold text-biconomy-text uppercase tracking-widest font-mono">Advanced identity options</summary>
        <div class="mt-4 space-y-2">
          <label class="block text-sm font-semibold text-biconomy-text">Account ID (advanced override)</label>
          <div class="flex rounded-lg shadow-sm ring-1 ring-ata-border focus-within:ring-2 focus-within:ring-biconomy-orange transition-shadow">
            <input
              v-model="createForm.accountId"
              type="text"
              class="flex-1 bg-transparent border-0 rounded-l-lg py-2.5 px-4 font-mono text-sm text-biconomy-text focus:ring-0 placeholder:text-biconomy-muted"
              :readonly="isEvmWallet"
              placeholder="550e8400-e29b-41d4..."
            />
            <button
              type="button"
              class="inline-flex items-center px-4 py-2.5 border-l border-biconomy-border rounded-r-lg bg-biconomy-panel text-biconomy-muted text-sm font-semibold hover:bg-biconomy-panel disabled:opacity-50 transition-colors"
              @click="generateUUID"
              :disabled="isEvmWallet"
            >
              Generate
            </button>
          </div>
          <p class="mt-1 text-xs text-biconomy-muted">Most users do not need to manage Account ID directly; it is generated automatically unless you override it here.</p>
          <p class="mt-1 text-xs text-biconomy-orange font-medium" v-if="isEvmWallet">Using connected wallet public key.</p>
        </div>
      </details>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Signers -->
        <div class="bg-gradient-to-br from-ata-dark/50 to-ata-panel/50 p-5 rounded-lg border border-biconomy-border shadow-sm relative overflow-hidden group hover:border-biconomy-orange/50 transition-colors duration-300">
          <div class="absolute top-0 right-0 w-32 h-32 bg-biconomy-orange/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-biconomy-orange/20 transition-colors"></div>
          <div class="flex justify-between items-center mb-4 relative z-10">
            <h3 class="text-base font-bold text-biconomy-text flex items-center gap-2 uppercase tracking-widest font-mono">
              <svg class="w-4 h-4 text-biconomy-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Signers
            </h3>
            <button type="button" class="text-xs text-biconomy-orange hover:text-white font-bold bg-biconomy-orange/20 px-2 py-1 rounded transition-colors" @click="addRow(createForm.signers)">+ Add</button>
          </div>
          <div class="space-y-3 mb-5 relative z-10">
            <div v-for="(signer, index) in createForm.signers" :key="`create-signer-${index}`" class="flex gap-2 group/input">
              <input v-model="createForm.signers[index]" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-biconomy-border rounded-lg bg-biconomy-panel text-biconomy-muted hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-colors" @click="removeRow(createForm.signers, index)">
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-biconomy-border/60 pt-4 relative z-10">
            <label class="block text-xs font-semibold text-biconomy-muted">Required Threshold</label>
            <input v-model.number="createForm.threshold" type="number" min="1" :max="Math.max(1, validCreateSigners.length)" class="input-field w-20 text-center py-1 text-sm font-bold text-biconomy-text bg-biconomy-dark" />
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <label class="block text-sm font-semibold text-biconomy-text">Verification Script (Hex)</label>
        <div class="relative rounded-lg overflow-hidden border border-biconomy-border">
          <textarea :value="computedScriptHex || ''" readonly class="w-full bg-biconomy-dark border-0 p-4 font-mono text-xs text-biconomy-text placeholder:text-biconomy-muted focus:ring-0 resize-none h-24" placeholder="Script will appear here once valid..."></textarea>
        </div>
      </div>

      <div class="pt-6 border-t border-biconomy-border/60 flex flex-col sm:flex-row items-center gap-4">
        <button type="button" class="btn-primary w-full sm:w-auto" :disabled="isCreating || !canCreate" @click="createAccount">
          <svg v-if="isCreating" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isCreating ? 'Submitting Transaction...' : 'Register Abstract Account' }}
        </button>
        <span class="text-xs text-biconomy-muted font-medium">Requires wallet signature and <code class="bg-biconomy-panel px-1 rounded text-biconomy-text">CalledByEntry</code> scope.</span>
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
  validCreateSigners,
  computedScriptHex,
  isCreating,
  canCreate,
  generateUUID,
  addRow,
  removeRow,
  createAccount,
  checkMatrixDomain,
  matrixCheckResult
} = studio;
</script>