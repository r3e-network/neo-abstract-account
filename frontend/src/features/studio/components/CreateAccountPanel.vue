<template>
  <section class="bg-biconomy-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-biconomy-border p-6 sm:p-8 dark-panel-override">
    <div class="flex items-start justify-between mb-2">
      <div>
        <h2 class="text-xl font-bold text-white uppercase tracking-widest font-mono">{{ t('studioPanels.createTitle', 'Create Abstract Account') }}</h2>
        <p class="text-sm text-biconomy-muted mt-1">Register a V3 account with one verifier plugin, one hook plugin, and one backup owner escape hatch.</p>
      </div>
      <div v-if="computedAddress" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-xs font-semibold text-emerald-300">Ready</span>
      </div>
    </div>

    <div class="space-y-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-semibold text-biconomy-text">
            .matrix Domain
            <span class="text-xs font-normal text-biconomy-muted">(optional)</span>
          </label>
          <div class="flex rounded-lg border border-biconomy-border overflow-hidden bg-biconomy-dark focus-within:border-biconomy-orange focus-within:ring-1 focus-within:ring-biconomy-orange transition-all">
            <input v-model="createForm.matrixDomain" type="text" class="flex-1 bg-transparent py-2.5 px-4 text-sm text-biconomy-text border-none focus:ring-0" placeholder="alice" />
            <span class="flex items-center px-3 bg-biconomy-panel border-l border-biconomy-border text-biconomy-muted text-sm font-mono select-none">.matrix</span>
            <button type="button" @click="checkMatrixDomain" class="bg-biconomy-lightOrange/10 hover:bg-biconomy-lightOrange/20 text-biconomy-lightOrange px-4 text-xs font-bold uppercase tracking-wider transition-colors border-l border-biconomy-border" :disabled="!createForm.matrixDomain || matrixCheckResult?.checking">
              <svg v-if="matrixCheckResult?.checking" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span v-else>Check</span>
            </button>
          </div>
          <p class="mt-1 text-xs" :class="matrixCheckResult?.available ? 'text-biconomy-orange' : (matrixCheckResult?.error ? 'text-rose-400' : 'text-biconomy-muted')">
            {{ matrixCheckResult?.message || 'Register a memorable name in the same transaction.' }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm font-semibold text-biconomy-text">
            Virtual Account Address
            <span v-if="!computedAddress" class="text-xs font-normal text-slate-500">(derives from seed)</span>
          </label>
          <div class="relative">
            <div v-if="computedAddress" class="w-full bg-biconomy-panel border border-emerald-500/30 rounded-lg py-2.5 px-4 font-mono text-sm text-emerald-300">
              {{ computedAddress }}
            </div>
            <div v-else class="w-full bg-biconomy-dark/50 border border-slate-700/50 rounded-lg py-3 px-4 text-sm text-slate-500 text-center">
              Enter a seed below to derive address
            </div>
            <div v-if="computedAddress" class="absolute right-3 top-1/2 -translate-y-1/2">
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <details class="rounded-lg border border-biconomy-border bg-biconomy-panel/80 p-4">
        <summary class="cursor-pointer text-sm font-semibold text-biconomy-muted uppercase tracking-widest font-mono hover:text-white transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          Advanced: Custom Account Seed
        </summary>
        <div class="mt-4 space-y-2">
          <label class="block text-sm font-semibold text-biconomy-text">Account Seed (UUID)</label>
          <div class="flex rounded-lg shadow-sm ring-1 ring-ata-border focus-within:ring-2 focus-within:ring-biconomy-orange transition-shadow">
            <input
              v-model="createForm.accountId"
              type="text"
              class="flex-1 bg-transparent border-0 rounded-l-lg py-2.5 px-4 font-mono text-sm text-biconomy-text focus:ring-0 placeholder:text-slate-600"
              :readonly="isEvmWallet"
              placeholder="Auto-generated if left empty"
            />
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 border-l border-biconomy-border rounded-r-lg bg-biconomy-panel text-biconomy-muted text-sm font-semibold hover:bg-biconomy-panel/80 disabled:opacity-50 transition-colors"
              @click="generateUUID"
              :disabled="isEvmWallet"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Generate
            </button>
          </div>
          <p class="mt-2 text-xs text-biconomy-muted">The seed derives the virtual account address via hash160. Only the hash160 account id is stored on-chain during V3 registration.</p>
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
            <input v-model="createForm.backupOwner" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" :class="backupOwnerInputClass" placeholder="N... or 0x..." />
            <p v-if="backupOwnerError" class="mt-1 text-xs text-rose-400">{{ backupOwnerError }}</p>
            <p v-else class="mt-1 text-xs text-biconomy-muted">Neo address (N...) or EVM address (0x...)</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-biconomy-text mb-1">Escape Timelock (days)</label>
            <input v-model.number="createForm.escapeTimelockDays" type="number" min="1" max="365" class="input-field w-32 text-sm py-2 px-3 bg-biconomy-dark" />
            <p class="mt-1 text-xs text-biconomy-muted">Countdown before escape hatch activates (1-365 days)</p>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <label class="flex items-center justify-between text-sm font-semibold text-biconomy-text">
          Verification Script (Hex)
          <button v-if="computedScriptHex" type="button" @click="copyScript" class="text-xs text-biconomy-orange hover:text-biconomy-lightOrange transition-colors flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            {{ copyLabel }}
          </button>
        </label>
        <div class="relative rounded-lg overflow-hidden border border-biconomy-border">
          <textarea :value="computedScriptHex || ''" readonly class="w-full bg-biconomy-dark border-0 p-4 font-mono text-xs text-biconomy-text placeholder:text-biconomy-muted focus:ring-0 resize-none h-24" :placeholder="computedAddress ? 'Computing script...' : 'Enter seed and account parameters above...'"></textarea>
        </div>
      </div>

      <div class="pt-6 border-t border-biconomy-border/60 flex flex-col sm:flex-row items-center gap-4">
        <button type="button" class="btn-primary w-full sm:w-auto" :disabled="isCreating || !canCreate" @click="createAccount">
          <svg v-if="isCreating" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isCreating ? 'Submitting Transaction...' : 'Register V3 Account' }}
        </button>
        <span class="text-xs text-biconomy-muted font-medium text-center sm:text-left">Creates a V3 account with one verifier, one hook, and one backup-owner escape hatch.</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject, ref, computed } from 'vue';
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

const copyLabel = ref('Copy');

function copyScript() {
  if (!computedScriptHex) return;
  navigator.clipboard.writeText(computedScriptHex);
  copyLabel.value = 'Copied!';
  setTimeout(() => { copyLabel.value = 'Copy'; }, 1500);
}

const backupOwnerError = computed(() => {
  const val = createForm.backupOwner?.trim() || '';
  if (!val) return '';
  const isNeo = val.startsWith('N') && val.length === 34;
  const isEvm = /^0x[0-9a-fA-F]{40}$/.test(val);
  if (!isNeo && !isEvm) return 'Invalid address format (expect N... or 0x...)';
  return '';
});

const backupOwnerInputClass = computed(() => {
  const val = createForm.backupOwner?.trim() || '';
  if (!val) return '';
  return backupOwnerError.value ? 'border-rose-500 focus:border-rose-400' : 'border-emerald-500/50';
});
</script>
