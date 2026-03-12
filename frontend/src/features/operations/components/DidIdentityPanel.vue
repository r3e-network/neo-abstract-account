<template>
  <div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-lg transition-all duration-300">
    <button @click="expanded = !expanded" class="w-full bg-slate-800/40 px-6 py-5 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-700/40 transition-colors">
      <div class="flex items-center gap-4">
        <div class="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/50 text-sky-300 flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(56,189,248,0.2)]">D</div>
        <h2 class="text-lg font-bold text-white font-outfit">{{ t('didPanel.title', 'NeoDID / Web3Auth') }}</h2>
      </div>
      <span class="text-slate-400 text-sm font-mono transform transition-transform" :class="expanded ? 'rotate-180' : ''">▼</span>
    </button>
    <div v-show="expanded" class="p-6 md:p-8 animate-fade-in space-y-6">
      <div class="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p class="text-xs uppercase tracking-wider text-sky-300 font-bold mb-2">{{ t('didPanel.connectTitle', 'Connect Web3Auth First') }}</p>
            <p class="text-sm text-slate-300 leading-6">
              {{ didAvailable ? t('didPanel.connectSubtitle', 'NeoDID bind, recovery, and private sessions all start from a live Web3Auth identity. Choose a login method below.') : t('didPanel.connectUnavailable', 'Web3Auth is not configured in this deployment yet.') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button v-if="didAvailable && !didConnected" class="btn-primary !py-2 !px-4 text-xs" :disabled="busy === 'connectDid'" @click="connectDidAction()">
              {{ busy === 'connectDid' ? t('didPanel.connectModal', 'Open Web3Auth') : t('didPanel.connectModal', 'Open Web3Auth') }}
            </button>
            <button v-if="didAvailable && !didConnected" class="btn-secondary !py-2 !px-4 text-xs" :disabled="busy === 'connectGoogle'" @click="connectDidAction('google')">
              {{ busy === 'connectGoogle' ? t('didPanel.connectGoogle', 'Google') : t('didPanel.connectGoogle', 'Google') }}
            </button>
            <button v-if="didAvailable && !didConnected" class="btn-secondary !py-2 !px-4 text-xs" :disabled="busy === 'connectEmail'" @click="connectDidAction('email_passwordless')">
              {{ busy === 'connectEmail' ? t('didPanel.connectEmail', 'Email') : t('didPanel.connectEmail', 'Email') }}
            </button>
            <button v-if="didAvailable && !didConnected" class="btn-secondary !py-2 !px-4 text-xs" :disabled="busy === 'connectSms'" @click="connectDidAction('sms_passwordless')">
              {{ busy === 'connectSms' ? t('didPanel.connectSms', 'SMS') : t('didPanel.connectSms', 'SMS') }}
            </button>
            <button v-if="didConnected" class="btn-secondary !py-2 !px-4 text-xs" :disabled="busy === 'disconnectDid'" @click="disconnectDidAction">
              {{ t('didPanel.disconnect', 'Disconnect Web3Auth') }}
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.identityRoot', 'Identity Root') }}</p>
          <p class="text-sm text-white font-semibold break-all">{{ didProfile?.identityRoot || didProfile?.providerUid || t('didPanel.notConnected', 'not connected') }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.provider', 'Provider') }}</p>
          <p class="text-sm text-white font-semibold">{{ didProfile?.provider || 'web3auth' }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.serviceDid', 'NeoDID Service DID') }}</p>
          <p class="text-sm text-white font-semibold break-all">{{ serviceDid }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.resolvedAccountId', 'Resolved AccountId') }}</p>
          <p class="text-sm text-white font-semibold break-all">{{ resolvedAccountId || t('didPanel.unresolved', 'unresolved') }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.linkedAccounts', 'Linked Accounts') }}</p>
          <p class="text-sm text-white font-semibold">{{ linkedAccountsLabel }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.emailNotice', 'Email Notice') }}</p>
          <p class="text-sm text-white font-semibold">{{ didProfile?.email || t('didPanel.unavailable', 'unavailable') }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.smsNotice', 'SMS Notice') }}</p>
          <p class="text-sm text-white font-semibold">{{ didProfile?.phone || t('didPanel.unavailable', 'unavailable') }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.emailChannel', 'Email Channel') }}</p>
          <p class="text-sm text-white font-semibold">{{ canEmailNotice ? t('didPanel.enabled', 'enabled') : t('didPanel.disabled', 'disabled') }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.smsChannel', 'SMS Channel') }}</p>
          <p class="text-sm text-white font-semibold">{{ canSmsNotice ? t('didPanel.enabled', 'enabled') : t('didPanel.disabled', 'disabled') }}</p>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">{{ t('didPanel.resolver', 'Resolver') }}</p>
          <p class="text-sm text-slate-300 break-all">{{ resolverUrl }}</p>
          <p class="mt-2 text-xs text-slate-400">{{ t('didPanel.resolverHint', 'Public DID resolution is metadata-only. Private JWT claims and nullifiers never appear in resolver output.') }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">{{ t('didPanel.runtimeStatus', 'Runtime Status') }}</p>
          <p class="text-sm text-white font-semibold break-all">{{ runtimeSummary }}</p>
          <div class="mt-3 flex flex-wrap gap-3">
            <button class="btn-secondary !py-1.5 !px-4 text-xs" :disabled="busy === 'resolveServiceDid'" @click="resolveServiceDidAction">
              {{ busy === 'resolveServiceDid' ? t('didPanel.resolving', 'Resolving…') : t('didPanel.resolveServiceDid', 'Resolve Service DID') }}
            </button>
            <a :href="resolverUrl" target="_blank" rel="noreferrer" class="btn-secondary !py-1.5 !px-4 text-xs no-underline">
              {{ t('didPanel.openResolver', 'Open Resolver') }}
            </a>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button class="btn-secondary !py-1.5 !px-4 text-xs" :disabled="busy === 'refreshState' || !props.accountAddressScriptHash" @click="refreshVerifierStateAction">
          {{ busy === 'refreshState' ? t('didPanel.refreshing', 'Refreshing…') : t('didPanel.refreshChainState', 'Refresh Chain State') }}
        </button>
        <button class="btn-secondary !py-1.5 !px-4 text-xs" :disabled="busy === 'notifyEmail' || !canEmailNotice" @click="sendEmailNoticeAction">
          {{ busy === 'notifyEmail' ? t('didPanel.sendingEmail', 'Sending Email…') : t('didPanel.sendEmailNotice', 'Send Email Notice') }}
        </button>
        <button class="btn-secondary !py-1.5 !px-4 text-xs" :disabled="busy === 'notifySms' || !canSmsNotice" @click="sendSmsNoticeAction">
          {{ busy === 'notifySms' ? t('didPanel.sendingSms', 'Sending SMS…') : t('didPanel.sendSmsNotice', 'Send SMS Notice') }}
        </button>
        <span class="text-xs text-slate-400">{{ t('didPanel.flowHint', 'Recommended flow: Connect Web3Auth → Bind NeoDID → Start Recovery / Private Session → Finalize / Revoke.') }}</span>
      </div>

      <div v-if="verifierState" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.boundVerifier', 'Bound Verifier') }}</p>
          <p class="text-sm text-white font-semibold break-all">{{ verifierState.verifierHash }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.verifierOwner', 'Verifier Owner') }}</p>
          <p class="text-sm text-white font-semibold break-all">{{ verifierState.owner || t('didPanel.unset', 'unset') }}</p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.recovery', 'Recovery') }}</p>
          <p class="text-sm text-white font-semibold">
            {{ verifierState.pendingRecovery?.active ? `${t('didPanel.statusPending', '(pending)').replace(/[()（）]/g, '').trim()} ${verifierState.pendingRecovery.approvedCount}/${verifierState.threshold}` : `${t('didPanel.nonce', 'nonce')} ${verifierState.recoveryNonce}` }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{{ t('didPanel.privateSession', 'Private Session') }}</p>
          <p class="text-sm text-white font-semibold">
            {{ verifierState.activeSession?.active ? t('didPanel.statusActive', '(active)').replace(/[()（）]/g, '').trim() : `${t('didPanel.nonce', 'nonce')} ${verifierState.sessionNonce}` }}
          </p>
        </div>
      </div>

      <div v-if="verifierState && (verifierState.pendingRecovery?.active || verifierState.activeSession?.active)" class="grid gap-4 xl:grid-cols-2">
        <div v-if="verifierState.pendingRecovery?.active" class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p class="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2">{{ t('didPanel.pendingRecovery', 'Pending Recovery') }}</p>
          <p class="text-sm text-slate-200 break-all">{{ t('didPanel.newOwner', 'new owner') }}: {{ verifierState.pendingRecovery.newOwner || t('didPanel.unset', 'unset') }}</p>
          <p class="text-sm text-slate-300">{{ t('didPanel.approved', 'approved') }}: {{ verifierState.pendingRecovery.approvedCount }} / {{ verifierState.threshold }}</p>
          <p class="text-sm text-slate-300">{{ t('didPanel.executableAt', 'executable at') }}: {{ verifierState.pendingRecovery.executableAt }}</p>
          <div class="mt-4 flex gap-3">
            <button class="btn-primary flex-1" :disabled="busy === 'finalizeRecovery'" @click="finalizeRecoveryAction">
              {{ busy === 'finalizeRecovery' ? t('didPanel.finalizingRecovery', 'Finalizing…') : t('didPanel.finalizeRecovery', 'Finalize Recovery') }}
            </button>
            <button class="btn-secondary flex-1" :disabled="busy === 'cancelRecovery'" @click="cancelRecoveryAction">
              {{ busy === 'cancelRecovery' ? t('didPanel.cancellingRecovery', 'Cancelling…') : t('didPanel.cancelRecovery', 'Cancel Recovery') }}
            </button>
          </div>
        </div>
        <div v-if="verifierState.activeSession?.active" class="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
          <p class="text-xs uppercase tracking-wider text-sky-300 font-bold mb-2">{{ t('didPanel.activePrivateSession', 'Active Private Session') }}</p>
          <p class="text-sm text-slate-200 break-all">{{ t('didPanel.executor', 'executor') }}: {{ verifierState.activeSession.executor || t('didPanel.unset', 'unset') }}</p>
          <p class="text-sm text-slate-300 break-all">{{ t('didPanel.action', 'action') }}: {{ verifierState.activeSession.actionId || t('didPanel.unset', 'unset') }}</p>
          <p class="text-sm text-slate-300">{{ t('didPanel.expiresAt', 'expires at') }}: {{ verifierState.activeSession.expiresAt }}</p>
          <button class="btn-secondary mt-4 w-full" :disabled="busy === 'revokeSession'" @click="revokeSessionAction">
            {{ busy === 'revokeSession' ? t('didPanel.revokingSession', 'Revoking…') : t('didPanel.revokeSession', 'Revoke Session') }}
          </button>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <section class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">{{ t('didPanel.stepBind', '1. Bind NeoDID') }} {{ bindStatusLabel }}</p>
            <p class="mt-1 text-sm text-slate-300">{{ t('didPanel.stepBindHint', 'Seal the live Web3Auth id_token locally, then let the TEE derive the stable identity root inside Morpheus.') }}</p>
          </div>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.vaultScriptHash', 'Vault Script Hash') }}</span>
            <input v-model="vaultAccount" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.claimType', 'Claim Type') }}</span>
            <input v-model="claimType" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.claimValue', 'Claim Value') }}</span>
            <input v-model="claimValue" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <button class="btn-secondary w-full" :disabled="!didConnected || !vaultAccount || busy === 'bind'" @click="bindDidAction">
            {{ busy === 'bind' ? t('didPanel.binding', 'Binding…') : t('didPanel.bindAction', 'Bind DID with Morpheus') }}
          </button>
        </section>

        <section class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">{{ t('didPanel.stepRecovery', '2. Social Recovery') }} {{ recoveryStatusLabel }}</p>
            <p class="mt-1 text-sm text-slate-300">{{ t('didPanel.stepRecoveryHint', 'Submit a Morpheus recovery request through the bound verifier for the currently connected Web3Auth identity.') }}</p>
          </div>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.recoveryVerifierHash', 'Recovery Verifier Hash') }}</span>
            <input v-model="recoveryVerifierHash" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.newOwnerAddress', 'New Owner Address / Script Hash') }}</span>
            <input v-model="recoveryNewOwner" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="N... or 0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.expiryMinutes', 'Expiry (minutes)') }}</span>
            <input v-model="recoveryExpiryMinutes" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" :disabled="!canPreviewRecovery || busy === 'previewRecovery'" @click="previewRecoveryAction">
              {{ busy === 'previewRecovery' ? t('didPanel.preparingTicket', 'Preparing…') : t('didPanel.previewTicket', 'Preview Ticket') }}
            </button>
            <button class="btn-primary flex-1" :disabled="!canInvokeRecovery || busy === 'invokeRecovery'" @click="invokeRecoveryAction">
              {{ busy === 'invokeRecovery' ? t('didPanel.requestingRecovery', 'Requesting…') : t('didPanel.invokeRecovery', 'Invoke Recovery') }}
            </button>
          </div>
        </section>

        <section class="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">{{ t('didPanel.stepPrivateActions', '3. Private Actions') }} {{ sessionStatusLabel }}</p>
            <p class="mt-1 text-sm text-slate-300">{{ t('didPanel.stepPrivateActionsHint', 'Create a short-lived private execution session without exposing the long-term identity root on-chain.') }}</p>
          </div>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.proxyVerifierHash', 'Proxy Verifier Hash') }}</span>
            <input v-model="proxyVerifierHash" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.executorAddress', 'Executor Address / Script Hash') }}</span>
            <input v-model="proxyExecutor" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" placeholder="N... or 0x..." />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">{{ t('didPanel.expiryMinutes', 'Expiry (minutes)') }}</span>
            <input v-model="proxyExpiryMinutes" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white" />
          </label>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" :disabled="!canPreviewProxy || busy === 'previewProxy'" @click="previewProxyAction">
              {{ busy === 'previewProxy' ? t('didPanel.preparingTicket', 'Preparing…') : t('didPanel.previewTicket', 'Preview Ticket') }}
            </button>
            <button class="btn-primary flex-1" :disabled="!canInvokeProxy || busy === 'invokeProxy'" @click="invokeProxyAction">
              {{ busy === 'invokeProxy' ? t('didPanel.requestingSession', 'Requesting…') : t('didPanel.invokeSession', 'Invoke Session') }}
            </button>
          </div>
        </section>
      </div>

      <div v-if="resultJson" class="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold">{{ t('didPanel.latestResult', 'Latest Result') }}</p>
          <button class="btn-secondary !py-1 !px-3 text-xs" @click="copyResult">{{ t('didPanel.copyJson', 'Copy JSON') }}</button>
        </div>
        <pre class="text-xs text-slate-200 whitespace-pre-wrap break-all">{{ resultJson }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from '@/i18n';
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

const { t } = useI18n();
const {
  isConfigured: didAvailableRef,
  isConnected: didConnectedRef,
  didProfile,
  connectDid,
  disconnectDid,
} = useDidConnection();
const didAvailable = computed(() => didAvailableRef.value);
const didConnected = computed(() => didConnectedRef.value);
const linkedAccountsLabel = computed(() => (didProfile.value?.linkedAccounts || []).join(', ') || 'none');
const serviceDid = computed(() => didProfile.value?.serviceDid || RUNTIME_CONFIG.morpheusNeoDidServiceDid);
const resolverUrl = computed(() => {
  const endpoint = String(RUNTIME_CONFIG.morpheusNeoDidResolveEndpoint || '/api/morpheus-neodid?action=resolve');
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}did=${encodeURIComponent(serviceDid.value)}`;
});
const runtimeSummary = computed(() => didConnected.value
  ? t('didPanel.runtimeConnected', 'Web3Auth connected. NeoDID requests will use encrypted id_token input and Oracle callback routing.')
  : t('didPanel.runtimeDisconnected', 'Connect Web3Auth to prepare encrypted NeoDID requests.'));
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
const bindStatusLabel = computed(() => didConnected.value ? t('didPanel.statusReady', '(ready)') : t('didPanel.statusConnectDid', '(connect Web3Auth)'));
const recoveryStatusLabel = computed(() => verifierState.value?.pendingRecovery?.active ? t('didPanel.statusPending', '(pending)') : t('didPanel.statusReady', '(ready)'));
const sessionStatusLabel = computed(() => verifierState.value?.activeSession?.active ? t('didPanel.statusActive', '(active)') : t('didPanel.statusReady', '(ready)'));

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
      publishStatus(t('didPanel.refreshChainState', 'Refresh Chain State'));
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

async function connectDidAction(loginProvider = '') {
  busy.value = loginProvider === 'google'
    ? 'connectGoogle'
    : loginProvider === 'email_passwordless'
      ? 'connectEmail'
      : loginProvider === 'sms_passwordless'
        ? 'connectSms'
        : 'connectDid';
  try {
    await connectDid(loginProvider ? { loginProvider } : {});
    publishStatus(t('nav.connectDid', 'Connect Web3Auth'));
    publishActivity('did_connected', loginProvider || 'web3auth');
  } finally {
    busy.value = '';
  }
}

async function disconnectDidAction() {
  busy.value = 'disconnectDid';
  try {
    await disconnectDid();
    publishStatus(t('nav.disconnectDid', 'Disconnect Web3Auth'));
    publishActivity('did_disconnected', 'web3auth');
  } finally {
    busy.value = '';
  }
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
    publishStatus(t('didPanel.bindAction', 'Bind DID with Morpheus'));
    publishActivity('did_bound', 'Web3Auth DID bound through Morpheus NeoDID');
  } finally {
    busy.value = '';
  }
}

async function resolveServiceDidAction() {
  busy.value = 'resolveServiceDid';
  try {
    const response = await morpheusDidService.resolveDid({ did: serviceDid.value });
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus(t('didPanel.resolveServiceDid', 'Resolve Service DID'));
    publishActivity('did_resolved', 'Morpheus NeoDID service DID resolved');
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
    publishStatus(t('didPanel.previewTicket', 'Preview Ticket'));
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
    publishStatus(t('didPanel.invokeRecovery', 'Invoke Recovery'));
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
    publishStatus(t('didPanel.previewTicket', 'Preview Ticket'));
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
    publishStatus(t('didPanel.invokeSession', 'Invoke Session'));
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
    publishStatus(t('didPanel.finalizeRecovery', 'Finalize Recovery'));
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
    publishStatus(t('didPanel.cancelRecovery', 'Cancel Recovery'));
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
    publishStatus(t('didPanel.revokeSession', 'Revoke Session'));
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
    publishStatus(t('didPanel.sendEmailNotice', 'Send Email Notice'));
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
    publishStatus(t('didPanel.sendSmsNotice', 'Send SMS Notice'));
    publishActivity('did_notice_sent', 'Recovery SMS notice sent');
  } finally {
    busy.value = '';
  }
}
</script>
