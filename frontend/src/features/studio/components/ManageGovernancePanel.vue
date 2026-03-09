<template>
  <section class="bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden border border-slate-200/60 p-6 sm:p-8">
    <h2 class="text-xl font-bold text-slate-900 mb-2">{{ t('studioPanels.manageTitle', 'Manage Governance') }}</h2>
    <p class="text-sm text-slate-500 mb-8">Operate policy and recovery controls for an existing abstract account.</p>

    <div class="space-y-8">
      <div class="bg-slate-50 p-5 rounded-xl border border-slate-200/60">
        <label class="block text-sm font-semibold text-slate-800 mb-3">Target Account Address (Neo N3)</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            v-model="manageForm.accountAddress"
            type="text"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4"
            placeholder="N..."
          />
          <button type="button" class="btn-primary sm:w-auto" :disabled="manageBusy.load || !canManageTarget" @click="loadAccountConfiguration">
            <svg v-if="manageBusy.load" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ manageBusy.load ? 'Loading...' : 'Load Configuration' }}
          </button>
        </div>
      </div>

      <transition name="fade">
        <div v-if="manageSnapshot.loadedAt" class="bg-gradient-to-r from-neo-50 to-white rounded-xl p-5 border border-neo-100 shadow-sm relative overflow-hidden">
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-neo-500"></div>
          <h4 class="text-xs font-bold text-neo-800 uppercase tracking-wider mb-4">Current State</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span class="block text-slate-500 text-xs mb-1">Loaded At</span> <span class="font-semibold text-slate-900">{{ manageSnapshot.loadedAt }}</span></div>
            <div v-if="manageSnapshot.accountIdHex"><span class="block text-slate-500 text-xs mb-1">Account ID</span> <span class="font-mono text-xs font-semibold text-slate-900 truncate" :title="manageSnapshot.accountIdHex">{{ manageSnapshot.accountIdHex }}</span></div>
            <div><span class="block text-slate-500 text-xs mb-1">Last Active</span> <span class="font-semibold text-slate-900">{{ manageSnapshot.lastActiveMs }} ms</span></div>
            <div v-if="manageSnapshot.domeUnlocked !== null">
              <span class="block text-slate-500 text-xs mb-1">Dome Status</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold" :class="manageSnapshot.domeUnlocked ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'">
                {{ manageSnapshot.domeUnlocked ? 'Unlocked' : 'Locked' }}
              </span>
            </div>
          </div>
        </div>
      </transition>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Update Admins -->
        <div class="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-sm font-bold text-slate-900">Admin Set</h3>
            <button type="button" class="text-xs text-neo-600 hover:text-neo-800 font-bold bg-neo-50 px-2 py-1 rounded-md" @click="addRow(manageForm.admins)">+ Add</button>
          </div>
          <div class="space-y-3 mb-6">
            <div v-for="(admin, index) in manageForm.admins" :key="`manage-admin-${index}`" class="flex gap-2">
              <input v-model="manageForm.admins[index]" type="text" class="input-field font-mono text-xs py-2 px-3" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:bg-red-50 hover:text-red-500" @click="removeRow(manageForm.admins, index)">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 pt-5">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Threshold</label>
              <input v-model.number="manageForm.adminThreshold" type="number" min="1" :max="Math.max(1, validManageAdmins.length)" class="input-field w-16 text-center py-1.5 text-sm font-bold" />
            </div>
            <button type="button" class="btn-secondary text-sm px-4" :disabled="manageBusy.admins || !canManageTarget || validManageAdmins.length === 0" @click="setAdminsByAddress">
              Update Admins
            </button>
          </div>
        </div>

        <!-- Update Managers -->
        <div class="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-sm font-bold text-slate-900">Manager Set</h3>
            <button type="button" class="text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded-md" @click="addRow(manageForm.managers)">+ Add</button>
          </div>
          <div class="space-y-3 mb-6">
            <div v-for="(manager, index) in manageForm.managers" :key="`manage-manager-${index}`" class="flex gap-2">
              <input v-model="manageForm.managers[index]" type="text" class="input-field font-mono text-xs py-2 px-3" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:bg-red-50 hover:text-red-500" @click="removeRow(manageForm.managers, index)">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 pt-5">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Threshold</label>
              <input v-model.number="manageForm.managerThreshold" type="number" min="0" :max="Math.max(0, validManageManagers.length)" class="input-field w-16 text-center py-1.5 text-sm font-bold" />
            </div>
            <button type="button" class="btn-secondary text-sm px-4" :disabled="manageBusy.managers || !canManageTarget" @click="setManagersByAddress">
              Update Managers
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Dome Accounts -->
        <div class="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-sm font-bold text-slate-900">Dome Recovery Network</h3>
            <button type="button" class="text-xs text-amber-600 hover:text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-md" @click="addRow(manageForm.domeAccounts)">+ Add</button>
          </div>
          <div class="space-y-3 mb-6">
            <div v-for="(dome, index) in manageForm.domeAccounts" :key="`dome-${index}`" class="flex gap-2">
              <input v-model="manageForm.domeAccounts[index]" type="text" class="input-field font-mono text-xs py-2 px-3" placeholder="N... or 0x..." />
              <button type="button" class="inline-flex items-center p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:bg-red-50 hover:text-red-500" @click="removeRow(manageForm.domeAccounts, index)">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 mb-5">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Dome Threshold</label>
              <input v-model.number="manageForm.domeThreshold" type="number" min="0" :max="Math.max(0, validDomeAccounts.length)" class="input-field text-sm font-bold py-1.5" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Timeout (hours)</label>
              <input v-model.number="manageForm.domeTimeoutHours" type="number" min="0" step="1" class="input-field text-sm font-bold py-1.5" />
            </div>
          </div>
          <button type="button" class="btn-secondary w-full" :disabled="manageBusy.domeAccounts || !canManageTarget" @click="setDomeAccountsByAddress">
            {{ manageBusy.domeAccounts ? 'Updating...' : 'Update Recovery Rules' }}
          </button>
        </div>

        <!-- Dome Oracle -->
        <div class="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-slate-900 mb-5">Dome Oracle & Activation</h3>
          <div class="mb-6 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Oracle Endpoint URL</label>
              <input v-model="manageForm.domeOracleUrl" type="text" class="input-field text-sm py-2 px-3" placeholder="https://oracle.example.com/status" />
            </div>
          </div>
          <div class="mt-auto space-y-3 pt-5 border-t border-slate-100">
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

const studio = inject('studio');
const {
  manageForm,
  manageBusy,
  manageSnapshot,
  validManageAdmins,
  validManageManagers,
  validDomeAccounts,
  canManageTarget,
  loadAccountConfiguration,
  addRow,
  removeRow,
  setAdminsByAddress,
  setManagersByAddress,
  setDomeAccountsByAddress,
  setDomeOracleByAddress,
  requestDomeActivationByAddress
} = studio;
</script>