<template>
  <section class="bg-biconomy-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-biconomy-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.manageTitle', 'Manage Governance') }}</h2>
    <p class="text-sm text-biconomy-muted mb-8">Operate policy and recovery controls for an existing abstract account.</p>

    <div class="space-y-8">
      <div class="bg-biconomy-panel p-5 rounded-lg border border-biconomy-border/60">
        <label class="block text-sm font-semibold text-biconomy-text mb-3">Target Account Address (Neo N3)</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            v-model="manageForm.accountAddress"
            type="text"
            list="loaded-manage-accounts"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4 bg-biconomy-dark"
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
        <div v-if="manageSnapshot.loadedAt" class="bg-gradient-to-r from-ata-green/20 to-ata-panel/60 rounded-lg p-5 border border-biconomy-orange/30 shadow-sm relative overflow-hidden backdrop-blur-sm">
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-biconomy-orange"></div>
          <h4 class="text-xs font-bold text-biconomy-orange uppercase tracking-wider mb-4 tracking-widest font-mono">Current State</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span class="block text-biconomy-muted text-xs mb-1">Loaded At</span> <span class="font-semibold text-white">{{ manageSnapshot.loadedAt }}</span></div>
            <div><span class="block text-biconomy-muted text-xs mb-1">Last Active</span> <span class="font-semibold text-white">{{ manageSnapshot.lastActiveMs }} ms</span></div>
          </div>
        </div>
      </transition>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Update Signers -->
        <div class="border border-biconomy-border rounded-lg p-5 hover:border-biconomy-border transition-colors">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-sm font-bold text-white uppercase tracking-widest font-mono">Signer Set</h3>
            <button type="button" class="text-xs text-biconomy-orange hover:text-biconomy-orange font-bold bg-biconomy-orange px-2 py-1 rounded" @click="addRow(manageForm.signers)">+ Add</button>
          </div>
          <div class="space-y-3 mb-6">
            <div v-for="(signer, index) in manageForm.signers" :key="`manage-signer-${index}`" class="flex gap-2">
              <input v-model="manageForm.signers[index]" type="text" class="input-field font-mono text-xs py-2 px-3 bg-biconomy-dark" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-biconomy-border rounded-lg bg-biconomy-panel text-biconomy-muted hover:bg-rose-500/10 hover:text-rose-400" @click="removeRow(manageForm.signers, index)">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-biconomy-border pt-5">
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Threshold</label>
              <input v-model.number="manageForm.threshold" type="number" min="1" :max="Math.max(1, validManageSigners.length)" class="input-field w-16 text-center py-1.5 text-sm font-bold bg-biconomy-dark" />
            </div>
            <button type="button" class="btn-secondary text-sm px-4" :disabled="manageBusy.signers || !canManageTarget || validManageSigners.length === 0" @click="setSignersByAddress">
              Update Signers
            </button>
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
  canManageTarget,
  autoLoadedAccounts,
  loadAccountConfiguration,
  addRow,
  removeRow,
  setSignersByAddress
} = studio;
</script>