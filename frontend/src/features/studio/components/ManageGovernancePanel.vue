<template>
  <section class="bg-biconomy-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-biconomy-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.manageTitle', 'Manage Governance') }}</h2>
    <p class="text-sm text-biconomy-muted mb-8">Load a V3 account, inspect its verifier / hook / escape state, then rotate plugins or operate the escape hatch.</p>

    <div class="space-y-8">
      <div class="bg-biconomy-panel p-5 rounded-lg border border-biconomy-border/60">
        <label class="block text-sm font-semibold text-biconomy-text mb-3">Target Account Seed / AccountId Hash</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            v-model="manageForm.accountAddress"
            type="text"
            list="loaded-manage-accounts"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4 bg-biconomy-dark"
            placeholder="20-byte hash160 or raw seed"
          />
          <datalist id="loaded-manage-accounts">
            <option v-for="addr in autoLoadedAccounts" :key="addr" :value="addr" />
          </datalist>
          <button type="button" class="btn-primary sm:w-auto" :disabled="manageBusy.load || !canManageTarget" @click="loadAccountConfiguration">
            {{ manageBusy.load ? 'Loading...' : 'Load V3 State' }}
          </button>
        </div>
        <p class="mt-2 text-xs text-biconomy-muted">V3 state is keyed by `accountId` hash160, not by the derived virtual address.</p>
      </div>

      <transition name="fade">
        <div v-if="manageSnapshot.loadedAt" class="bg-gradient-to-r from-ata-green/20 to-ata-panel/60 rounded-lg p-5 border border-biconomy-orange/30 shadow-sm relative overflow-hidden backdrop-blur-sm">
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-biconomy-orange"></div>
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-xs font-bold text-biconomy-orange uppercase tracking-wider font-mono flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              Current V3 State
            </h4>
            <span class="text-xs text-biconomy-muted">{{ manageSnapshot.loadedAt }}</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div class="rounded-lg bg-biconomy-dark/40 p-3 border border-biconomy-border/40">
              <span class="block text-biconomy-muted text-xs mb-1">AccountId</span>
              <span class="font-semibold text-white break-all text-xs">{{ manageSnapshot.accountId || 'unset' }}</span>
            </div>
            <div class="rounded-lg bg-biconomy-dark/40 p-3 border border-biconomy-border/40">
              <span class="block text-biconomy-muted text-xs mb-1">Verifier</span>
              <span class="font-semibold text-white break-all text-xs">{{ manageSnapshot.verifier || 'unset' }}</span>
            </div>
            <div class="rounded-lg bg-biconomy-dark/40 p-3 border border-biconomy-border/40">
              <span class="block text-biconomy-muted text-xs mb-1">Hook</span>
              <span class="font-semibold text-white break-all text-xs">{{ manageSnapshot.hook || 'unset' }}</span>
            </div>
            <div class="rounded-lg bg-biconomy-dark/40 p-3 border border-biconomy-border/40">
              <span class="block text-biconomy-muted text-xs mb-1">Backup Owner</span>
              <span class="font-semibold text-white break-all text-xs">{{ manageSnapshot.backupOwner || 'unset' }}</span>
            </div>
            <div class="rounded-lg bg-biconomy-dark/40 p-3 border border-biconomy-border/40">
              <span class="block text-biconomy-muted text-xs mb-1">Escape Timelock</span>
              <span class="font-semibold text-white text-xs">{{ manageSnapshot.escapeTimelock || 0 }} sec</span>
            </div>
            <div class="rounded-lg bg-biconomy-dark/40 p-3 border border-biconomy-border/40">
              <span class="block text-biconomy-muted text-xs mb-1">Escape State</span>
              <span class="font-semibold text-xs" :class="manageSnapshot.escapeActive ? 'text-amber-400' : 'text-emerald-400'">
                {{ manageSnapshot.escapeActive ? `active @ ${manageSnapshot.escapeTriggeredAt}` : 'inactive' }}
              </span>
            </div>
          </div>
        </div>
      </transition>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="border border-biconomy-border rounded-lg p-5 hover:border-biconomy-border transition-colors">
          <h3 class="text-sm font-bold text-white uppercase tracking-widest font-mono mb-5">Rotate Verifier Plugin</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Verifier Hash</label>
              <input v-model="manageForm.verifierContract" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" placeholder="0x..." />
            </div>
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Verifier Params (hex)</label>
              <textarea v-model="manageForm.verifierParams" class="input-field font-mono text-xs py-2 px-3 bg-biconomy-dark min-h-24" placeholder="Pubkey or verifier-specific config hex."></textarea>
            </div>
            <button type="button" class="btn-primary w-full" :disabled="manageBusy.verifier || !canManageTarget" @click="updateVerifier">
              {{ manageBusy.verifier ? 'Updating...' : 'Update Verifier' }}
            </button>
          </div>
        </div>

        <div class="border border-biconomy-border rounded-lg p-5 hover:border-biconomy-border transition-colors">
          <h3 class="text-sm font-bold text-white uppercase tracking-widest font-mono mb-5">Rotate Hook Plugin</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Hook Hash</label>
              <input v-model="manageForm.hookContract" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" placeholder="0x..." />
            </div>
            <button type="button" class="btn-secondary w-full" :disabled="manageBusy.hook || !canManageTarget" @click="updateHook">
              {{ manageBusy.hook ? 'Updating...' : 'Update Hook' }}
            </button>
            <p class="text-xs text-biconomy-muted">Examples: WhitelistHook, DailyLimitHook, NeoDIDCredentialHook, MultiHook.</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="border border-biconomy-border rounded-lg p-5 hover:border-biconomy-border transition-colors">
          <h3 class="text-sm font-bold text-white uppercase tracking-widest font-mono mb-5">Escape Hatch</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">New Verifier After Escape</label>
              <input v-model="manageForm.escapeNewVerifier" type="text" class="input-field font-mono text-sm py-2 px-3 bg-biconomy-dark" placeholder="0x..." />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <button type="button" class="btn-secondary w-full" :disabled="manageBusy.initiateEscape || !canManageTarget" @click="initiateEscape">
                {{ manageBusy.initiateEscape ? 'Starting...' : 'Initiate Escape' }}
              </button>
              <button type="button" class="btn-primary w-full" :disabled="manageBusy.finalizeEscape || !canManageTarget" @click="finalizeEscape">
                {{ manageBusy.finalizeEscape ? 'Finalizing...' : 'Finalize Escape' }}
              </button>
            </div>
            <p class="text-xs text-biconomy-muted">Only the configured backup owner can operate the escape hatch.</p>
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
  manageForm,
  manageBusy,
  manageSnapshot,
  canManageTarget,
  autoLoadedAccounts,
  loadAccountConfiguration,
  updateVerifier,
  updateHook,
  initiateEscape,
  finalizeEscape,
} = studio;
</script>
