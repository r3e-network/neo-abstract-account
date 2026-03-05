<template>
  <div class="tool-page aa-tool-page">
    <section class="page-container aa-shell py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Abstract Account Studio' }]" />

      <header class="aa-hero animate-rise" style="--delay: 30ms">
        <div class="aa-hero__badge">Neo N3</div>
        <h1 class="aa-hero__title">Abstract Account Studio</h1>
        <p class="aa-hero__subtitle">
          Design deterministic abstract accounts, register them on-chain, and manage governance with confidence.
        </p>
        <div class="aa-connection" :class="walletConnected ? 'connected' : 'disconnected'">
          <span class="aa-dot" />
          <span>{{ walletConnected ? `Connected: ${connectedAccount}` : 'Wallet not connected' }}</span>
        </div>
        <div class="aa-hero-actions">
          <button v-if="!walletConnected" class="aa-primary" @click="connectWallet">Connect Wallet</button>
          <button v-else class="aa-ghost" @click="disconnectWallet">Disconnect</button>
        </div>
      </header>

      <nav class="aa-tabs animate-rise" style="--delay: 90ms">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="aa-tab"
          :class="{ active: activePanel === tab.key }"
          @click="activePanel = tab.key"
        >
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div class="aa-layout">
        <main class="aa-main">
          <section v-if="activePanel === 'create'" class="aa-card animate-rise" style="--delay: 130ms">
            <div class="aa-card__head">
              <h2>Create Abstract Account</h2>
              <p>Configure identity and signer roles, then register with a single transaction.</p>
            </div>

            <div class="aa-grid two">
              <div class="aa-field">
                <label>Account ID (UUID or EVM pubkey)</label>
                <div class="aa-inline">
                  <input
                    v-model="createForm.accountId"
                    type="text"
                    class="aa-input mono"
                    :readonly="isEvmWallet"
                    placeholder="550e8400-e29b-41d4-a716-446655440000"
                  />
                  <button
                    class="aa-ghost"
                    @click="generateUUID"
                    :disabled="isEvmWallet"
                  >
                    Generate
                  </button>
                </div>
                <p class="aa-help" v-if="isEvmWallet">Using connected wallet public key as account ID.</p>
              </div>

              <div class="aa-field">
                <label>Derived Account Address</label>
                <input :value="computedAddress || '—'" readonly type="text" class="aa-input mono" />
              </div>
            </div>

            <div class="aa-grid two">
              <article class="aa-subcard">
                <div class="aa-subcard__head">
                  <h3>Admins</h3>
                  <button class="aa-link" @click="addRow(createForm.admins)">+ Add</button>
                </div>
                <div v-for="(admin, index) in createForm.admins" :key="`create-admin-${index}`" class="aa-row">
                  <input v-model="createForm.admins[index]" type="text" class="aa-input mono" placeholder="N... or 0x..." />
                  <button class="aa-icon-btn" @click="removeRow(createForm.admins, index)">✕</button>
                </div>
                <div class="aa-field compact">
                  <label>Threshold</label>
                  <input v-model.number="createForm.adminThreshold" type="number" min="1" :max="Math.max(1, validCreateAdmins.length)" class="aa-input" />
                </div>
              </article>

              <article class="aa-subcard">
                <div class="aa-subcard__head">
                  <h3>Managers</h3>
                  <button class="aa-link" @click="addRow(createForm.managers)">+ Add</button>
                </div>
                <div v-for="(manager, index) in createForm.managers" :key="`create-manager-${index}`" class="aa-row">
                  <input v-model="createForm.managers[index]" type="text" class="aa-input mono" placeholder="N... or 0x..." />
                  <button class="aa-icon-btn" @click="removeRow(createForm.managers, index)">✕</button>
                </div>
                <div class="aa-field compact">
                  <label>Threshold</label>
                  <input v-model.number="createForm.managerThreshold" type="number" min="0" :max="Math.max(0, validCreateManagers.length)" class="aa-input" />
                </div>
              </article>
            </div>

            <div class="aa-field">
              <label>Verification Script (Hex)</label>
              <textarea :value="computedScriptHex || ''" readonly class="aa-textarea mono" rows="4" />
            </div>

            <div class="aa-actions">
              <button class="aa-primary" :disabled="isCreating || !canCreate" @click="createAccount">
                {{ isCreating ? 'Submitting...' : 'Register Abstract Account' }}
              </button>
              <span class="aa-help">Requires wallet signature and CalledByEntry scope.</span>
            </div>
          </section>

          <section v-if="activePanel === 'manage'" class="aa-card animate-rise" style="--delay: 130ms">
            <div class="aa-card__head">
              <h2>Manage Account Governance</h2>
              <p>Operate policy and recovery controls for an existing abstract account.</p>
            </div>

            <div class="aa-field">
              <label>Target Account Address (Neo N3)</label>
              <input
                v-model="manageForm.accountAddress"
                type="text"
                class="aa-input mono"
                placeholder="N..."
              />
              <p class="aa-help">This address is used by all management transactions below.</p>
            </div>

            <div class="aa-actions manage-load-actions">
              <button class="aa-secondary" :disabled="manageBusy.load || !canManageTarget" @click="loadAccountConfiguration">
                {{ manageBusy.load ? 'Loading...' : 'Load Current Configuration' }}
              </button>
              <span class="aa-help">Reads current admin, manager, and dome settings from chain.</span>
            </div>

            <div v-if="manageSnapshot.loadedAt" class="manage-meta">
              <p><strong>Loaded:</strong> {{ manageSnapshot.loadedAt }}</p>
              <p v-if="manageSnapshot.accountIdHex"><strong>Account ID:</strong> <span class="mono">{{ manageSnapshot.accountIdHex }}</span></p>
              <p><strong>Last Active (ms):</strong> {{ manageSnapshot.lastActiveMs }}</p>
              <p v-if="manageSnapshot.domeUnlocked !== null">
                <strong>Dome Oracle Unlocked:</strong> {{ manageSnapshot.domeUnlocked ? 'Yes' : 'No' }}
              </p>
            </div>

            <div class="aa-grid two">
              <article class="aa-subcard">
                <div class="aa-subcard__head">
                  <h3>Update Admin Set</h3>
                  <button class="aa-link" @click="addRow(manageForm.admins)">+ Add</button>
                </div>
                <div v-for="(admin, index) in manageForm.admins" :key="`manage-admin-${index}`" class="aa-row">
                  <input v-model="manageForm.admins[index]" type="text" class="aa-input mono" placeholder="N... or 0x..." />
                  <button class="aa-icon-btn" @click="removeRow(manageForm.admins, index)">✕</button>
                </div>
                <div class="aa-field compact">
                  <label>Threshold</label>
                  <input v-model.number="manageForm.adminThreshold" type="number" min="1" :max="Math.max(1, validManageAdmins.length)" class="aa-input" />
                </div>
                <button class="aa-secondary" :disabled="manageBusy.admins || !canManageTarget || validManageAdmins.length === 0" @click="setAdminsByAddress">
                  {{ manageBusy.admins ? 'Updating...' : 'Submit Admin Update' }}
                </button>
              </article>

              <article class="aa-subcard">
                <div class="aa-subcard__head">
                  <h3>Update Manager Set</h3>
                  <button class="aa-link" @click="addRow(manageForm.managers)">+ Add</button>
                </div>
                <div v-for="(manager, index) in manageForm.managers" :key="`manage-manager-${index}`" class="aa-row">
                  <input v-model="manageForm.managers[index]" type="text" class="aa-input mono" placeholder="N... or 0x..." />
                  <button class="aa-icon-btn" @click="removeRow(manageForm.managers, index)">✕</button>
                </div>
                <div class="aa-field compact">
                  <label>Threshold</label>
                  <input v-model.number="manageForm.managerThreshold" type="number" min="0" :max="Math.max(0, validManageManagers.length)" class="aa-input" />
                </div>
                <button class="aa-secondary" :disabled="manageBusy.managers || !canManageTarget" @click="setManagersByAddress">
                  {{ manageBusy.managers ? 'Updating...' : 'Submit Manager Update' }}
                </button>
              </article>
            </div>

            <div class="aa-grid two">
              <article class="aa-subcard">
                <div class="aa-subcard__head">
                  <h3>Dome Recovery Accounts</h3>
                  <button class="aa-link" @click="addRow(manageForm.domeAccounts)">+ Add</button>
                </div>
                <div v-for="(dome, index) in manageForm.domeAccounts" :key="`dome-${index}`" class="aa-row">
                  <input v-model="manageForm.domeAccounts[index]" type="text" class="aa-input mono" placeholder="N... or 0x..." />
                  <button class="aa-icon-btn" @click="removeRow(manageForm.domeAccounts, index)">✕</button>
                </div>
                <div class="aa-grid two compact-grid">
                  <div class="aa-field compact">
                    <label>Dome Threshold</label>
                    <input v-model.number="manageForm.domeThreshold" type="number" min="0" :max="Math.max(0, validDomeAccounts.length)" class="aa-input" />
                  </div>
                  <div class="aa-field compact">
                    <label>Timeout (hours)</label>
                    <input v-model.number="manageForm.domeTimeoutHours" type="number" min="0" step="1" class="aa-input" />
                  </div>
                </div>
                <button class="aa-secondary" :disabled="manageBusy.domeAccounts || !canManageTarget" @click="setDomeAccountsByAddress">
                  {{ manageBusy.domeAccounts ? 'Updating...' : 'Update Dome Configuration' }}
                </button>
              </article>

              <article class="aa-subcard">
                <div class="aa-subcard__head">
                  <h3>Dome Oracle</h3>
                </div>
                <div class="aa-field">
                  <label>Oracle URL</label>
                  <input v-model="manageForm.domeOracleUrl" type="text" class="aa-input" placeholder="https://oracle.example.com/dome/status" />
                </div>
                <div class="aa-stack-actions">
                  <button class="aa-secondary" :disabled="manageBusy.domeOracle || !canManageTarget" @click="setDomeOracleByAddress">
                    {{ manageBusy.domeOracle ? 'Updating...' : 'Set Dome Oracle' }}
                  </button>
                  <button class="aa-warning" :disabled="manageBusy.domeActivation || !canManageTarget" @click="requestDomeActivationByAddress">
                    {{ manageBusy.domeActivation ? 'Requesting...' : 'Request Dome Activation' }}
                  </button>
                </div>
                <p class="aa-help">Use activation only when inactivity timeout has elapsed and recovery should be enabled.</p>
              </article>
            </div>
          </section>

          <section v-if="activePanel === 'source'" class="aa-card animate-rise" style="--delay: 130ms">
            <div class="aa-card__head">
              <h2>Contract Source Explorer</h2>
              <p>Browse the exact contract modules shipped with this tool.</p>
            </div>

            <div class="code-shell">
              <aside class="code-files">
                <button
                  v-for="(file, idx) in contractFiles"
                  :key="file.name"
                  class="code-file"
                  :class="{ active: activeFileIdx === idx }"
                  @click="activeFileIdx = idx"
                >
                  {{ file.name }}
                </button>
              </aside>
              <div class="code-view">
                <div class="code-head">
                  <span>{{ contractFiles[activeFileIdx]?.name }}</span>
                  <button class="aa-ghost mini" @click="copyCode">{{ copied ? 'Copied' : 'Copy' }}</button>
                </div>
                <div class="code-body">
                  <highlightjs autodetect :code="contractFiles[activeFileIdx]?.content" />
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside class="aa-sidebar animate-rise" style="--delay: 180ms">
          <article class="aa-card slim">
            <h3>Checklist</h3>
            <ul class="checklist">
              <li :class="{ ok: walletConnected }">Wallet connected</li>
              <li :class="{ ok: !!createForm.accountId }">Account ID prepared</li>
              <li :class="{ ok: validCreateAdmins.length > 0 }">At least one admin</li>
              <li :class="{ ok: !!computedAddress }">Deterministic address derived</li>
              <li :class="{ ok: !!manageForm.accountAddress }">Manage target selected</li>
            </ul>
          </article>

          <article class="aa-card slim">
            <h3>Recent Transactions</h3>
            <div v-if="recentTransactions.length === 0" class="empty-note">No transactions yet.</div>
            <ul v-else class="tx-list">
              <li v-for="tx in recentTransactions" :key="tx.txid" class="tx-item">
                <div>
                  <p class="tx-label">{{ tx.label }}</p>
                  <p class="tx-time">{{ tx.when }}</p>
                </div>
                <router-link :to="`/transaction-info/${tx.txid}`" class="tx-link">View</router-link>
              </li>
            </ul>
          </article>

          <article class="aa-card slim" v-if="lastTxHash">
            <h3>Latest Tx Hash</h3>
            <p class="mono hash">{{ lastTxHash }}</p>
          </article>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Breadcrumb from '@/components/common/Breadcrumb.vue';
import { connectedAccount } from '@/utils/wallet';
import { walletService, getAbstractAccountHash } from '@/services/walletService';
import { useToast } from 'vue-toastification';

import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import hljsVuePlugin from '@highlightjs/vue-plugin';
import 'highlight.js/styles/github-dark.css';

import code_Main from '@/contracts/AbstractAccount.cs?raw';
import code_AccountLifecycle from '@/contracts/AbstractAccount.AccountLifecycle.cs?raw';
import code_Admin from '@/contracts/AbstractAccount.Admin.cs?raw';
import code_ExecutionAndPermissions from '@/contracts/AbstractAccount.ExecutionAndPermissions.cs?raw';
import code_MetaTx from '@/contracts/AbstractAccount.MetaTx.cs?raw';
import code_Oracle from '@/contracts/AbstractAccount.Oracle.cs?raw';
import code_StorageAndContext from '@/contracts/AbstractAccount.StorageAndContext.cs?raw';
import code_Upgrade from '@/contracts/AbstractAccount.Upgrade.cs?raw';

hljs.registerLanguage('csharp', csharp);
const highlightjs = hljsVuePlugin.component;

const toast = useToast();
let neonJs = null;

const tabs = [
  { key: 'create', label: 'Create' },
  { key: 'manage', label: 'Manage' },
  { key: 'source', label: 'Source' }
];

const activePanel = ref('create');
const isCreating = ref(false);
const copied = ref(false);
const activeFileIdx = ref(0);
const recentTransactions = ref([]);
const lastTxHash = ref('');

const createForm = ref({
  accountId: '',
  admins: [''],
  adminThreshold: 1,
  managers: [],
  managerThreshold: 0
});

const manageForm = ref({
  accountAddress: '',
  admins: [''],
  adminThreshold: 1,
  managers: [],
  managerThreshold: 0,
  domeAccounts: [],
  domeThreshold: 0,
  domeTimeoutHours: 0,
  domeOracleUrl: ''
});

const manageBusy = ref({
  load: false,
  admins: false,
  managers: false,
  domeAccounts: false,
  domeOracle: false,
  domeActivation: false
});

const manageSnapshot = ref({
  loadedAt: '',
  accountIdHex: '',
  lastActiveMs: 0,
  domeUnlocked: null
});
const rpcClientRef = ref(null);
const rpcUrlRef = ref('');

const computedScriptHex = ref('');
const computedAddress = ref('');

const contractFiles = [
  { name: 'AbstractAccount.cs', content: code_Main },
  { name: 'AbstractAccount.AccountLifecycle.cs', content: code_AccountLifecycle },
  { name: 'AbstractAccount.Admin.cs', content: code_Admin },
  { name: 'AbstractAccount.ExecutionAndPermissions.cs', content: code_ExecutionAndPermissions },
  { name: 'AbstractAccount.MetaTx.cs', content: code_MetaTx },
  { name: 'AbstractAccount.Oracle.cs', content: code_Oracle },
  { name: 'AbstractAccount.StorageAndContext.cs', content: code_StorageAndContext },
  { name: 'AbstractAccount.Upgrade.cs', content: code_Upgrade }
];

const isEvmWallet = computed(() => walletService.provider === walletService.PROVIDERS.EVM_WALLET);
const walletConnected = computed(() => !!connectedAccount.value);

const validCreateAdmins = computed(() => sanitizeList(createForm.value.admins));
const validCreateManagers = computed(() => sanitizeList(createForm.value.managers));
const validManageAdmins = computed(() => sanitizeList(manageForm.value.admins));
const validManageManagers = computed(() => sanitizeList(manageForm.value.managers));
const validDomeAccounts = computed(() => sanitizeList(manageForm.value.domeAccounts));

const canCreate = computed(() => {
  if (!walletConnected.value) return false;
  if (!createForm.value.accountId || !computedAddress.value) return false;
  if (validCreateAdmins.value.length === 0) return false;
  if (createForm.value.adminThreshold < 1 || createForm.value.adminThreshold > validCreateAdmins.value.length) return false;
  if (validCreateManagers.value.length === 0) {
    return createForm.value.managerThreshold === 0;
  }
  return createForm.value.managerThreshold > 0 && createForm.value.managerThreshold <= validCreateManagers.value.length;
});

const canManageTarget = computed(() => !!manageForm.value.accountAddress && walletConnected.value);

watch(connectedAccount, () => {
  if (isEvmWallet.value && walletService.account?.pubKey) {
    createForm.value.accountId = walletService.account.pubKey;
  } else if (isEvmWallet.value) {
    const account = connectedAccount.value ? connectedAccount.value.toLowerCase() : '';
    const cached = account ? localStorage.getItem(`evm_pubkey_${account}`) : '';
    if (cached) createForm.value.accountId = cached;
  } else if (!createForm.value.accountId || createForm.value.accountId.length === 130) {
    generateUUID();
  }
}, { immediate: true });

watch(() => createForm.value.accountId, computeAA);
watch(validCreateAdmins, (admins) => {
  if (admins.length === 0) createForm.value.adminThreshold = 1;
  if (createForm.value.adminThreshold > Math.max(1, admins.length)) {
    createForm.value.adminThreshold = Math.max(1, admins.length);
  }
});
watch(validCreateManagers, (managers) => {
  if (managers.length === 0) {
    createForm.value.managerThreshold = 0;
    return;
  }
  if (createForm.value.managerThreshold < 1) createForm.value.managerThreshold = 1;
  if (createForm.value.managerThreshold > managers.length) createForm.value.managerThreshold = managers.length;
});
watch(validManageAdmins, (admins) => {
  if (admins.length === 0) manageForm.value.adminThreshold = 1;
  if (manageForm.value.adminThreshold > Math.max(1, admins.length)) {
    manageForm.value.adminThreshold = Math.max(1, admins.length);
  }
});
watch(validManageManagers, (managers) => {
  if (managers.length === 0) {
    manageForm.value.managerThreshold = 0;
    return;
  }
  if (manageForm.value.managerThreshold < 1) manageForm.value.managerThreshold = 1;
  if (manageForm.value.managerThreshold > managers.length) manageForm.value.managerThreshold = managers.length;
});
watch(validDomeAccounts, (domeAccounts) => {
  if (domeAccounts.length === 0) {
    manageForm.value.domeThreshold = 0;
    return;
  }
  if (manageForm.value.domeThreshold < 1) manageForm.value.domeThreshold = 1;
  if (manageForm.value.domeThreshold > domeAccounts.length) manageForm.value.domeThreshold = domeAccounts.length;
});

onMounted(async () => {
  try {
    neonJs = window.Neon || await import('@cityofzion/neon-js');
    if (!isEvmWallet.value) generateUUID();
    computeAA();
  } catch (err) {
    console.error(err);
    toast.error('Failed to load neon-js for address derivation.');
  }
});

function sanitizeList(items) {
  return items.map((value) => value.trim()).filter((value) => value.length > 0);
}

function addRow(listRef) {
  listRef.push('');
}

function removeRow(listRef, index) {
  listRef.splice(index, 1);
}

function generateUUID() {
  createForm.value.accountId = crypto.randomUUID();
}

function normalizeAccountId(value) {
  if (isEvmWallet.value && /^[0-9a-fA-F]{130}$/.test(value)) {
    return value;
  }

  let hex = '';
  for (let i = 0; i < value.length; i++) {
    hex += value.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

function normalizeAddress(input) {
  const value = input.trim();
  if (!value) return value;

  if (value.startsWith('N') && value.length === 34) {
    return neonJs.wallet.getScriptHashFromAddress(value);
  }
  if (value.startsWith('0x')) {
    return value.slice(2);
  }
  return value;
}

function hash160Param(value) {
  const normalized = normalizeAddress(value);
  if (!/^[0-9a-fA-F]{40}$/.test(normalized)) {
    throw new Error(`Invalid address format: ${value}`);
  }
  return normalized;
}

function toHashArray(values) {
  return values.map((value) => ({ type: 'Hash160', value: hash160Param(value) }));
}

function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

function base64ToHex(base64Value) {
  if (!base64Value) return '';
  try {
    const binary = atob(base64Value);
    let hex = '';
    for (let i = 0; i < binary.length; i++) {
      hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex.toLowerCase();
  } catch (_) {
    return '';
  }
}

function decodeStackInteger(item) {
  if (!item || typeof item !== 'object') return 0;
  if (item.type === 'Integer') {
    const parsed = Number(item.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (item.type === 'Boolean') {
    return item.value ? 1 : 0;
  }
  return 0;
}

function decodeStackBoolean(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.type === 'Boolean') return !!item.value;
  if (item.type === 'Integer') return Number(item.value) !== 0;
  if (item.type === 'ByteString') {
    const hex = base64ToHex(item.value);
    return hex === '01' || hex === '31';
  }
  return false;
}

function decodeStackByteStringHex(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.type === 'ByteString') return base64ToHex(item.value);
  return '';
}

function decodeStackHash160(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.type === 'Hash160') return sanitizeHex(item.value);
  if (item.type === 'ByteString') return sanitizeHex(base64ToHex(item.value));
  return '';
}

function decodeStackHashArray(item) {
  if (!item || item.type !== 'Array' || !Array.isArray(item.value)) return [];
  return item.value.map((entry) => decodeStackHash160(entry)).filter((entry) => !!entry);
}

function normalizeThreshold(rawValue, maxMembers, fallbackForEmpty) {
  if (maxMembers <= 0) return fallbackForEmpty;
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 1) return 1;
  if (value > maxMembers) return maxMembers;
  return value;
}

function resolveRpcUrl() {
  const fromWalletService = walletService?.rpcUrl
    || walletService?.network?.rpcUrl
    || walletService?.network?.rpc
    || walletService?.providerRpc;
  return fromWalletService || 'https://testnet1.neo.coz.io:443';
}

function getRpcClient() {
  const rpcUrl = resolveRpcUrl();
  if (rpcClientRef.value && rpcUrlRef.value === rpcUrl) return rpcClientRef.value;
  rpcClientRef.value = new neonJs.rpc.RPCClient(rpcUrl);
  rpcUrlRef.value = rpcUrl;
  return rpcClientRef.value;
}

async function invokeReadOperation(operation, args = []) {
  const aaHash = getAbstractAccountHash();
  if (!aaHash) {
    throw new Error('Master Abstract Account contract not found in environment config.');
  }

  const script = neonJs.sc.createScript({ scriptHash: aaHash, operation, args });
  const rpcClient = getRpcClient();
  const response = await rpcClient.invokeScript(neonJs.u.HexString.fromHex(script), []);
  if (response?.state === 'FAULT') {
    throw new Error(`${operation} failed: ${response.exception || 'VM fault'}`);
  }
  return response;
}

function formatErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.description || err.message || err.error?.message || JSON.stringify(err);
}

function pushTransaction(label, txid) {
  lastTxHash.value = txid;
  recentTransactions.value = [
    {
      label,
      txid,
      when: new Date().toLocaleString()
    },
    ...recentTransactions.value
  ].slice(0, 8);
}

async function computeAA() {
  if (!createForm.value.accountId || !neonJs) {
    computedScriptHex.value = '';
    computedAddress.value = '';
    return;
  }

  try {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) return;

    const accountIdHex = normalizeAccountId(createForm.value.accountId);
    const script = neonJs.sc.createScript({
      scriptHash: aaHash,
      operation: 'verify',
      args: [neonJs.sc.ContractParam.byteArray(accountIdHex)]
    });

    computedScriptHex.value = script;
    const scriptHash = neonJs.u.reverseHex(neonJs.u.hash160(script));
    computedAddress.value = neonJs.wallet.getAddressFromScriptHash(scriptHash);
  } catch (err) {
    console.error(err);
    computedScriptHex.value = '';
    computedAddress.value = '';
  }
}

function requireWallet() {
  if (!walletConnected.value || !walletService.isConnected) {
    toast.error('Please connect your wallet first.');
    return false;
  }
  return true;
}

async function invokeOperation(label, operation, args) {
  const aaHash = getAbstractAccountHash();
  if (!aaHash) {
    throw new Error('Master Abstract Account contract not found in environment config.');
  }

  const result = await walletService.invoke({
    scriptHash: aaHash,
    operation,
    args,
    signers: [{ account: connectedAccount.value, scopes: 1 }]
  });

  const txid = result?.txid || '';
  if (!txid) {
    throw new Error('No transaction ID returned by wallet provider.');
  }

  pushTransaction(label, txid);
  toast.success(`${label} transaction submitted.`);
}

async function connectWallet() {
  try {
    if (window.neo3Dapi?.getAccount) {
      const result = await window.neo3Dapi.getAccount();
      const address = result?.address || result?.account?.address || '';
      if (!address) throw new Error('Wallet did not return an account address.');
      walletService.setConnected(address);
      toast.success(`Connected: ${address}`);
      return;
    }

    if (window.NEOLineN3?.getAccount) {
      const result = await window.NEOLineN3.getAccount();
      const address = result?.address || result?.account?.address || '';
      if (!address) throw new Error('Wallet did not return an account address.');
      walletService.setConnected(address);
      toast.success(`Connected: ${address}`);
      return;
    }

    throw new Error('No supported Neo wallet provider detected in browser.');
  } catch (err) {
    console.error(err);
    toast.error(`Connect failed: ${formatErrorMessage(err)}`);
  }
}

function disconnectWallet() {
  walletService.setConnected('');
  toast.info('Wallet disconnected.');
}

async function loadAccountConfiguration() {
  if (!requireWallet() || !canManageTarget.value) return;
  if (!neonJs) {
    toast.error('neon-js is not ready yet. Please retry.');
    return;
  }

  manageBusy.value.load = true;
  try {
    const accountHash = hash160Param(manageForm.value.accountAddress);

    const [
      adminsRes,
      adminThresholdRes,
      managersRes,
      managerThresholdRes,
      domeAccountsRes,
      domeThresholdRes,
      domeTimeoutRes,
      lastActiveRes,
      accountIdRes
    ] = await Promise.all([
      invokeReadOperation('getAdminsByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getAdminThresholdByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getManagersByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getManagerThresholdByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getDomeAccountsByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getDomeThresholdByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getDomeTimeoutByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getLastActiveTimestampByAddress', [{ type: 'Hash160', value: accountHash }]),
      invokeReadOperation('getAccountIdByAddress', [{ type: 'Hash160', value: accountHash }])
    ]);

    const admins = decodeStackHashArray(adminsRes?.stack?.[0]);
    const managers = decodeStackHashArray(managersRes?.stack?.[0]);
    const domeAccounts = decodeStackHashArray(domeAccountsRes?.stack?.[0]);

    const adminThreshold = decodeStackInteger(adminThresholdRes?.stack?.[0]);
    const managerThreshold = decodeStackInteger(managerThresholdRes?.stack?.[0]);
    const domeThreshold = decodeStackInteger(domeThresholdRes?.stack?.[0]);
    const domeTimeoutSeconds = decodeStackInteger(domeTimeoutRes?.stack?.[0]);
    const lastActiveMs = decodeStackInteger(lastActiveRes?.stack?.[0]);
    const accountIdHex = decodeStackByteStringHex(accountIdRes?.stack?.[0]);

    manageForm.value.admins = admins.length > 0 ? admins.map((value) => `0x${value}`) : [''];
    manageForm.value.adminThreshold = normalizeThreshold(adminThreshold, admins.length, 1);

    manageForm.value.managers = managers.length > 0 ? managers.map((value) => `0x${value}`) : [];
    manageForm.value.managerThreshold = managers.length > 0
      ? normalizeThreshold(managerThreshold, managers.length, 0)
      : 0;

    manageForm.value.domeAccounts = domeAccounts.length > 0 ? domeAccounts.map((value) => `0x${value}`) : [];
    manageForm.value.domeThreshold = domeAccounts.length > 0
      ? normalizeThreshold(domeThreshold, domeAccounts.length, 0)
      : 0;
    manageForm.value.domeTimeoutHours = domeTimeoutSeconds > 0
      ? Number((domeTimeoutSeconds / 3600).toFixed(2))
      : 0;

    let domeUnlocked = null;
    if (accountIdHex) {
      try {
        const domeUnlockRes = await invokeReadOperation('isDomeOracleUnlocked', [
          { type: 'ByteArray', value: accountIdHex }
        ]);
        domeUnlocked = decodeStackBoolean(domeUnlockRes?.stack?.[0]);
      } catch (_) {
        domeUnlocked = null;
      }
    }

    manageSnapshot.value = {
      loadedAt: new Date().toLocaleString(),
      accountIdHex: accountIdHex ? `0x${accountIdHex}` : '',
      lastActiveMs,
      domeUnlocked
    };

    toast.success('Current account configuration loaded.');
  } catch (err) {
    console.error(err);
    toast.error(`Load failed: ${formatErrorMessage(err)}`);
  } finally {
    manageBusy.value.load = false;
  }
}

async function createAccount() {
  if (!requireWallet()) return;
  if (!canCreate.value) {
    toast.error('Please complete required account configuration fields.');
    return;
  }

  isCreating.value = true;
  try {
    const accountIdHex = normalizeAccountId(createForm.value.accountId);
    const accountScriptHash = hash160Param(computedAddress.value);

    await invokeOperation('Create account', 'createAccountWithAddress', [
      { type: 'ByteArray', value: accountIdHex },
      { type: 'Hash160', value: accountScriptHash },
      { type: 'Array', value: toHashArray(validCreateAdmins.value) },
      { type: 'Integer', value: createForm.value.adminThreshold },
      { type: 'Array', value: toHashArray(validCreateManagers.value) },
      { type: 'Integer', value: createForm.value.managerThreshold }
    ]);
  } catch (err) {
    console.error(err);
    toast.error(`Creation failed: ${formatErrorMessage(err)}`);
  } finally {
    isCreating.value = false;
  }
}

async function setAdminsByAddress() {
  if (!requireWallet() || !canManageTarget.value) return;
  if (validManageAdmins.value.length === 0) {
    toast.error('Provide at least one admin address.');
    return;
  }

  manageBusy.value.admins = true;
  try {
    await invokeOperation('Set admins', 'setAdminsByAddress', [
      { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
      { type: 'Array', value: toHashArray(validManageAdmins.value) },
      { type: 'Integer', value: manageForm.value.adminThreshold }
    ]);
  } catch (err) {
    console.error(err);
    toast.error(`Admin update failed: ${formatErrorMessage(err)}`);
  } finally {
    manageBusy.value.admins = false;
  }
}

async function setManagersByAddress() {
  if (!requireWallet() || !canManageTarget.value) return;

  manageBusy.value.managers = true;
  try {
    await invokeOperation('Set managers', 'setManagersByAddress', [
      { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
      { type: 'Array', value: toHashArray(validManageManagers.value) },
      { type: 'Integer', value: manageForm.value.managerThreshold }
    ]);
  } catch (err) {
    console.error(err);
    toast.error(`Manager update failed: ${formatErrorMessage(err)}`);
  } finally {
    manageBusy.value.managers = false;
  }
}

async function setDomeAccountsByAddress() {
  if (!requireWallet() || !canManageTarget.value) return;

  const timeoutHours = Number(manageForm.value.domeTimeoutHours || 0);
  const timeoutSeconds = Math.floor(timeoutHours * 3600);

  if (validDomeAccounts.value.length > 0 && timeoutSeconds <= 0) {
    toast.error('Dome timeout must be greater than 0 when dome accounts are configured.');
    return;
  }
  if (validDomeAccounts.value.length === 0 && (manageForm.value.domeThreshold !== 0 || timeoutSeconds !== 0)) {
    toast.error('Dome threshold/timeout must be 0 when no dome accounts are configured.');
    return;
  }

  manageBusy.value.domeAccounts = true;
  try {
    await invokeOperation('Set dome accounts', 'setDomeAccountsByAddress', [
      { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
      { type: 'Array', value: toHashArray(validDomeAccounts.value) },
      { type: 'Integer', value: manageForm.value.domeThreshold },
      { type: 'Integer', value: timeoutSeconds }
    ]);
  } catch (err) {
    console.error(err);
    toast.error(`Dome configuration failed: ${formatErrorMessage(err)}`);
  } finally {
    manageBusy.value.domeAccounts = false;
  }
}

async function setDomeOracleByAddress() {
  if (!requireWallet() || !canManageTarget.value) return;

  manageBusy.value.domeOracle = true;
  try {
    await invokeOperation('Set dome oracle', 'setDomeOracleByAddress', [
      { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) },
      { type: 'String', value: manageForm.value.domeOracleUrl.trim() }
    ]);
  } catch (err) {
    console.error(err);
    toast.error(`Oracle update failed: ${formatErrorMessage(err)}`);
  } finally {
    manageBusy.value.domeOracle = false;
  }
}

async function requestDomeActivationByAddress() {
  if (!requireWallet() || !canManageTarget.value) return;

  manageBusy.value.domeActivation = true;
  try {
    await invokeOperation('Request dome activation', 'requestDomeActivationByAddress', [
      { type: 'Hash160', value: hash160Param(manageForm.value.accountAddress) }
    ]);
  } catch (err) {
    console.error(err);
    toast.error(`Activation request failed: ${formatErrorMessage(err)}`);
  } finally {
    manageBusy.value.domeActivation = false;
  }
}

function copyCode() {
  const content = contractFiles[activeFileIdx.value]?.content;
  if (!content) return;
  navigator.clipboard.writeText(content).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1800);
  });
}
</script>

<style scoped>
.aa-tool-page {
  --aa-ink: #13222d;
  --aa-ink-soft: #52606a;
  --aa-paper: #f4f6f2;
  --aa-surface: #fffef8;
  --aa-surface-alt: #eef3ea;
  --aa-border: #d0d9cf;
  --aa-accent: #0f766e;
  --aa-accent-strong: #0b5f58;
  --aa-warn: #c95b20;
  --aa-shadow: 0 14px 38px rgba(16, 45, 45, 0.12);
  background:
    radial-gradient(circle at 10% 0%, #d8e7df 0%, transparent 42%),
    radial-gradient(circle at 100% 18%, #f6dfc6 0%, transparent 38%),
    linear-gradient(160deg, #f0f4ef 0%, #f9f7ef 100%);
  min-height: 100vh;
}

.aa-shell {
  font-family: 'Space Grotesk', 'Avenir Next', 'Trebuchet MS', sans-serif;
  color: var(--aa-ink);
}

.aa-hero,
.aa-card,
.aa-tabs {
  border: 1px solid var(--aa-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--aa-surface) 94%, white 6%);
  box-shadow: var(--aa-shadow);
}

.aa-hero {
  padding: 1.35rem 1.5rem;
  margin-top: 1rem;
  position: relative;
  overflow: hidden;
}

.aa-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(15, 118, 110, 0.08), rgba(201, 91, 32, 0.08));
  pointer-events: none;
}

.aa-hero__badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #d8ece8;
  color: #0d5e57;
  font-weight: 700;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.7rem;
  margin-bottom: 0.75rem;
}

.aa-hero__title {
  font-size: clamp(1.6rem, 2.8vw, 2.4rem);
  line-height: 1.15;
  font-weight: 800;
  margin: 0;
}

.aa-hero__subtitle {
  margin-top: 0.55rem;
  margin-bottom: 1rem;
  color: var(--aa-ink-soft);
  max-width: 54rem;
}

.aa-connection {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--aa-border);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  background: #ffffffcf;
}

.aa-connection.connected {
  color: #0d5f58;
}

.aa-connection.disconnected {
  color: #7a4b32;
}

.aa-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.aa-hero-actions {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.aa-tabs {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0.5rem;
}

.aa-tab {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  padding: 0.65rem 0.8rem;
  font-weight: 700;
  color: var(--aa-ink-soft);
  transition: all 160ms ease;
}

.aa-tab.active {
  background: #ffffff;
  border-color: #b7d0cb;
  color: #084d47;
}

.aa-layout {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 1rem;
}

.aa-main,
.aa-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.aa-card {
  padding: 1.1rem;
}

.aa-card.slim {
  padding: 1rem;
}

.aa-card__head h2,
.aa-card__head h3 {
  margin: 0;
  font-weight: 800;
}

.aa-card__head p {
  margin-top: 0.25rem;
  color: var(--aa-ink-soft);
  font-size: 0.92rem;
}

.aa-grid {
  display: grid;
  gap: 0.8rem;
}

.aa-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.aa-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.85rem;
}

.aa-field.compact {
  margin-top: 0.45rem;
}

.aa-field label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #35515f;
}

.aa-input,
.aa-textarea {
  border: 1px solid #bdc9bf;
  border-radius: 12px;
  background: #fffffc;
  padding: 0.62rem 0.72rem;
  color: var(--aa-ink);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.aa-input:focus,
.aa-textarea:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.13);
}

.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.aa-inline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
}

.aa-help {
  font-size: 0.79rem;
  color: var(--aa-ink-soft);
}

.aa-subcard {
  border: 1px solid #cad5cb;
  border-radius: 15px;
  background: #f8fbf6;
  padding: 0.8rem;
}

.aa-subcard__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.aa-subcard__head h3 {
  font-size: 0.98rem;
}

.aa-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.42rem;
  margin-top: 0.45rem;
}

.aa-icon-btn,
.aa-link,
.aa-ghost,
.aa-secondary,
.aa-primary,
.aa-warning {
  border-radius: 11px;
  border: 1px solid transparent;
  font-weight: 700;
  transition: all 150ms ease;
}

.aa-link {
  border: none;
  background: none;
  color: #0e6962;
  font-size: 0.8rem;
}

.aa-ghost {
  border-color: #bdd1cc;
  background: #ffffff;
  color: #205c58;
  padding: 0.58rem 0.75rem;
}

.aa-ghost.mini {
  font-size: 0.78rem;
  padding: 0.35rem 0.58rem;
}

.aa-icon-btn {
  border-color: #d3dad4;
  background: #ffffff;
  color: #5e6f7a;
  width: 2.2rem;
}

.aa-actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem;
}

.manage-load-actions {
  margin-top: 0.25rem;
}

.manage-meta {
  border: 1px solid #c6d7cf;
  background: #eef7f3;
  border-radius: 12px;
  padding: 0.6rem 0.72rem;
  margin-top: 0.5rem;
  display: grid;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: #2a4f58;
}

.manage-meta p {
  margin: 0;
}

.aa-primary,
.aa-secondary,
.aa-warning {
  padding: 0.6rem 0.88rem;
  cursor: pointer;
}

.aa-primary {
  background: linear-gradient(120deg, var(--aa-accent), #1f8f86);
  color: #f8ffff;
}

.aa-secondary {
  background: #e4efea;
  border-color: #bad0ca;
  color: #0f5f58;
  margin-top: 0.8rem;
}

.aa-warning {
  background: #fbe4d6;
  border-color: #e8b292;
  color: #8a3e16;
}

.aa-stack-actions {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.4rem;
}

.aa-primary:disabled,
.aa-secondary:disabled,
.aa-warning:disabled,
.aa-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.compact-grid {
  margin-top: 0.4rem;
}

.code-shell {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  border: 1px solid #2a3a3f;
  border-radius: 14px;
  overflow: hidden;
}

.code-files {
  background: #132126;
  max-height: 520px;
  overflow: auto;
}

.code-file {
  width: 100%;
  text-align: left;
  border: none;
  border-bottom: 1px solid rgba(179, 199, 193, 0.22);
  background: transparent;
  color: #b7cec7;
  padding: 0.62rem 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
}

.code-file.active {
  background: #20464a;
  color: #dbf5ef;
}

.code-view {
  background: #0b1113;
  color: #d8e0dd;
}

.code-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(194, 208, 201, 0.18);
  padding: 0.55rem 0.75rem;
  font-size: 0.83rem;
}

.code-body {
  max-height: 520px;
  overflow: auto;
  padding: 0.8rem;
}

:deep(.code-body pre) {
  margin: 0;
  background: transparent !important;
}

.checklist,
.tx-list {
  list-style: none;
  padding: 0;
  margin: 0.8rem 0 0;
  display: grid;
  gap: 0.5rem;
}

.checklist li {
  border-radius: 10px;
  border: 1px solid #d3ddd4;
  background: #fbfcf8;
  padding: 0.46rem 0.58rem;
  font-size: 0.85rem;
  color: #4f606a;
}

.checklist li.ok {
  color: #0f5f58;
  border-color: #9ec8b9;
  background: #eaf5f1;
}

.tx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid #d3ddd4;
  background: #fbfcf8;
  border-radius: 10px;
  padding: 0.5rem 0.55rem;
}

.tx-label {
  margin: 0;
  font-weight: 700;
  font-size: 0.84rem;
}

.tx-time {
  margin: 0.1rem 0 0;
  font-size: 0.74rem;
  color: #65757d;
}

.tx-link {
  font-size: 0.78rem;
  color: #0e6b64;
  font-weight: 700;
}

.hash {
  margin-top: 0.7rem;
  word-break: break-all;
  font-size: 0.74rem;
  background: #f4f8f4;
  border: 1px solid #d0dad1;
  border-radius: 10px;
  padding: 0.5rem;
}

.empty-note {
  margin-top: 0.7rem;
  font-size: 0.84rem;
  color: #708089;
}

.animate-rise {
  animation: rise-in 360ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
  animation-delay: var(--delay, 0ms);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(9px) scale(0.992);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1100px) {
  .aa-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 860px) {
  .aa-grid.two,
  .code-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .code-files {
    max-height: 220px;
  }
}

@media (max-width: 620px) {
  .aa-tabs {
    grid-template-columns: 1fr;
  }

  .aa-inline {
    grid-template-columns: 1fr;
  }

  .aa-hero,
  .aa-card {
    border-radius: 15px;
  }
}
</style>
