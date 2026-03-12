<template>
  <section class="bg-ata-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-ata-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.manageTitle', 'Manage Governance') }}</h2>
    <p class="text-sm text-slate-400 mb-8">Operate policy and recovery controls for an existing abstract account.</p>

    <div class="space-y-8">
      <div class="bg-ata-panel p-5 rounded-lg border border-ata-border/60">
        <label class="block text-sm font-semibold text-slate-300 mb-3">Target Account Address (Neo N3)</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            v-model="manageForm.accountAddress"
            type="text"
            list="loaded-manage-accounts"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4 bg-ata-dark"
            placeholder="N..."
          />
          <datalist id="loaded-manage-accounts">
            <option v-for="addr in autoLoadedAccounts" :key="addr" :value="addr" />
          </datalist>
          <button type="button" class="btn-primary sm:w-auto" :disabled="manageBusy.load || !canManageTarget" @click="loadAccountConfiguration">
            <svg v-if="manageBusy.load" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ manageBusy.load ? 'Loading...' : 'Load Configuration' }}
          </button>
        </div>
      </div>

      <transition name="fade">
        <div v-if="manageSnapshot.loadedAt" class="bg-gradient-to-r from-ata-green/20 to-ata-panel/60 rounded-lg p-5 border border-ata-green/30 shadow-sm relative overflow-hidden backdrop-blur-sm">
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-ata-green"></div>
          <h4 class="text-xs font-bold text-ata-green uppercase tracking-wider mb-4 tracking-widest font-mono">Current State</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span class="block text-slate-400 text-xs mb-1">Loaded At</span> <span class="font-semibold text-white">{{ manageSnapshot.loadedAt }}</span></div>
            <div><span class="block text-slate-400 text-xs mb-1">Last Active</span> <span class="font-semibold text-white">{{ manageSnapshot.lastActiveMs }} ms</span></div>
            <div v-if="manageSnapshot.domeUnlocked !== null">
              <span class="block text-slate-400 text-xs mb-1">Dome Status</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold" :class="manageSnapshot.domeUnlocked ? 'bg-ata-green/10 text-ata-green' : 'bg-ata-panel text-slate-400'">
                {{ manageSnapshot.domeUnlocked ? 'Unlocked' : 'Locked' }}
              </span>
            </div>
          </div>
        </div>
      </transition>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Update Signers -->
        <div class="border border-ata-border rounded-lg p-5 hover:border-ata-border transition-colors">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-sm font-bold text-white uppercase tracking-widest font-mono">Signer Set</h3>
            <button type="button" class="text-xs text-ata-green hover:text-ata-green font-bold bg-ata-green px-2 py-1 rounded" @click="addRow(manageForm.signers)">+ Add</button>
          </div>
          <div class="space-y-3 mb-6">
            <div v-for="(signer, index) in manageForm.signers" :key="`manage-signer-${index}`" class="flex gap-2">
              <input v-model="manageForm.signers[index]" type="text" class="input-field font-mono text-xs py-2 px-3 bg-ata-dark" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-ata-border rounded-lg bg-ata-panel text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" @click="removeRow(manageForm.signers, index)">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-ata-border pt-5">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Threshold</label>
              <input v-model.number="manageForm.threshold" type="number" min="1" :max="Math.max(1, validManageSigners.length)" class="input-field w-16 text-center py-1.5 text-sm font-bold bg-ata-dark" />
            </div>
            <button type="button" class="btn-secondary text-sm px-4" :disabled="manageBusy.signers || !canManageTarget || validManageSigners.length === 0" @click="setSignersByAddress">
              Update Signers
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Dome Accounts -->
        <div class="border border-ata-border rounded-lg p-5 hover:border-ata-border transition-colors">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-sm font-bold text-white uppercase tracking-widest font-mono">Dome Recovery Network</h3>
            <button type="button" class="text-xs text-amber-400 hover:text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded" @click="addRow(manageForm.domeAccounts)">+ Add</button>
          </div>
          <div class="space-y-3 mb-6">
            <div v-for="(dome, index) in manageForm.domeAccounts" :key="`dome-${index}`" class="flex gap-2">
              <input v-model="manageForm.domeAccounts[index]" type="text" class="input-field font-mono text-xs py-2 px-3 bg-ata-dark" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-ata-border rounded-lg bg-ata-panel text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" @click="removeRow(manageForm.domeAccounts, index)">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 border-t border-ata-border pt-5 mb-5">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Dome Threshold</label>
              <input v-model.number="manageForm.domeThreshold" type="number" min="0" :max="Math.max(0, validDomeAccounts.length)" class="input-field text-sm font-bold py-1.5 bg-ata-dark" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Timeout (hours)</label>
              <input v-model.number="manageForm.domeTimeoutHours" type="number" min="0" step="1" class="input-field text-sm font-bold py-1.5 bg-ata-dark" />
            </div>
          </div>
          <button type="button" class="btn-secondary w-full" :disabled="manageBusy.domeAccounts || !canManageTarget" @click="setDomeAccountsByAddress">
            {{ manageBusy.domeAccounts ? 'Updating...' : 'Update Recovery Rules' }}
          </button>
        </div>

        <!-- Dome Oracle -->
        <div class="border border-ata-border rounded-lg p-5 hover:border-ata-border transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-white mb-5 uppercase tracking-widest font-mono">Dome Oracle & Activation</h3>
          <div class="mb-6 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Oracle Endpoint URL</label>
              <input v-model="manageForm.domeOracleUrl" type="text" class="input-field text-sm py-2 px-3 bg-ata-dark" placeholder="https://oracle.example.com/status" />
            </div>
          </div>
          <div class="mt-auto space-y-3 pt-5 border-t border-ata-border">
            <button type="button" class="btn-secondary w-full" :disabled="manageBusy.domeOracle || !canManageTarget" @click="setDomeOracleByAddress">
              Set Oracle
            </button>
            <button type="button" class="btn-warning w-full" :disabled="manageBusy.domeActivation || !canManageTarget" @click="requestDomeActivationByAddress">
              Request Dome Unlock
            </button>
            <p class="text-[11px] text-slate-400 text-center font-medium leading-tight">Can only be activated once the designated inactivity timeout has elapsed.</p>
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
  validManageSigners,
  validDomeAccounts,
  canManageTarget,
  autoLoadedAccounts,
  loadAccountConfiguration,
  addRow,
  removeRow,
  setSignersByAddress,
  setDomeAccountsByAddress,
  setDomeOracleByAddress,
  requestDomeActivationByAddress
} = studio;
</script>