<template>
  <div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-lg transition-all duration-300">
    <button @click="expanded = !expanded" class="w-full bg-slate-800/40 px-6 py-5 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-700/40 transition-colors">
      <div class="flex items-center gap-4">
        <div class="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/50 text-sky-300 flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(56,189,248,0.2)]">D</div>
        <h2 class="text-lg font-bold text-white font-outfit">NeoDID / Web3Auth</h2>
      </div>
      <span class="text-slate-400 text-sm font-mono transform transition-transform" :class="expanded ? 'rotate-180' : ''">▼</span>
    </button>
    <div v-show="expanded" class="p-6 md:p-8 animate-fade-in space-y-6">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">DID Status</p>
          <p class="text-sm text-white font-semibold break-all">{{ didProfile?.did || 'not connected' }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Provider</p>
          <p class="text-sm text-white font-semibold">{{ didProfile?.provider || 'web3auth' }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Linked Accounts</p>
          <p class="text-sm text-white font-semibold">{{ linkedAccountsLabel }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Resolved AccountId</p>
          <p class="text-sm text-white font-semibold break-all">{{ resolvedAccountId || 'unresolved' }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Email Notice</p>
          <p class="text-sm text-white font-semibold">{{ didProfile?.email || 'unavailable' }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">SMS Notice</p>
          <p class="text-sm text-white font-semibold">{{ didProfile?.phone || 'unavailable' }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Email Channel</p>
          <p class="text-sm text-white font-semibold">{{ canEmailNotice ? 'enabled' : 'disabled' }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">SMS Channel</p>
          <p class="text-sm text-white font-semibold">{{ canSmsNotice ? 'enabled' : 'disabled' }}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button class="btn-secondary !py-1.5 !px-4 text-xs" :disabled="busy === 'refreshState' || !props.accountAddressScriptHash" @click="refreshVerifierStateAction">
          {{ busy === 'refreshState' ? 'Refreshing…' : 'Refresh Chain State' }}
        </button>
        <button class="btn-secondary !py-1.5 !px-4 text-xs" :disabled="busy === 'notifyEmail' || !canEmailNotice" @click="sendEmailNoticeAction">
          {{ busy === 'notifyEmail' ? 'Sending Email…' : 'Send Email Notice' }}
        </button>
        <button class="btn-secondary !py-1.5 !px-4 text-xs" :disabled="busy === 'notifySms' || !canSmsNotice" @click="sendSmsNoticeAction">
          {{ busy === 'notifySms' ? 'Sending SMS…' : 'Send SMS Notice' }}
        </button>
        <span class="text-xs text-slate-400">Bind → Recovery / Private Session → Finalize / Use Session</span>
      </div>

      <div v-if="verifierState" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Bound Verifier</p>
          <p class="text-sm text-white font-semibold break-all">{{ verifierState.verifierHash }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Verifier Owner</p>
          <p class="text-sm text-white font-semibold break-all">{{ verifierState.owner || 'unset' }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Recovery</p>
          <p class="text-sm text-white font-semibold">
            {{ verifierState.pendingRecovery?.active ? `pending ${verifierState.pendingRecovery.approvedCount}/${verifierState.threshold}` : `nonce ${verifierState.recoveryNonce}` }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Private Session</p>
          <p class="text-sm text-white font-semibold">
            {{ verifierState.activeSession?.active ? 'active' : `nonce ${verifierState.sessionNonce}` }}
          </p>
        </div>
      </div>

      <div v-if="verifierState && (verifierState.pendingRecovery?.active || verifierState.activeSession?.active)" class="grid gap-4 xl:grid-cols-2">
        <div v-if="verifierState.pendingRecovery?.active" class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p class="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2">Pending Recovery</p>
          <p class="text-sm text-slate-200 break-all">new owner: {{ verifierState.pendingRecovery.newOwner || 'unset' }}</p>
          <p class="text-sm text-slate-300">approved: {{ verifierState.pendingRecovery.approvedCount }} / {{ verifierState.threshold }}</p>
          <p class="text-sm text-slate-300">executable at: {{ verifierState.pendingRecovery.executableAt }}</p>
          <div class="mt-4 flex gap-3">
            <button class="btn-primary flex-1" :disabled="busy === 'finalizeRecovery'" @click="finalizeRecoveryAction">
              {{ busy === 'finalizeRecovery' ? 'Finalizing…' : 'Finalize Recovery' }}
            </button>
            <button class="btn-secondary flex-1" :disabled="busy === 'cancelRecovery'" @click="cancelRecoveryAction">
              {{ busy === 'cancelRecovery' ? 'Cancelling…' : 'Cancel Recovery' }}
            </button>
          </div>
        </div>
        <div v-if="verifierState.activeSession?.active" class="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
          <p class="text-xs uppercase tracking-wider text-sky-300 font-bold mb-2">Active Private Session</p>
          <p class="text-sm text-slate-200 break-all">executor: {{ verifierState.activeSession.executor || 'unset' }}</p>
          <p class="text-sm text-slate-300 break-all">action: {{ verifierState.activeSession.actionId || 'unset' }}</p>
          <p class="text-sm text-slate-300">expires at: {{ verifierState.activeSession.expiresAt }}</p>
          <button class="btn-secondary mt-4 w-full" :disabled="busy === 'revokeSession'" @click="revokeSessionAction">
            {{ busy === 'revokeSession' ? 'Revoking…' : 'Revoke Session' }}
          </button>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <section class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">1. DID Bind {{ bindStatusLabel }}</p>
            <p class="mt-1 text-sm text-slate-300">Bind the current Web3Auth-root DID into NeoDID.</p>
          </div>
          <label class="block text-sm">
            <span class="text-slate-400">Vault Script Hash</span>
            <input v-model="vaultAccount" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Claim Type</span>
            <input v-model="claimType" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Claim Value</span>
            <input v-model="claimValue" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <button class="btn-secondary w-full" :disabled="!didConnected || !vaultAccount || busy === 'bind'" @click="bindDidAction">
            {{ busy === 'bind' ? 'Binding…' : 'Bind DID with Morpheus' }}
          </button>
        </section>

        <section class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">2. Recovery {{ recoveryStatusLabel }}</p>
            <p class="mt-1 text-sm text-slate-300">Use the DID root to start AA social recovery through the Morpheus recovery verifier.</p>
          </div>
          <label class="block text-sm">
            <span class="text-slate-400">Recovery Verifier Hash</span>
            <input v-model="recoveryVerifierHash" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">New Owner Address / Script Hash</span>
            <input v-model="recoveryNewOwner" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="N... or 0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Expiry (minutes)</span>
            <input v-model="recoveryExpiryMinutes" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" :disabled="!canPreviewRecovery || busy === 'previewRecovery'" @click="previewRecoveryAction">
              {{ busy === 'previewRecovery' ? 'Preparing…' : 'Preview Ticket' }}
            </button>
            <button class="btn-primary flex-1" :disabled="!canInvokeRecovery || busy === 'invokeRecovery'" @click="invokeRecoveryAction">
              {{ busy === 'invokeRecovery' ? 'Requesting…' : 'Invoke Recovery' }}
            </button>
          </div>
        </section>

        <section class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">3. Private Actions {{ sessionStatusLabel }}</p>
            <p class="mt-1 text-sm text-slate-300">Start a private proxy session using a NeoDID action ticket.</p>
          </div>
          <label class="block text-sm">
            <span class="text-slate-400">Proxy Verifier Hash</span>
            <input v-model="proxyVerifierHash" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Executor Address / Script Hash</span>
            <input v-model="proxyExecutor" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="N... or 0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Expiry (minutes)</span>
            <input v-model="proxyExpiryMinutes" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" :disabled="!canPreviewProxy || busy === 'previewProxy'" @click="previewProxyAction">
              {{ busy === 'previewProxy' ? 'Preparing…' : 'Preview Ticket' }}
            </button>
            <button class="btn-primary flex-1" :disabled="!canInvokeProxy || busy === 'invokeProxy'" @click="invokeProxyAction">
              {{ busy === 'invokeProxy' ? 'Requesting…' : 'Invoke Session' }}
            </button>
          </div>
        </section>
      </div>

      <div v-if="resultJson" class="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">Latest Result</p>
          <button class="btn-secondary !py-1 !px-3 text-xs" @click="copyResult">Copy JSON</button>
        </div>
        <pre class="text-xs text-slate-200 whitespace-pre-wrap break-all">{{ resultJson }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useDidConnection } from '@/composables/useDidConnection.js';
import { morpheusDidService, fetchAccountIdByAddress, fetchVerifierContractByAddress, fetchUnifiedVerifierState } from '@/services/morpheusDidService.js';
import { notificationService } from '@/services/notificationService.js';
import { getAbstractAccountHash } from '@/services/walletService.js';
import { getScriptHashFromAddress } from '@/utils/neo.js';
import { sanitizeHex } from '@/utils/hex.js';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig.js';

const props = defineProps({
  aaContractHash: {
    type: String,
    default: '',
  },
  accountAddressScriptHash: {
    type: String,
    default: '',
  },
  neoWalletAddress: {
    type: String,
    default: '',
  },
});
const emit = defineEmits(['status', 'activity']);

const { isConnected: didConnectedRef, didProfile } = useDidConnection();
const didConnected = computed(() => didConnectedRef.value);
const linkedAccountsLabel = computed(() => (didProfile.value?.linkedAccounts || []).join(', ') || 'none');
const canEmailNotice = computed(() => Boolean(notificationService.canEmail && didProfile.value?.email));
const canSmsNotice = computed(() => Boolean(notificationService.canSms && didProfile.value?.phone));
const resolvedAccountId = ref('');
const verifierState = ref(null);
const busy = ref('');
const resultJson = ref('');
const expanded = ref(true);

const vaultAccount = ref('');
const claimType = ref('Web3Auth_PrimaryIdentity');
const claimValue = ref('verified');
const recoveryVerifierHash = ref('');
const recoveryNewOwner = ref('');
const recoveryExpiryMinutes = ref(30);
const proxyVerifierHash = ref('');
const proxyExecutor = ref('');
const proxyExpiryMinutes = ref(15);
const bindStatusLabel = computed(() => didConnected.value ? '(ready)' : '(connect DID)');
const recoveryStatusLabel = computed(() => verifierState.value?.pendingRecovery?.active ? '(pending)' : '(ready)');
const sessionStatusLabel = computed(() => verifierState.value?.activeSession?.active ? '(active)' : '(ready)');

function normalizeHashOrAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^[Nn]/.test(raw)) {
    return sanitizeHex(getScriptHashFromAddress(raw));
  }
  return sanitizeHex(raw);
}

function toExpiry(minutes) {
  return Date.now() + (Math.max(Number(minutes) || 0, 1) * 60 * 1000);
}

async function refreshAccountId() {
  if (!props.accountAddressScriptHash) {
    resolvedAccountId.value = '';
    return;
  }
  try {
    resolvedAccountId.value = await fetchAccountIdByAddress({
      rpcUrl: RUNTIME_CONFIG.rpcUrl,
      aaContractHash: props.aaContractHash || getAbstractAccountHash(),
      accountAddressScriptHash: props.accountAddressScriptHash,
    });
  } catch {
    resolvedAccountId.value = '';
  }
}

async function refreshBoundVerifier() {
  if (!props.accountAddressScriptHash) return;
  try {
    const bound = await fetchVerifierContractByAddress({
      rpcUrl: RUNTIME_CONFIG.rpcUrl,
      aaContractHash: props.aaContractHash || getAbstractAccountHash(),
      accountAddressScriptHash: props.accountAddressScriptHash,
    });
    if (!recoveryVerifierHash.value && bound) {
      recoveryVerifierHash.value = bound;
    }
    if (!proxyVerifierHash.value && bound) {
      proxyVerifierHash.value = bound;
    }
    if (bound && resolvedAccountId.value) {
      verifierState.value = await fetchUnifiedVerifierState({
        rpcUrl: RUNTIME_CONFIG.rpcUrl,
        verifierHash: bound,
        accountIdHex: resolvedAccountId.value,
      }).catch(() => null);
    }
  } catch {
    // best effort only
  }
}

watch(() => props.accountAddressScriptHash, () => {
  void refreshAccountId();
  void refreshBoundVerifier();
}, { immediate: true });

watch([resolvedAccountId, recoveryVerifierHash], async ([accountId, verifier]) => {
  if (!accountId || !verifier) return;
  try {
    verifierState.value = await fetchUnifiedVerifierState({
      rpcUrl: RUNTIME_CONFIG.rpcUrl,
      verifierHash: verifier,
      accountIdHex: accountId,
    });
  } catch {
    verifierState.value = null;
  }
});

async function refreshVerifierStateAction() {
  busy.value = 'refreshState';
  try {
    if (resolvedAccountId.value && (recoveryVerifierHash.value || proxyVerifierHash.value)) {
      verifierState.value = await fetchUnifiedVerifierState({
        rpcUrl: RUNTIME_CONFIG.rpcUrl,
        verifierHash: recoveryVerifierHash.value || proxyVerifierHash.value,
        accountIdHex: resolvedAccountId.value,
      });
      publishStatus('Verifier chain state refreshed.');
    }
  } finally {
    busy.value = '';
  }
}

watch(() => props.neoWalletAddress, (next) => {
  if (!next) return;
  try {
    vaultAccount.value = sanitizeHex(getScriptHashFromAddress(next));
  } catch {
    // ignore
  }
}, { immediate: true });

const canPreviewRecovery = computed(() => didConnected.value && recoveryVerifierHash.value && recoveryNewOwner.value && resolvedAccountId.value);
const canInvokeRecovery = computed(() => canPreviewRecovery.value);
const canPreviewProxy = computed(() => didConnected.value && proxyExecutor.value);
const effectiveProxyVerifierHash = computed(() => proxyVerifierHash.value || recoveryVerifierHash.value);
const canInvokeProxy = computed(() => didConnected.value && effectiveProxyVerifierHash.value && proxyExecutor.value && resolvedAccountId.value);

function publishStatus(message) {
  emit('status', message);
}

function publishActivity(type, detail) {
  emit('activity', { type, actor: 'did', detail });
}

async function bindDidAction() {
  busy.value = 'bind';
  try {
    const response = await morpheusDidService.bindDid({
      vaultAccount: vaultAccount.value,
      claimType: claimType.value,
      claimValue: claimValue.value,
      metadata: {
        aa_contract: props.aaContractHash || getAbstractAccountHash(),
        account_address: props.accountAddressScriptHash || undefined,
        account_id: resolvedAccountId.value || undefined,
      },
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('NeoDID bind prepared successfully.');
    publishActivity('did_bound', 'Web3Auth DID bound through Morpheus NeoDID');
  } finally {
    busy.value = '';
  }
}

async function previewRecoveryAction() {
  busy.value = 'previewRecovery';
  try {
    const response = await morpheusDidService.previewRecoveryTicket({
      aaContract: props.aaContractHash || getAbstractAccountHash(),
      verifierContract: recoveryVerifierHash.value,
      accountId: resolvedAccountId.value,
      newOwner: recoveryNewOwner.value,
      recoveryNonce: 0,
      expiresAt: toExpiry(recoveryExpiryMinutes.value),
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Recovery ticket preview generated.');
  } finally {
    busy.value = '';
  }
}

async function invokeRecoveryAction() {
  busy.value = 'invokeRecovery';
  try {
    const response = await morpheusDidService.invokeRecoveryRequest({
      verifierHash: recoveryVerifierHash.value,
      accountIdHex: resolvedAccountId.value,
      newOwner: recoveryNewOwner.value,
      expiresAt: toExpiry(recoveryExpiryMinutes.value),
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Recovery request submitted to the Morpheus verifier.');
    publishActivity('recovery_requested', 'Morpheus social recovery request submitted');
  } finally {
    busy.value = '';
  }
}

async function previewProxyAction() {
  busy.value = 'previewProxy';
  try {
    const response = await morpheusDidService.previewActionTicket({
      executor: proxyExecutor.value,
      actionId: `aa_proxy:${props.aaContractHash || getAbstractAccountHash()}:${resolvedAccountId.value || 'unresolved'}:${normalizeHashOrAddress(proxyExecutor.value)}:${toExpiry(proxyExpiryMinutes.value)}`,
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Action ticket preview generated.');
  } finally {
    busy.value = '';
  }
}

async function invokeProxyAction() {
  busy.value = 'invokeProxy';
  try {
    const response = await morpheusDidService.invokeProxySessionRequest({
      verifierHash: effectiveProxyVerifierHash.value,
      accountIdHex: resolvedAccountId.value,
      executor: proxyExecutor.value,
      expiresAt: toExpiry(proxyExpiryMinutes.value),
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Private proxy session request submitted.');
    publishActivity('proxy_session_requested', 'Morpheus proxy session request submitted');
  } finally {
    busy.value = '';
  }
}

async function finalizeRecoveryAction() {
  busy.value = 'finalizeRecovery';
  try {
    const response = await morpheusDidService.finalizeRecovery({
      verifierHash: recoveryVerifierHash.value || effectiveProxyVerifierHash.value,
      accountIdHex: resolvedAccountId.value,
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Recovery finalized on-chain.');
    publishActivity('recovery_finalized', 'Morpheus recovery finalized');
    await refreshVerifierStateAction();
  } finally {
    busy.value = '';
  }
}

async function cancelRecoveryAction() {
  busy.value = 'cancelRecovery';
  try {
    const response = await morpheusDidService.cancelRecovery({
      verifierHash: recoveryVerifierHash.value || effectiveProxyVerifierHash.value,
      accountIdHex: resolvedAccountId.value,
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Recovery cancelled on-chain.');
    publishActivity('recovery_cancelled', 'Morpheus recovery cancelled');
    await refreshVerifierStateAction();
  } finally {
    busy.value = '';
  }
}

async function revokeSessionAction() {
  busy.value = 'revokeSession';
  try {
    const response = await morpheusDidService.revokeProxySession({
      verifierHash: effectiveProxyVerifierHash.value,
      accountIdHex: resolvedAccountId.value,
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Private session revoked on-chain.');
    publishActivity('proxy_session_revoked', 'Morpheus private session revoked');
    await refreshVerifierStateAction();
  } finally {
    busy.value = '';
  }
}

async function copyResult() {
  if (!resultJson.value) return;
  await navigator.clipboard.writeText(resultJson.value);
}

async function sendEmailNoticeAction() {
  busy.value = 'notifyEmail';
  try {
    const response = await notificationService.sendRecoveryEmail({
      did: didProfile.value?.did,
      email: didProfile.value?.email,
      payload: {
        aa_contract: props.aaContractHash || getAbstractAccountHash(),
        account_id: resolvedAccountId.value || '',
        verifier: recoveryVerifierHash.value || effectiveProxyVerifierHash.value || '',
      },
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Recovery email notice sent.');
    publishActivity('did_notice_sent', 'Recovery email notice sent');
  } finally {
    busy.value = '';
  }
}

async function sendSmsNoticeAction() {
  busy.value = 'notifySms';
  try {
    const response = await notificationService.sendRecoverySms({
      did: didProfile.value?.did,
      phone: didProfile.value?.phone,
      payload: {
        aa_contract: props.aaContractHash || getAbstractAccountHash(),
        account_id: resolvedAccountId.value || '',
        verifier: recoveryVerifierHash.value || effectiveProxyVerifierHash.value || '',
      },
    });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus('Recovery SMS notice sent.');
    publishActivity('did_notice_sent', 'Recovery SMS notice sent');
  } finally {
    busy.value = '';
  }
}
</script>
