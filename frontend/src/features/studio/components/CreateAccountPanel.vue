<template>
  <section class="bg-biconomy-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-biconomy-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.createTitle', 'Create Abstract Account') }}</h2>
    <p class="text-sm text-biconomy-muted mb-8">Register a V3 account with one verifier plugin, one hook plugin, and one backup owner escape hatch.</p>

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
          <label class="block text-sm font-semibold text-biconomy-text">Virtual Account Address</label>
          <div class="relative">
            <input :value="computedAddress || '—'" readonly type="text" class="w-full bg-biconomy-panel border border-biconomy-border rounded-lg py-2.5 px-4 font-mono text-sm text-biconomy-muted cursor-not-allowed" />
            <div v-if="computedAddress" class="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-biconomy-orange shadow-[0_0_8px_rgba(0,255,102,0.6)] animate-pulse"></div>
          </div>
        </div>
      </div>

      <details class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-4">
        <summary class="cursor-pointer text-sm font-semibold text-biconomy-text uppercase tracking-widest font-mono">Advanced account seed</summary>
        <div class="mt-4 space-y-2">
          <label class="block text-sm font-semibold text-biconomy-text">Account Seed</label>
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
          <p class="mt-1 text-xs text-biconomy-muted">The seed is only used to derive the virtual account address. V3 registration stores the derived hash160 account id on-chain.</p>
        </div>
      </details>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-biconomy-text mb-1">Verifier Plugin</label>
            <input v-model="createForm.verifierContract" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" placeholder="0x... (optional)" />
            <p class="mt-1 text-xs text-biconomy-muted">Examples: Web3AuthVerifier, TEEVerifier, SessionKeyVerifier.</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-biconomy-text mb-1">Verifier Params (hex)</label>
            <textarea v-model="createForm.verifierParams" class="input-field font-mono text-xs py-2 px-3 bg-biconomy-dark min-h-24" placeholder="Uncompressed pubkey or verifier-specific config hex."></textarea>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-biconomy-text mb-1">Hook Plugin</label>
            <input v-model="createForm.hookContract" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" placeholder="0x... (optional)" />
            <p class="mt-1 text-xs text-biconomy-muted">Examples: WhitelistHook, DailyLimitHook, NeoDIDCredentialHook, MultiHook.</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-biconomy-text mb-1">Backup Owner</label>
            <input v-model="createForm.backupOwner" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" placeholder="N... or 0x..." />
          </div>
          <div>
            <label class="block text-sm font-semibold text-biconomy-text mb-1">Escape Timelock (days)</label>
            <input v-model.number="createForm.escapeTimelockDays" type="number" min="1" class="input-field w-32 text-sm py-2 px-3 bg-biconomy-dark" />
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
          {{ isCreating ? 'Submitting Transaction...' : 'Register V3 Account' }}
        </button>
        <span class="text-xs text-biconomy-muted font-medium">Creates a V3 account with one verifier, one hook, and one backup-owner escape hatch.</span>
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
  computedScriptHex,
  isCreating,
  canCreate,
  generateUUID,
  createAccount,
  checkMatrixDomain,
  matrixCheckResult
} = studio;
</script>
