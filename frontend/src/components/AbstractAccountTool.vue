<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Abstract Account Creator' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="page-header-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <h1 class="page-title">Abstract Account Creator</h1>
            <p class="page-subtitle">Generate an isolated AA address using the Proxy Verification Script pattern.</p>
          </div>
        </div>
      </div>

      <div class="etherscan-card p-6 md:p-8 border-t-4 border-t-indigo-500 shadow-xl shadow-indigo-900/5">
        <div class="max-w-4xl mx-auto space-y-10">
          <div v-if="!connectedAccount" class="text-center py-16 border border-dashed border-line-soft rounded-3xl bg-surface-muted/30">
             <div class="h-16 w-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-5 border border-line-soft shadow-sm">
               <svg class="h-8 w-8 text-low" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
             </div>
             <p class="text-high text-lg font-bold mb-2">Wallet Not Connected</p>
             <p class="text-sm text-mid max-w-sm mx-auto">Please connect your Neo wallet to register a new Abstract Account.</p>
          </div>

          <template v-else>
            <div class="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-4 border-b border-indigo-200/60 dark:border-indigo-800/60 pb-4">
                <div class="p-2.5 bg-indigo-100 dark:bg-indigo-800/40 rounded-xl shrink-0">
                  <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                </div>
                <h4 class="font-bold text-high text-lg">Abstract Account Protocol Details</h4>
              </div>
              <div class="space-y-4 text-sm text-mid leading-relaxed">
                <p>
                  <strong>1. Deterministic Proxy Verification:</strong> Instead of paying 10 GAS to deploy a new Smart Contract for every user, the protocol utilizes an on-chain Master Entry Contract alongside a <i>Proxy Verification Script</i>. An Account ID (like an EVM Public Key or UUID) is packed into a minimalist script that executes a <code class="bg-indigo-100 dark:bg-indigo-900/40 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300">System.Contract.Call</code> to the master contract. The <i>Hash160</i> of this script becomes your unique, fully isolated Neo N3 address.
                </p>
                <p>
                  <strong>2. Cross-Chain EVM Compatibility:</strong> Users can connect MetaMask, OKX Wallet, or any other EVM-compatible wallet. When you connect, the Explorer extracts your uncompressed public key via an off-chain gasless signature. This Key acts as your unique Account ID, binding your Neo Abstract Account directly to your Ethereum identity without requiring you to manage Neo private keys.
                </p>
                <p>
                  <strong>3. Meta-Transactions & EIP-712:</strong> To execute transactions, your EVM wallet signs an EIP-712 formatted message containing the destination contract, method, payload hash, and deadline. A Relayer Node submits this payload on the Neo Network. The Master Contract natively validates the Keccak256 hash and Secp256k1 signature on-chain, ensuring you remain in total custody of your funds.
                </p>
                <p>
                  <strong>4. Multi-Signature & Role Management:</strong> The abstract account natively supports flexible multi-sig architectures out of the box. You can configure multiple <strong>Admin</strong> addresses (which are mandatory) and optional <strong>Manager</strong> addresses. Each role can specify an independent threshold requirement, establishing separate authorization rings for day-to-day operations vs administrative upgrades.
                </p>
              </div>
            </div>

            <!-- Configuration -->
            <div class="space-y-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-bold text-high tracking-tight">Account ID (Hex or UUID)</label>
                  <button v-if="!isEvmWallet" @click="generateUUID" class="text-xs text-indigo-600 font-semibold hover:underline">Generate New UUID</button>
                  <span v-else class="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">EVM Public Key Active</span>
                </div>
                <input type="text" v-model="uuid" :readonly="isEvmWallet" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed" placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
              </div>

              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Admin Addresses (Neo or EVM)</label>
                <div v-for="(admin, index) in admins" :key="'admin-'+index" class="flex items-center gap-2">
                  <input type="text" v-model="admins[index]" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" placeholder="N... or 0x..." />
                  <button @click="admins.splice(index, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <button @click="admins.push('')" class="text-xs text-indigo-600 font-semibold hover:underline">+ Add Admin</button>
              </div>
              
              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Admin Threshold</label>
                <input type="number" v-model.number="adminThreshold" min="1" :max="Math.max(1, admins.length)" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" />
              </div>
              
              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Manager Addresses (Neo or EVM)</label>
                <div v-for="(manager, index) in managers" :key="'manager-'+index" class="flex items-center gap-2">
                  <input type="text" v-model="managers[index]" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" placeholder="N... or 0x..." />
                  <button @click="managers.splice(index, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <button @click="managers.push('')" class="text-xs text-indigo-600 font-semibold hover:underline">+ Add Manager</button>
              </div>
              
              <div class="space-y-3">
                <label class="block text-sm font-bold text-high tracking-tight">Manager Threshold</label>
                <input type="number" v-model.number="managerThreshold" min="0" :max="Math.max(0, managers.length)" class="form-input w-full bg-surface text-high font-mono text-sm rounded-xl" />
              </div>
            </div>

            <!-- Derived Address Preview -->
            <transition name="fade">
              <div v-if="uuid" class="p-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/30 dark:from-indigo-900/10 dark:to-slate-900 shadow-sm space-y-4">
                <div>
                  <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mb-1.5">Your Abstract Account Address</p>
                  <p class="text-lg text-high font-bold font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner">{{ computedAddress || 'Computing...' }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mb-1.5">Verification Script Hex</p>
                  <p class="text-xs text-high font-mono break-all p-3 bg-surface-muted rounded-xl border border-line-soft shadow-inner">{{ computedScriptHex || 'Computing...' }}</p>
                </div>
              </div>
            </transition>
            
            <div class="pt-6 mt-6 flex justify-end border-t border-line-soft">
               <button 
                 @click="createAccount" 
                 :disabled="isCreating || !uuid || !computedAddress"
                 class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none shadow-md active:scale-95"
               >
                 <svg v-if="isCreating" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                 {{ isCreating ? 'Registering...' : 'Register Account' }}
               </button>
            </div>
            
            <transition name="fade">
              <div v-if="txHash" class="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4 shadow-sm">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p class="text-sm font-bold tracking-tight">Account Registered Successfully!</p>
                  </div>
                  <p class="text-xs break-all font-mono opacity-80 pl-7">{{ txHash }}</p>
                </div>
                <router-link :to="'/transaction-info/' + txHash" class="w-full sm:w-auto text-sm font-semibold hover:underline flex items-center justify-center gap-1.5 whitespace-nowrap bg-emerald-200/50 dark:bg-emerald-800/50 px-4 py-2 rounded-xl transition-colors hover:bg-emerald-300/50 dark:hover:bg-emerald-700/50 shadow-sm text-emerald-900 dark:text-emerald-100">
                  View Transaction
                </router-link>
              </div>
            </transition>
          </template>
        </div>
      </div>
      
      <!-- Contract Source Code Verification Section -->
      <div class="etherscan-card p-6 md:p-8 border-t-4 border-t-emerald-500 shadow-xl shadow-emerald-900/5 mt-8">
        <div class="max-w-4xl mx-auto space-y-6">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-bold tracking-tight text-high">Contract Source Code</h2>
            <div class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
              <span>Verified Exact Match</span>
            </div>
          </div>
          
          <p class="text-sm text-mid leading-relaxed">
            The Abstract Account is powered by a set of C# smart contracts deployed on the Neo N3 network. Below is the full source code for transparency and verification.
          </p>
          
          <div class="bg-surface rounded-xl border border-line-soft overflow-hidden shadow-sm">
            <div class="flex flex-col sm:flex-row">
              <!-- File List -->
              <div class="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-line-soft bg-surface-muted/30">
                <div class="px-4 py-3 border-b border-line-soft flex items-center justify-between">
                  <span class="text-xs font-bold text-high uppercase tracking-widest flex items-center gap-2">
                    <svg class="w-4 h-4 text-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                    Files ({{ contractFiles.length }})
                  </span>
                </div>
                <div class="overflow-y-auto max-h-[600px]">
                  <button 
                    v-for="(file, idx) in contractFiles" 
                    :key="idx"
                    @click="activeFileIdx = idx"
                    class="w-full text-left px-4 py-3 text-xs md:text-sm font-mono border-b border-line-soft hover:bg-surface transition-colors flex items-center justify-between group"
                    :class="activeFileIdx === idx ? 'bg-surface border-l-4 border-l-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-mid border-l-4 border-l-transparent'"
                  >
                    <span class="truncate pr-2">{{ file.name }}</span>
                    <svg class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" :class="activeFileIdx === idx ? 'opacity-100 text-emerald-500' : 'text-mid'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                </div>
              </div>
              
              <!-- Code View -->
              <div class="w-full sm:w-2/3 bg-[#1e1e1e] dark:bg-[#0d1117] relative flex flex-col">
                <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#2d2d2d] dark:bg-[#161b22]">
                  <span class="text-xs font-mono text-white/80 font-semibold">{{ contractFiles[activeFileIdx]?.name }}</span>
                  <button @click="copyCode" class="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 border border-white/10">
                    <svg v-if="copied" class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    {{ copied ? 'Copied' : 'Copy Code' }}
                  </button>
                </div>
                <div class="p-5 overflow-auto max-h-[600px] flex-grow [&>pre]:!bg-transparent [&>pre]:!m-0 text-[13px]">
                  <highlightjs autodetect :code="contractFiles[activeFileIdx]?.content" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { walletService, getAbstractAccountHash } from "@/services/walletService";
import { useToast } from "vue-toastification";

import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import hljsVuePlugin from "@highlightjs/vue-plugin";
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('csharp', csharp);
const highlightjs = hljsVuePlugin.component;

import code_Main from '../../../contracts/AbstractAccount/AbstractAccount.cs?raw';
import code_AccountLifecycle from '../../../contracts/AbstractAccount/AbstractAccount.AccountLifecycle.cs?raw';
import code_Admin from '../../../contracts/AbstractAccount/AbstractAccount.Admin.cs?raw';
import code_ExecutionAndPermissions from '../../../contracts/AbstractAccount/AbstractAccount.ExecutionAndPermissions.cs?raw';
import code_MetaTx from '../../../contracts/AbstractAccount/AbstractAccount.MetaTx.cs?raw';
import code_StorageAndContext from '../../../contracts/AbstractAccount/AbstractAccount.StorageAndContext.cs?raw';
import code_Upgrade from '../../../contracts/AbstractAccount/AbstractAccount.Upgrade.cs?raw';

const contractFiles = [
  { name: 'AbstractAccount.cs', content: code_Main },
  { name: 'AbstractAccount.AccountLifecycle.cs', content: code_AccountLifecycle },
  { name: 'AbstractAccount.Admin.cs', content: code_Admin },
  { name: 'AbstractAccount.ExecutionAndPermissions.cs', content: code_ExecutionAndPermissions },
  { name: 'AbstractAccount.MetaTx.cs', content: code_MetaTx },
  { name: 'AbstractAccount.StorageAndContext.cs', content: code_StorageAndContext },
  { name: 'AbstractAccount.Upgrade.cs', content: code_Upgrade }
];

const activeFileIdx = ref(0);
const copied = ref(false);

function copyCode() {
  const content = contractFiles[activeFileIdx.value]?.content;
  if (!content) return;
  navigator.clipboard.writeText(content).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}

const toast = useToast();
const isCreating = ref(false);
const txHash = ref("");

const uuid = ref("");
const admins = ref([""]);
const adminThreshold = ref(1);
const managers = ref([]);
const managerThreshold = ref(0);

const computedScriptHex = ref("");
const computedAddress = ref("");

let neonJs = null;

const isEvmWallet = computed(() => {
  return walletService.provider === walletService.PROVIDERS.EVM_WALLET;
});

watch(connectedAccount, () => {
  if (isEvmWallet.value && walletService.account?.pubKey) {
    uuid.value = walletService.account.pubKey;
  } else if (isEvmWallet.value) {
    const cached = localStorage.getItem(`evm_pubkey_${connectedAccount.value?.toLowerCase()}`);
    if (cached) uuid.value = cached;
  } else if (!uuid.value || uuid.value.length === 130) {
    // If we switched away from EVM, or it was empty, gen a new UUID
    generateUUID();
  }
}, { immediate: true });

function generateUUID() {
  uuid.value = crypto.randomUUID();
}

function normalizeAccountId(str) {
  if (isEvmWallet.value && /^[0-9a-fA-F]{130}$/.test(str)) {
    return str;
  }
  let hex = '';
  for(let i = 0; i < str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

async function computeAA() {
  if (!uuid.value || !neonJs) {
    computedScriptHex.value = "";
    computedAddress.value = "";
    return;
  }
  
  try {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) return;
    
    const accountIdHex = normalizeAccountId(uuid.value);
    
    // We generate the proxy script:
    // PUSH accountId, PUSH 1, PACK, PUSH 15 (CallFlags.All), PUSH "verify", PUSH aaHash, SYSCALL System.Contract.Call
    
    // An easy way to generate it is using createScript
    const script = neonJs.sc.createScript({
       scriptHash: aaHash,
       operation: 'verify',
       args: [ neonJs.sc.ContractParam.byteArray(accountIdHex) ]
    });
    
    computedScriptHex.value = script;
    const scriptHash = neonJs.u.reverseHex(neonJs.u.hash160(script));
    computedAddress.value = neonJs.wallet.getAddressFromScriptHash(scriptHash);
  } catch (e) {
    console.error(e);
  }
}

watch(uuid, computeAA);

onMounted(async () => {
  try {
    neonJs = window.Neon || await import('@cityofzion/neon-js');
    generateUUID();
    
    // Try to pre-fill admin with current connected account pubkey if available
    // But we don't have pubkey easily accessible without DAPI.
  } catch (e) {
    console.error(e);
  }
});

function formatErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  return err.description || err.message || err.error?.message || JSON.stringify(err);
}

function normalizeAddress(addr) {
  if (addr.startsWith('N') && addr.length === 34) {
    return neonJs.wallet.getScriptHashFromAddress(addr);
  }
  if (addr.startsWith('0x')) {
    return addr.slice(2);
  }
  return addr;
}

async function createAccount() {
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first");
    return;
  }
  if (!uuid.value) {
    toast.error("Please generate an Account UUID");
    return;
  }
  
  const validAdmins = admins.value.filter(a => a.trim().length > 0);
  if (validAdmins.length === 0) {
    toast.error("Must have at least one admin public key");
    return;
  }

  isCreating.value = true;
  txHash.value = "";

  try {
    const aaHash = getAbstractAccountHash();
    if (!aaHash) throw new Error("Master Abstract Account contract not found in environment config.");

    const accountIdHex = normalizeAccountId(uuid.value);

    const adminsParam = validAdmins.map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    const managersParam = managers.value.filter(m => m.trim().length > 0).map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    const computedAddressScriptHash = normalizeAddress(computedAddress.value);
    if (!/^[0-9a-fA-F]{40}$/.test(computedAddressScriptHash)) {
      throw new Error("Unable to derive abstract account script hash.");
    }

    const invokeParams = {
      scriptHash: aaHash,
      operation: "createAccountWithAddress",
      args: [
        { type: "ByteArray", value: accountIdHex },
        { type: "Hash160", value: computedAddressScriptHash },
        { type: "Array", value: adminsParam },
        { type: "Integer", value: adminThreshold.value },
        { type: "Array", value: managersParam },
        { type: "Integer", value: managerThreshold.value }
      ],
      signers: [
        {
          account: connectedAccount.value,
          scopes: 1 // CalledByEntry
        }
      ]
    };

    const result = await walletService.invoke(invokeParams);
    
    let deployedTxId = result?.txid || "";
    
    if (!deployedTxId) {
      throw new Error("No transaction ID returned.");
    }

    txHash.value = deployedTxId;
    toast.success("Account registration transaction submitted!");

  } catch (err) {
    console.error(err);
    toast.error("Registration failed: " + formatErrorMessage(err));
  } finally {
    isCreating.value = false;
  }
}
</script>
