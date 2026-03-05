<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
    <div class="mb-8">
      <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight mb-2">Abstract Account Studio</h1>
      <p class="text-lg text-slate-500 max-w-2xl">
        Design deterministic abstract accounts, register them on-chain, and manage governance with ease.
      </p>
    </div>

    <!-- Tabs -->
    <div class="mb-8">
      <nav class="flex space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200/60 w-fit" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activePanel = tab.key"
          :class="[
            activePanel === tab.key
              ? 'bg-neo-50 text-neo-700 shadow-sm ring-1 ring-neo-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
            'px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 transform active:scale-95'
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <div class="lg:grid lg:grid-cols-12 lg:gap-8">
      <main class="lg:col-span-8 xl:col-span-9 space-y-6 relative">
        <transition name="fade-slide" mode="out-in">
          <!-- Create Panel -->
          <section v-if="activePanel === 'create'" class="bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden border border-slate-200/60 p-6 sm:p-8">
            <h2 class="text-xl font-bold text-slate-900 mb-2">Create Abstract Account</h2>
            <p class="text-sm text-slate-500 mb-8">Configure identity and signer roles, then register with a single transaction.</p>

            <div class="space-y-8">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-2">
                  <label class="block text-sm font-semibold text-slate-700">Account ID (UUID or EVM pubkey)</label>
                  <div class="flex rounded-lg shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-neo-500 transition-shadow">
                    <input
                      v-model="createForm.accountId"
                      type="text"
                      class="flex-1 bg-transparent border-0 rounded-l-lg py-2.5 px-4 font-mono text-sm text-slate-800 focus:ring-0 placeholder:text-slate-400"
                      :readonly="isEvmWallet"
                      placeholder="550e8400-e29b-41d4..."
                    />
                    <button
                      type="button"
                      class="inline-flex items-center px-4 py-2.5 border-l border-slate-200 rounded-r-lg bg-slate-50 text-slate-600 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 transition-colors"
                      @click="generateUUID"
                      :disabled="isEvmWallet"
                    >
                      Generate
                    </button>
                  </div>
                  <p class="mt-1 text-xs text-neo-600 font-medium" v-if="isEvmWallet">Using connected wallet public key.</p>
                </div>

                <div class="space-y-2">
                  <label class="block text-sm font-semibold text-slate-700">Derived Account Address</label>
                  <div class="relative">
                    <input :value="computedAddress || '—'" readonly type="text" class="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 font-mono text-sm text-slate-500 cursor-not-allowed" />
                    <div v-if="computedAddress" class="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Admins -->
                <div class="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden group hover:border-neo-200 transition-colors duration-300">
                  <div class="absolute top-0 right-0 w-32 h-32 bg-neo-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-neo-500/10 transition-colors"></div>
                  <div class="flex justify-between items-center mb-4 relative z-10">
                    <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                      <svg class="w-4 h-4 text-neo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Admins
                    </h3>
                    <button type="button" class="text-xs text-neo-600 hover:text-neo-800 font-bold bg-neo-50 px-2 py-1 rounded-md transition-colors" @click="addRow(createForm.admins)">+ Add</button>
                  </div>
                  <div class="space-y-3 mb-5 relative z-10">
                    <div v-for="(admin, index) in createForm.admins" :key="`create-admin-${index}`" class="flex gap-2 group/input">
                      <input v-model="createForm.admins[index]" type="text" class="input-field font-mono text-sm py-2 px-3" placeholder="N... or 0x..." />
                      <button type="button" class="inline-flex items-center p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors" @click="removeRow(createForm.admins, index)">
                        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                      </button>
                    </div>
                  </div>
                  <div class="flex items-center justify-between border-t border-slate-200/60 pt-4 relative z-10">
                    <label class="block text-xs font-semibold text-slate-600">Required Threshold</label>
                    <input v-model.number="createForm.adminThreshold" type="number" min="1" :max="Math.max(1, validCreateAdmins.length)" class="input-field w-20 text-center py-1 text-sm font-bold text-slate-800" />
                  </div>
                </div>

                <!-- Managers -->
                <div class="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors duration-300">
                  <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors"></div>
                  <div class="flex justify-between items-center mb-4 relative z-10">
                    <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                      <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      Managers
                    </h3>
                    <button type="button" class="text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded-md transition-colors" @click="addRow(createForm.managers)">+ Add</button>
                  </div>
                  <div class="space-y-3 mb-5 relative z-10">
                    <div v-for="(manager, index) in createForm.managers" :key="`create-manager-${index}`" class="flex gap-2 group/input">
                      <input v-model="createForm.managers[index]" type="text" class="input-field font-mono text-sm py-2 px-3" placeholder="N... or 0x..." />
                      <button type="button" class="inline-flex items-center p-2 border border-slate-200 rounded-lg bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors" @click="removeRow(createForm.managers, index)">
                        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                      </button>
                    </div>
                  </div>
                  <div class="flex items-center justify-between border-t border-slate-200/60 pt-4 relative z-10">
                    <label class="block text-xs font-semibold text-slate-600">Required Threshold</label>
                    <input v-model.number="createForm.managerThreshold" type="number" min="0" :max="Math.max(0, validCreateManagers.length)" class="input-field w-20 text-center py-1 text-sm font-bold text-slate-800" />
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700">Verification Script (Hex)</label>
                <div class="relative rounded-lg overflow-hidden border border-slate-200">
                  <textarea :value="computedScriptHex || ''" readonly class="w-full bg-slate-900 border-0 p-4 font-mono text-xs text-slate-300 placeholder:text-slate-600 focus:ring-0 resize-none h-24" placeholder="Script will appear here once valid..."></textarea>
                </div>
              </div>

              <div class="pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center gap-4">
                <button type="button" class="btn-primary w-full sm:w-auto" :disabled="isCreating || !canCreate" @click="createAccount">
                  <svg v-if="isCreating" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ isCreating ? 'Submitting Transaction...' : 'Register Abstract Account' }}
                </button>
                <span class="text-xs text-slate-500 font-medium">Requires wallet signature and <code class="bg-slate-100 px-1 rounded text-slate-700">CalledByEntry</code> scope.</span>
              </div>
            </div>
          </section>

          <!-- Manage Panel -->
          <section v-else-if="activePanel === 'manage'" class="bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden border border-slate-200/60 p-6 sm:p-8">
            <h2 class="text-xl font-bold text-slate-900 mb-2">Manage Governance</h2>
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

          <!-- Permissions Panel -->
          <section v-else-if="activePanel === 'permissions'" class="bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden border border-slate-200/60 p-6 sm:p-8">
            <h2 class="text-xl font-bold text-slate-900 mb-2">Permissions & Limits</h2>
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

          <!-- Source Panel -->
          <section v-else-if="activePanel === 'source'" class="bg-white shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden border border-slate-200 flex flex-col h-[700px]">
            <div class="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-bold text-slate-900">Contract Explorer</h2>
                <p class="text-xs text-slate-500 font-medium">C# Smart Contract Modules</p>
              </div>
            </div>
            <div class="flex flex-col md:flex-row flex-1 min-h-0">
              <div class="md:w-72 bg-slate-50/50 border-r border-slate-200 overflow-y-auto hidden md:block">
                <nav class="flex-1 p-3 space-y-1">
                  <button
                    v-for="(file, idx) in contractFiles"
                    :key="file.name"
                    @click="activeFileIdx = idx"
                    :class="[
                      activeFileIdx === idx ? 'bg-neo-100 text-neo-900 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium',
                      'group w-full flex items-center px-3 py-2.5 text-[13px] rounded-lg font-mono text-left transition-all duration-200'
                    ]"
                  >
                    <svg class="w-4 h-4 mr-2 opacity-70" :class="activeFileIdx === idx ? 'text-neo-600' : 'text-slate-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="truncate" :title="file.name">{{ file.name }}</span>
                  </button>
                </nav>
              </div>
              <div class="flex-1 bg-[#0d1117] flex flex-col min-w-0">
                <div class="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                  <div class="flex items-center gap-2">
                    <div class="flex gap-1.5 mr-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                      <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                      <div class="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                    </div>
                    <span class="text-xs font-mono text-slate-400">{{ contractFiles[activeFileIdx]?.name }}</span>
                  </div>
                  <button type="button" class="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors" @click="copyCode">
                    {{ copied ? 'Copied!' : 'Copy Code' }}
                  </button>
                </div>
                <div class="flex-1 overflow-auto p-4 md:p-6 text-[13px] font-mono text-slate-300 custom-scrollbar">
                  <highlightjs autodetect :code="contractFiles[activeFileIdx]?.content" />
                </div>
              </div>
            </div>
          </section>
        </transition>
      </main>

      <!-- Sidebar -->
      <aside class="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6 animate-fade-in" style="animation-delay: 150ms;">
        <div class="bg-white shadow-lg shadow-slate-200/40 rounded-2xl border border-slate-200/60 p-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100 to-transparent rounded-bl-full -mr-4 -mt-4"></div>
          <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-5">Pre-flight Checklist</h3>
          <ul class="space-y-4">
            <li class="flex items-start gap-3">
              <div :class="walletConnected ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'" class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              </div>
              <div>
                <span :class="walletConnected ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'" class="block text-sm">Wallet Connected</span>
                <span v-if="!walletConnected" class="text-xs text-slate-400">Connect to continue</span>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <div :class="createForm.accountId ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'" class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              </div>
              <div>
                <span :class="createForm.accountId ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'" class="block text-sm">Account ID</span>
                <span v-if="!createForm.accountId" class="text-xs text-slate-400">Provide an identifier</span>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <div :class="validCreateAdmins.length > 0 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'" class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
              </div>
              <div>
                <span :class="validCreateAdmins.length > 0 ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'" class="block text-sm">Valid Admin</span>
                <span v-if="validCreateAdmins.length === 0" class="text-xs text-slate-400">Add at least one</span>
              </div>
            </li>
          </ul>
        </div>

        <div class="bg-white shadow-lg shadow-slate-200/40 rounded-2xl border border-slate-200/60 p-6">
          <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-5">Recent Activity</h3>
          <div v-if="recentTransactions.length === 0" class="flex flex-col items-center justify-center py-6 text-center">
            <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span class="text-sm text-slate-500 font-medium">No transactions yet</span>
          </div>
          <ul v-else class="space-y-3">
            <li v-for="tx in recentTransactions" :key="tx.txid" class="text-sm border border-slate-100 rounded-xl bg-slate-50/50 p-4 hover:bg-slate-50 hover:border-slate-200 transition-colors">
              <div class="flex justify-between items-start mb-2">
                <p class="font-bold text-slate-800">{{ tx.label }}</p>
                <router-link :to="`/transaction-info/${tx.txid}`" class="text-neo-600 hover:text-neo-800 font-bold text-[11px] uppercase tracking-wider bg-neo-100/50 px-2 py-1 rounded">View</router-link>
              </div>
              <p class="text-xs text-slate-500 font-medium">{{ tx.when }}</p>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import 'highlight.js/styles/github-dark.css';
import { useStudioController } from '@/features/studio/useStudioController';

hljs.registerLanguage('csharp', csharp);
const highlightjs = hljsVuePlugin.component;

const {
  tabs,
  activePanel,
  isCreating,
  copied,
  activeFileIdx,
  recentTransactions,
  createForm,
  manageForm,
  permissionsForm,
  manageBusy,
  permissionsBusy,
  manageSnapshot,
  computedScriptHex,
  computedAddress,
  contractFiles,
  isEvmWallet,
  walletConnected,
  validCreateAdmins,
  validCreateManagers,
  validManageAdmins,
  validManageManagers,
  validDomeAccounts,
  canCreate,
  canManageTarget,
  canManagePermissions,
  addRow,
  removeRow,
  generateUUID,
  loadAccountConfiguration,
  createAccount,
  setAdminsByAddress,
  setManagersByAddress,
  setDomeAccountsByAddress,
  setDomeOracleByAddress,
  requestDomeActivationByAddress,
  setVerifierContractByAddress,
  setWhitelistModeByAddress,
  updateWhitelistByAddress,
  updateBlacklistByAddress,
  setMaxTransferByAddress,
  copyCode
} = useStudioController();
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-15px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(15px);
}

/* Base custom scrollbar for code explorer */
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #30363d;
  border-radius: 10px;
  border: 2px solid #0d1117;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #484f58;
}

:deep(.hljs) {
  background: transparent !important;
  padding: 0;
}
</style>
