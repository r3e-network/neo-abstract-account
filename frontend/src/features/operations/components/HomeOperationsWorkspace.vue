<template>
  <section class="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-2xl shadow-neo-500/10 backdrop-blur-xl">
    <div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-neo-600">{{ t('operations.workspaceTitle', 'Abstract Account Workspace') }}</p>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{{ t('operations.workspaceHero', 'Load, compose, sign, share, and broadcast') }}</h1>
        <p class="mt-3 max-w-3xl text-sm text-slate-500 sm:text-base">
          {{ t('operations.workspaceSubtitle', 'App-first operations for Neo Abstract Accounts with anonymous Supabase drafts, mixed Neo + EVM signature collection, and both client-side and relay broadcast paths.') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3 lg:justify-end">
        <button class="rounded-xl border border-neo-200 bg-neo-50 px-4 py-2 text-sm font-semibold text-neo-700" @click="connectNeoWallet">
          {{ t('operations.connectNeoWallet', 'Connect Neo Wallet') }}
        </button>
        <button class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700" @click="connectEvmWalletAction">
          {{ t('operations.connectEvmWallet', 'Connect EVM Wallet') }}
        </button>
        <button class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!shareUrl" @click="copyShareLink">
          {{ t('operations.copyShareLink', 'Copy Share Link') }}
        </button>
        <button class="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!collaborationUrl" @click="copyCollaboratorLink">
          {{ t('operations.copyCollaboratorLink', 'Copy Collaborator Link') }}
        </button>
        <button class="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-semibold text-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!operatorUrl" @click="copyOperatorLink">
          {{ t('operations.copyOperatorLink', 'Copy Operator Link') }}
        </button>
        <button class="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!collaborationUrl || isSubmissionPending" @click="rotateCollaboratorLink">
          {{ t('operations.rotateCollaboratorLink', 'Rotate Collaborator Link') }}
        </button>
        <button class="rounded-xl border border-fuchsia-200 bg-white px-4 py-2 text-sm font-semibold text-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!operatorUrl || isSubmissionPending" @click="rotateOperatorLink">
          {{ t('operations.rotateOperatorLink', 'Rotate Operator Link') }}
        </button>
        <button class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!workspace.transactionBody.value" @click="exportDraftJson">
          {{ t('operations.exportDraftJson', 'Export Draft JSON') }}
        </button>
      </div>
    </div>

    <DraftStatusBanner
      v-if="workspace.operationBody.value || workspace.share.value.draftId || activityItems.length > 0"
      class="mb-6"
      :status="workspace.share.value.status"
      :activity="activityItems"
    />

    <div class="mb-6 grid gap-3 lg:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        {{ t('operations.collaborationLabel', 'Collaboration:') }} <strong>{{ runtime.collaborationEnabled ? t('operations.collaborationReady', 'Supabase ready') : t('operations.collaborationLocalOnly', 'Local-only fallback') }}</strong>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        {{ t('operations.neoWalletLabel', 'Neo wallet:') }} <strong>{{ neoWalletLabel }}</strong>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        {{ t('operations.evmWalletLabel', 'EVM wallet:') }} <strong>{{ evmWalletLabel }}</strong>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        {{ t('operations.signatureProgressLabel', 'Signature progress:') }} <strong>{{ signerProgress.signatureCount }}/{{ signerProgress.requiredCount || 0 }}</strong>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="space-y-6">
        <LoadAccountPanel
          :account-id-hex="accountIdHex"
          :account-address-script-hash="accountAddressScriptHash"
          @update:account-id-hex="accountIdHex = $event"
          @update:account-address-script-hash="accountAddressScriptHash = $event"
          @load="loadAccount"
        />
        <OperationComposerPanel
          :preset="preset"
          :preset-options="presetOptions"
          :target-contract="targetContract"
          :method="method"
          :args-text="argsText"
          :transfer-token-script-hash="transferTokenScriptHash"
          :transfer-recipient="transferRecipient"
          :transfer-amount="transferAmount"
          :transfer-data="transferData"
          :multisig-title="multisigTitle"
          :multisig-description="multisigDescription"
          :summary-title="composerSummary.title"
          :summary-detail="composerSummary.detail"
          @update:preset="preset = $event"
          @update:target-contract="targetContract = $event"
          @update:method="method = $event"
          @update:args-text="argsText = $event"
          @update:transfer-token-script-hash="transferTokenScriptHash = $event"
          @update:transfer-recipient="transferRecipient = $event"
          @update:transfer-amount="transferAmount = $event"
          @update:transfer-data="transferData = $event"
          @update:multisig-title="multisigTitle = $event"
          @update:multisig-description="multisigDescription = $event"
          @stage="stageOperation"
        />
        <SignatureWorkflowPanel
          :signer-id="signerId"
          :signer-kind="signerKind"
          :signature-hex="signatureHex"
          :required-signer-count="signerProgress.requiredCount"
          :signature-count="signerProgress.signatureCount"
          @update:signer-id="signerId = $event"
          @update:signer-kind="signerKind = $event"
          @update:signature-hex="signatureHex = $event"
          @append-signature="appendManualSignature"
        />
        <DraftSummaryStrip v-if="workspace.operationBody.value || workspace.share.value.draftId" :draft="draftSummaryDraft" :action-context="activityActionContext" @summary-action="handleSummaryAction" />
        <BroadcastOptionsPanel
          :active-mode="workspace.broadcast.value.mode"
          :modes="runtime.broadcastModes"
          :active-relay-payload-mode="relayPayloadMode"
          :relay-payload-options="relayPayloadOptions"
          :relay-endpoint="runtime.relayEndpoint"
          @set-mode="workspace.setBroadcastMode($event)"
          @set-relay-payload-mode="relayPayloadMode = $event"
          @persist-draft="persistDraft"
        />

        <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Transaction Body</h2>
              <p class="text-sm text-slate-500">Freeze the client invocation payload and optional raw transaction for relay submission.</p>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canClientBroadcast || isSubmissionPending" :title="getSubmissionButtonLabel('client-broadcast', pendingSubmissionAction)" @click="broadcastWithNeoWallet">
                {{ pendingSubmissionAction === 'client-broadcast' ? 'Broadcasting…' : 'Broadcast with Neo Wallet' }}
              </button>
              <button class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="relayPayloadOptions.length === 0 || isSubmissionPending" :title="getSubmissionButtonLabel('relay-check', pendingSubmissionAction)" @click="checkRelay">
                {{ pendingSubmissionAction === 'relay-check' ? 'Checking Relay…' : 'Check Relay' }}
              </button>
              <button class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canRelayBroadcast || isSubmissionPending" :title="getSubmissionButtonLabel('relay-submit', pendingSubmissionAction)" @click="submitViaRelay">
                {{ pendingSubmissionAction === 'relay-submit' ? 'Submitting…' : 'Submit via Relay' }}
              </button>
              <button class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!workspace.transactionBody.value || isSubmissionPending" @click="signWithEvmWallet">
                Sign with EVM Wallet
              </button>
            </div>
          </div>

          <div class="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <strong class="text-slate-900">Current Operation:</strong>
            {{ composerSummary.title }} — {{ composerSummary.detail }}
            <span class="block text-xs text-slate-500 mt-1">Relay payload: {{ selectedRelayPayloadMode }}</span>
          </div>

          <div v-if="activeSubmissionReceipt" class="mb-4 rounded-2xl border px-4 py-3 text-sm"
            :class="activeSubmissionReceipt.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : activeSubmissionReceipt.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'">
            <p class="text-xs font-bold uppercase tracking-[0.18em]">Submission Receipt</p>
            <div class="mt-2 text-sm font-semibold">{{ activeSubmissionReceipt.title }}</div>
            <p class="mt-1 text-sm">{{ activeSubmissionReceipt.detail }}</p>
            <code v-if="activeSubmissionReceipt.txid" class="mt-2 block break-all rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-xs">{{ activeSubmissionReceipt.txid }}</code>
            <a v-if="activeSubmissionReceipt.explorerUrl" :href="activeSubmissionReceipt.explorerUrl" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex rounded-xl border border-current/15 bg-white/70 px-3 py-2 text-xs font-semibold">Open in Explorer</a>
            <div v-if="submissionReceiptHistoryItems.length > 0" class="mt-4 border-t border-current/10 pt-3">
              <p class="text-xs font-bold uppercase tracking-[0.18em]">Receipt History</p>
              <div class="mt-2 space-y-2">
                <div v-for="item in submissionReceiptHistoryItems" :key="`${item.createdAt}:${item.action}`" class="rounded-xl border border-white/60 bg-white/60 px-3 py-2">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs font-semibold">{{ item.title }}</div>
                    <div class="text-[11px] opacity-70">{{ item.createdLabel }}</div>
                  </div>
                  <div class="mt-1 text-xs">{{ item.detail }}</div>
                  <a v-if="item.explorerUrl" :href="item.explorerUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex text-[11px] font-semibold underline">Open in Explorer</a>
                </div>
              </div>
            </div>
          </div>

          <RelayPreflightPanel
            id="relay-preflight-panel"
            class="mb-4"
            :level="relayCheck.level"
            :status-label="relayCheck.label"
            :detail="relayCheck.detail"
            :payload-mode="relayCheck.payloadMode"
            :vm-state="relayCheck.vmState"
            :gas-consumed="relayCheck.gasConsumed"
            :operation="relayCheck.operation"
            :exception="relayCheck.exception"
            :stack="relayCheck.stack"
            :can-copy-payload="Boolean(relayCheckRequest)"
            :can-copy-stack="relayCheck.stack.length > 0"
            :can-export-json="Boolean(relayCheckRequest) || relayCheck.stack.length > 0"
            @copy-payload="copyRelayPayload"
            @copy-stack="copyRelayStack"
            @export-json="exportRelayPreflight"
          />

          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label class="space-y-1 text-sm">
              <span class="font-medium text-slate-700">Relay raw transaction</span>
              <textarea
                :value="rawTransaction"
                rows="5"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                :disabled="workspace.isDraftImmutable.value"
                @input="rawTransaction = $event.target.value"
              />
            </label>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-slate-700">Workspace notes</span>
              <textarea
                :value="notes"
                rows="5"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                :disabled="workspace.isDraftImmutable.value"
                @input="notes = $event.target.value"
              />
            </label>
          </div>

          <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Export Preview</p>
            <pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-600">{{ exportPreview }}</pre>
          </div>
        </section>
      </div>
      <ActivitySidebar
        :draft-id="workspace.share.value.draftId"
        :share-path="workspace.share.value.sharePath"
        :share-url="shareUrl"
        :collaboration-url="collaborationUrl"
        :operator-url="operatorUrl"
        :can-write="workspace.share.value.canWrite"
        :can-operate="workspace.share.value.canOperate"
        :access-scope="workspace.share.value.accessScope"
        :share-status="workspace.share.value.status"
        :broadcast-mode="workspace.broadcast.value.mode"
        :signature-count="signerProgress.signatureCount"
        :required-signer-count="signerProgress.requiredCount"
        :pending-signer-count="signerProgress.pending.length"
        :relay-readiness-label="relayReadiness.label"
        :relay-readiness-detail="relayReadiness.detail"
        :relay-readiness-level="relayReadiness.level"
        :activity-items="activityItems.slice().reverse().slice(0, 6)"
        :action-context="activityActionContext"
        timeline-preference-key="home-sidebar"
        @activity-action="handleActivityAction"
        :last-txid="lastBroadcastTxid"
      />
    </div>

    <p v-if="statusMessage" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      {{ statusMessage }}
    </p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from '@/i18n';
import { useWalletConnection } from '@/composables/useWalletConnection.js';
import { OPERATIONS_RUNTIME } from '@/config/operationsRuntime.js';
import { createDraftRecord, createDraftStore } from '@/features/operations/drafts.js';
import {
  buildDraftApprovalTypedData,
  buildDraftExportBundle,
  buildRelayPayloadOptions,
  buildStagedTransactionBody,
  executeBroadcast,
  resolveRelayPayloadMode,
} from '@/features/operations/execution.js';
import { OPERATION_PRESETS, buildOperationFromPreset, buildPresetSummary } from '@/features/operations/presets.js';
import { appendActivityEntries, createActivityEvent } from '@/features/operations/activity.js';
import { createOperationsPreferences } from '@/features/operations/preferences.js';
import { evaluateRelayReadiness } from '@/features/operations/relayReadiness.js';
import { runRelayPreflight, buildRelayPreflightRequest } from '@/features/operations/relayPreflight.js';
import { createDraftInteractionHandlers } from '@/features/operations/viewActions.js';
import { summarizeSignerProgress } from '@/features/operations/signatures.js';
import { buildDraftCollaborationUrl, buildDraftShareUrl } from '@/features/operations/shareLinks.js';
import { buildExecuteMetaTxByAddressInvocation, buildMetaTransactionTypedData, computeArgsHash, fetchNonceForAddress, recoverPublicKeyFromTypedDataSignature } from '@/features/operations/metaTx.js';
import { createOperationsWorkspace } from '@/features/operations/useOperationsWorkspace.js';
import { buildSubmissionReceipt, getSubmissionButtonLabel, resolveLatestSubmissionReceipt } from '@/features/operations/submissionFeedback.js';
import { appendSubmissionReceiptEntries, buildSubmissionReceiptHistoryItems, createSubmissionReceiptEntry } from '@/features/operations/submissionReceipts.js';
import { getAbstractAccountHash, walletService } from '@/services/walletService.js';
import ActivitySidebar from './ActivitySidebar.vue';
import BroadcastOptionsPanel from './BroadcastOptionsPanel.vue';
import DraftStatusBanner from './DraftStatusBanner.vue';
import DraftSummaryStrip from './DraftSummaryStrip.vue';
import LoadAccountPanel from './LoadAccountPanel.vue';
import OperationComposerPanel from './OperationComposerPanel.vue';
import RelayPreflightPanel from './RelayPreflightPanel.vue';
import SignatureWorkflowPanel from './SignatureWorkflowPanel.vue';

const runtime = OPERATIONS_RUNTIME;
const { t } = useI18n();
const workspace = createOperationsWorkspace();
const draftStore = createDraftStore();
const walletConnection = useWalletConnection();
const preferences = createOperationsPreferences();
const presetOptions = OPERATION_PRESETS;

const accountIdHex = ref('');
const accountAddressScriptHash = ref('');
const preset = ref('invoke');
const targetContract = ref('');
const method = ref('');
const argsText = ref('[]');
const transferTokenScriptHash = ref('');
const transferRecipient = ref('');
const transferAmount = ref('');
const transferData = ref('');
const multisigTitle = ref('');
const multisigDescription = ref('');
const rawTransaction = ref('');
const notes = ref('');
const signerId = ref('');
const relayPayloadMode = ref(preferences.getRelayPayloadMode('home-workspace'));
const signerKind = ref('neo');
const signatureHex = ref('');
const evmAddress = ref('');
const statusMessage = ref('');
const lastBroadcastTxid = ref('');
const pendingSubmissionAction = ref('');
const submissionReceipt = ref(null);
const submissionReceiptEntries = ref([]);
const activityItems = ref([]);
const relayCheck = ref({ level: 'idle', label: 'Not Checked', detail: 'Run a relay preflight before submitting.', payloadMode: 'best', vmState: '', gasConsumed: '', operation: '', exception: '', stack: [] });
const relayCheckRequest = ref(null);

const draftCandidate = computed(() => buildOperationFromPreset({
  preset: preset.value,
  account: workspace.account.value,
  invoke: {
    targetContract: targetContract.value,
    method: method.value,
    argsText: argsText.value,
  },
  transfer: {
    tokenScriptHash: transferTokenScriptHash.value,
    recipient: transferRecipient.value,
    amount: transferAmount.value,
    data: transferData.value,
  },
  multisig: {
    title: multisigTitle.value,
    description: multisigDescription.value,
  },
}));

const composerSummary = computed(() => buildPresetSummary(draftCandidate.value));
const signerProgress = computed(() => summarizeSignerProgress(
  workspace.signerRequirements.value,
  workspace.signatures.value,
));

const neoWalletLabel = computed(() => walletConnection.isConnected.value ? walletService.address : 'not connected');
const evmWalletLabel = computed(() => evmAddress.value || 'not connected');
const shareUrl = computed(() => {
  const slug = workspace.share.value.shareSlug;
  if (!slug) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin ? buildDraftShareUrl(origin, slug) : workspace.share.value.sharePath;
});
const collaborationUrl = computed(() => {
  const shareSlug = workspace.share.value.shareSlug;
  const collaborationSlug = workspace.share.value.collaborationSlug;
  if (!shareSlug || !collaborationSlug) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin ? buildDraftCollaborationUrl(origin, shareSlug, collaborationSlug) : workspace.share.value.collaborationPath;
});
const operatorUrl = computed(() => {
  const shareSlug = workspace.share.value.shareSlug;
  const operatorSlug = workspace.share.value.operatorSlug;
  if (!shareSlug || !operatorSlug) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin ? buildDraftCollaborationUrl(origin, shareSlug, operatorSlug) : workspace.share.value.operatorPath;
});
const canClientBroadcast = computed(() => Boolean(
  workspace.transactionBody.value?.clientInvocation && walletConnection.isConnected.value
));
const relayPayloadOptions = computed(() => buildRelayPayloadOptions({
  runtime,
  transactionBody: workspace.transactionBody.value,
  signatures: workspace.signatures.value,
}));
const selectedRelayPayloadMode = computed(() => resolveRelayPayloadMode({
  relayPayloadMode: relayPayloadMode.value,
  availableModes: relayPayloadOptions.value,
}));
const relayReadiness = computed(() => evaluateRelayReadiness({
  runtime,
  transactionBody: workspace.transactionBody.value,
  signatures: workspace.signatures.value,
}));
const canRelayBroadcast = computed(() => relayReadiness.value.isReady);
const isSubmissionPending = computed(() => Boolean(pendingSubmissionAction.value));
const submissionReceiptHistoryItems = computed(() => buildSubmissionReceiptHistoryItems(submissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl, limit: 4 }));
const activeSubmissionReceipt = computed(() => submissionReceipt.value || resolveLatestSubmissionReceipt(submissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl }));
const activityActionContext = computed(() => ({
  shareUrl: shareUrl.value,
  collaboratorUrl: collaborationUrl.value,
  operatorUrl: operatorUrl.value,
  relayTargetId: 'relay-preflight-panel',
  explorerBaseUrl: runtime.explorerBaseUrl,
}));
const {
  copyRelayPayload,
  copyRelayStack,
  exportRelayPreflight,
  handleSummaryAction,
  handleActivityAction,
} = createDraftInteractionHandlers({
  getRelayCheck: () => relayCheck.value,
  getRelayRequest: () => relayCheckRequest.value,
  setStatus: (message) => { statusMessage.value = message; },
});

watch(relayPayloadMode, (value) => {
  preferences.setRelayPayloadMode('home-workspace', value);
});

const draftSummaryDraft = computed(() => buildCurrentDraftRecord({
  draftId: workspace.share.value.draftId || 'local-draft',
  shareSlug: workspace.share.value.shareSlug || 'local-share',
}));

const exportPreview = computed(() => JSON.stringify(buildDraftExportBundle({
  draftRecord: buildCurrentDraftRecord({
    draftId: workspace.share.value.draftId || 'local-draft',
    shareSlug: workspace.share.value.shareSlug || 'local-share',
  }),
  origin: typeof window !== 'undefined' ? window.location.origin : '',
}), null, 2));

function setSubmissionPending(action) {
  pendingSubmissionAction.value = action;
  submissionReceipt.value = buildSubmissionReceipt({
    action,
    phase: 'pending',
    explorerBaseUrl: runtime.explorerBaseUrl,
  });
}

function setSubmissionResult(action, { phase = 'success', detail = '', txid = '' } = {}) {
  pendingSubmissionAction.value = '';
  const entry = createSubmissionReceiptEntry({ action, phase, detail, txid });
  submissionReceipt.value = buildSubmissionReceipt({
    action,
    phase,
    detail,
    txid,
    explorerBaseUrl: runtime.explorerBaseUrl,
  });
  return entry;
}

function buildCurrentDraftRecord({ draftId, shareSlug } = {}) {
  return createDraftRecord({
    draftId,
    shareSlug,
    collaborationSlug: workspace.share.value.collaborationSlug || undefined,
    operatorSlug: workspace.share.value.operatorSlug || undefined,
    account: workspace.account.value,
    operationBody: workspace.operationBody.value,
    transactionBody: workspace.transactionBody.value,
    signerRequirements: workspace.signerRequirements.value,
    signatures: workspace.signatures.value,
    broadcastMode: workspace.broadcast.value.mode,
    metadata: {
      preset: preset.value,
      notes: notes.value,
      multisigTitle: multisigTitle.value,
      multisigDescription: multisigDescription.value,
      lastBroadcastTxid: lastBroadcastTxid.value,
      relayPreflight: relayCheck.value?.level && relayCheck.value.level !== 'idle' ? relayCheck.value : null,
      activity: activityItems.value,
      submissionReceipts: submissionReceiptEntries.value,
      availableWalletModes: walletConnection.availableWalletModes.value,
    },
  });
}

async function persistSubmissionReceipt(entry) {
  submissionReceiptEntries.value = appendSubmissionReceiptEntries(submissionReceiptEntries.value, entry);
  if (!workspace.share.value.shareSlug) return;
  try {
    const record = await draftStore.appendSubmissionReceipt(workspace.share.value.shareSlug, entry, operatorMutationOptions());
    submissionReceiptEntries.value = record.metadata?.submissionReceipts || submissionReceiptEntries.value;
  } catch (_) {}
}

async function appendActivity(event) {
  activityItems.value = appendActivityEntries(activityItems.value, event);
  if (!workspace.share.value.shareSlug) return;
  try {
    const record = await draftStore.appendActivity(workspace.share.value.shareSlug, event, accessMutationOptions());
    activityItems.value = record.metadata?.activity || activityItems.value;
  } catch (_) {}
}

function syncSignerRequirements() {
  if (!workspace.account.value.accountAddressScriptHash && !walletService.address && !evmAddress.value) {
    workspace.setSignerRequirements([]);
    return;
  }

  workspace.setSignerRequirements([
    {
      id: walletService.address || workspace.account.value.accountAddressScriptHash || 'neo-wallet-pending',
      kind: 'neo',
    },
    {
      id: evmAddress.value || 'evm-wallet-pending',
      kind: 'evm',
    },
  ]);
}

async function connectNeoWallet() {
  try {
    await walletConnection.connect();
    syncSignerRequirements();
    statusMessage.value = `Neo wallet connected: ${walletService.address}`;
  } catch {
    statusMessage.value = 'Neo wallet connection failed.';
  }
}

async function connectEvmWalletAction() {
  try {
    const { address } = await walletConnection.connectEvm();
    evmAddress.value = address.toLowerCase();
    syncSignerRequirements();
    statusMessage.value = `EVM wallet connected: ${evmAddress.value}`;
  } catch {
    statusMessage.value = 'EVM wallet connection failed.';
  }
}

function loadAccount() {
  workspace.loadAbstractAccount({
    accountIdHex: accountIdHex.value,
    accountAddressScriptHash: accountAddressScriptHash.value,
  });
  syncSignerRequirements();
  signerId.value = walletService.address || workspace.account.value.accountAddressScriptHash;
  appendActivity(createActivityEvent({ type: 'account_loaded', actor: 'workspace', detail: 'Abstract account loaded' }));
  statusMessage.value = 'Abstract Account loaded into the home workspace.';
}

function stageOperation() {
  const nextOperationBody = {
    ...draftCandidate.value,
    createdAt: new Date().toISOString(),
  };

  workspace.setOperationBody(nextOperationBody);
  workspace.setTransactionBody(buildStagedTransactionBody({
    aaContractHash: getAbstractAccountHash(),
    account: workspace.account.value,
    operationBody: nextOperationBody,
    signerAddress: walletService.address,
    rawTransaction: rawTransaction.value,
    notes: notes.value,
    createdAt: nextOperationBody.createdAt,
  }));

  syncSignerRequirements();
  appendActivity(createActivityEvent({ type: 'operation_staged', actor: 'workspace', detail: buildPresetSummary(nextOperationBody).title }));
  statusMessage.value = `${buildPresetSummary(nextOperationBody).title} staged locally. Create a draft to freeze and share it.`;
}

async function persistDraft() {
  try {
    if (!workspace.transactionBody.value) {
      throw new Error('Stage an operation before creating a draft.');
    }

    if (workspace.share.value.draftId) {
      statusMessage.value = 'This draft is already persisted and immutable.';
      return;
    }

    const payload = buildCurrentDraftRecord();
    const record = await draftStore.createDraft(payload);

    workspace.hydrateDraft(record);
    rawTransaction.value = record.transaction_body?.rawTransaction || '';
    if (record.metadata?.relayPreflight) {
      relayCheck.value = { ...relayCheck.value, ...record.metadata.relayPreflight };
    }
    submissionReceiptEntries.value = record.metadata?.submissionReceipts || submissionReceiptEntries.value;
    activityItems.value = record.metadata?.activity || [];
    await appendActivity(createActivityEvent({ type: 'draft_created', actor: runtime.collaborationEnabled ? 'supabase' : 'local', detail: 'Share draft persisted' }));
    statusMessage.value = runtime.collaborationEnabled
      ? 'Anonymous share draft persisted to Supabase. Share the collaborator link to collect signatures; the share link stays read-only.'
      : 'Local-only draft persisted in this browser. Share links will only reopen here until Supabase is configured.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function appendSignatureRecordToWorkspace(nextSignature) {
  if (workspace.share.value.shareSlug) {
    const record = await draftStore.appendSignature(workspace.share.value.shareSlug, nextSignature, accessMutationOptions());
    workspace.replaceSignatures(record.signatures || []);
    workspace.setShareStatus(record.status || workspace.share.value.status);
    return;
  }

  workspace.appendSignature(nextSignature);
}

function resolveSignerId(kindValue) {
  if (signerId.value) return signerId.value.trim();
  if (kindValue === 'evm') return evmAddress.value || 'evm-wallet-pending';
  return walletService.address || workspace.account.value.accountAddressScriptHash || 'neo-wallet-pending';
}

async function appendManualSignature() {
  try {
    const nextSignature = {
      signerId: resolveSignerId(signerKind.value),
      kind: signerKind.value,
      signatureHex: signatureHex.value,
      createdAt: new Date().toISOString(),
    };

    if (!nextSignature.signatureHex) {
      throw new Error('Enter a signature before appending it to the draft.');
    }

    await appendSignatureRecordToWorkspace(nextSignature);
    signatureHex.value = '';
    signerId.value = resolveSignerId(signerKind.value);
    await appendActivity(createActivityEvent({ type: 'signature_added', actor: signerKind.value, detail: 'Signature appended' }));
    statusMessage.value = 'Signature appended to the workspace.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function signWithEvmWallet() {
  try {
    if (!workspace.transactionBody.value) {
      throw new Error('Stage an operation before requesting an EVM approval.');
    }

    if (!evmAddress.value) {
      const { address } = await walletConnection.connectEvm();
      evmAddress.value = address.toLowerCase();
      syncSignerRequirements();
    }

    const aaContractHash = getAbstractAccountHash();
    const rpcUrl = walletService.rpcUrl;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const argsHashHex = await computeArgsHash({
      rpcUrl,
      aaContractHash,
      args: workspace.operationBody.value?.args || [],
    });
    const nonce = await fetchNonceForAddress({
      rpcUrl,
      aaContractHash,
      accountAddressScriptHash: workspace.account.value.accountAddressScriptHash,
      evmSignerAddress: evmAddress.value,
    });
    const typedData = buildMetaTransactionTypedData({
      chainId: 894710606,
      verifyingContract: aaContractHash,
      accountIdHex: workspace.account.value.accountIdHex,
      targetContract: workspace.operationBody.value?.targetContract,
      method: workspace.operationBody.value?.method,
      argsHashHex,
      nonce,
      deadline,
    });
    const signature = await walletService.signTypedDataWithEvm(typedData);
    const publicKey = recoverPublicKeyFromTypedDataSignature({ typedData, signature });
    const metaInvocation = buildExecuteMetaTxByAddressInvocation({
      aaContractHash,
      accountAddressScriptHash: workspace.account.value.accountAddressScriptHash,
      evmPublicKeyHex: publicKey,
      targetContract: workspace.operationBody.value?.targetContract,
      method: workspace.operationBody.value?.method,
      methodArgs: workspace.operationBody.value?.args || [],
      argsHashHex,
      nonce,
      deadline,
      signatureHex: signature,
    });

    await appendSignatureRecordToWorkspace({
      signerId: evmAddress.value,
      kind: 'evm',
      signatureHex: signature,
      publicKey,
      payloadDigest: argsHashHex,
      metadata: {
        typedData,
        argsHashHex,
        nonce: String(nonce),
        deadline: String(deadline),
        metaInvocation,
      },
      createdAt: new Date().toISOString(),
    });
    await appendActivity(createActivityEvent({ type: 'signature_added', actor: 'evm', detail: 'Contract-aligned meta signature collected' }));
    statusMessage.value = 'Contract-aligned EVM meta signature collected and attached to the draft.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function persistRelayCheckMetadata(snapshot) {
  if (!workspace.share.value.shareSlug) return;
  try {
    await draftStore.setRelayPreflight(workspace.share.value.shareSlug, { relayPreflight: snapshot }, operatorMutationOptions());
  } catch (_) {}
}

async function checkRelay() {
  setSubmissionPending('relay-check');
  try {
    relayCheckRequest.value = buildRelayPreflightRequest({
      relayEndpoint: runtime.relayEndpoint,
      relayPayloadMode: relayPayloadMode.value,
      relayRawEnabled: runtime.relayRawEnabled,
      transactionBody: workspace.transactionBody.value,
      signatures: workspace.signatures.value,
    });
    relayCheck.value = await runRelayPreflight({
      walletService,
      relayEndpoint: runtime.relayEndpoint,
      relayPayloadMode: relayPayloadMode.value,
      relayRawEnabled: runtime.relayRawEnabled,
      transactionBody: workspace.transactionBody.value,
      signatures: workspace.signatures.value,
    });
    await persistRelayCheckMetadata(relayCheck.value);
    await appendActivity(createActivityEvent({ type: 'relay_preflight', actor: 'relay', detail: relayCheck.value.label }));
    statusMessage.value = `${relayCheck.value.label}: ${relayCheck.value.detail}`;
    await persistSubmissionReceipt(setSubmissionResult('relay-check', { phase: 'success', detail: relayCheck.value.detail }));
  } catch (error) {
    relayCheck.value = {
      level: 'blocked',
      label: 'Relay Check Failed',
      detail: error?.message || String(error),
      payloadMode: relayPayloadMode.value,
      vmState: '',
      gasConsumed: '',
      operation: '',
      exception: error?.message || String(error),
      stack: [],
    };
    await persistRelayCheckMetadata(relayCheck.value);
    statusMessage.value = relayCheck.value.detail;
    await persistSubmissionReceipt(setSubmissionResult('relay-check', { phase: 'error', detail: relayCheck.value.detail }));
  }
}

async function updateDraftStatus(status) {
  if (!workspace.share.value.shareSlug) return;
  const record = await draftStore.updateStatus(workspace.share.value.shareSlug, status, operatorMutationOptions());
  workspace.setShareStatus(record.status || status);
}

async function broadcastWithNeoWallet() {
  setSubmissionPending('client-broadcast');
  try {
    const result = await executeBroadcast({
      mode: 'client',
      signerAddress: walletService.address,
      transactionBody: workspace.transactionBody.value,
      relayPayloadMode: relayPayloadMode.value,
      signatures: workspace.signatures.value,
      walletService,
      relayEndpoint: runtime.relayEndpoint,
    });
    lastBroadcastTxid.value = result?.txid || result?.result?.hash || '';
    await updateDraftStatus('broadcasted');
    await appendActivity(createActivityEvent({ type: 'broadcast_client', actor: 'neo', detail: lastBroadcastTxid.value || 'Client broadcast submitted' }));
    statusMessage.value = `Client-side Neo broadcast submitted${lastBroadcastTxid.value ? `: ${lastBroadcastTxid.value}` : '.'}`;
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', {
      phase: 'success',
      detail: 'Client-side Neo broadcast submitted.',
      txid: lastBroadcastTxid.value,
    }));
  } catch (error) {
    statusMessage.value = error?.message || String(error);
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', { phase: 'error', detail: statusMessage.value }));
  }
}

async function submitViaRelay() {
  setSubmissionPending('relay-submit');
  try {
    const result = await executeBroadcast({
      mode: 'relay',
      relayRawEnabled: runtime.relayRawEnabled,
      transactionBody: workspace.transactionBody.value,
      walletService,
      relayEndpoint: runtime.relayEndpoint,
    });
    lastBroadcastTxid.value = result?.txid || result?.result?.hash || '';
    await updateDraftStatus('relayed');
    await appendActivity(createActivityEvent({ type: 'broadcast_relay', actor: 'relay', detail: lastBroadcastTxid.value || 'Relay submission completed' }));
    statusMessage.value = `Relay submission completed${lastBroadcastTxid.value ? `: ${lastBroadcastTxid.value}` : '.'}`;
    await persistSubmissionReceipt(setSubmissionResult('relay-submit', {
      phase: 'success',
      detail: 'Relay submission completed.',
      txid: lastBroadcastTxid.value,
    }));
  } catch (error) {
    statusMessage.value = error?.message || String(error);
    await persistSubmissionReceipt(setSubmissionResult('relay-submit', { phase: 'error', detail: statusMessage.value }));
  }
}

function accessMutationOptions() {
  return { accessSlug: workspace.share.value.operatorSlug || workspace.share.value.collaborationSlug || '' };
}

function operatorMutationOptions() {
  return { accessSlug: workspace.share.value.operatorSlug || '' };
}

async function copyShareLink() {
  if (!shareUrl.value || !navigator?.clipboard?.writeText) return;
  await navigator.clipboard.writeText(shareUrl.value);
  statusMessage.value = 'Share link copied to clipboard.';
}

async function copyCollaboratorLink() {
  if (!collaborationUrl.value || !navigator?.clipboard?.writeText) return;
  await navigator.clipboard.writeText(collaborationUrl.value);
  statusMessage.value = 'Collaborator link copied to clipboard.';
}

async function copyOperatorLink() {
  if (!operatorUrl.value || !navigator?.clipboard?.writeText) return;
  await navigator.clipboard.writeText(operatorUrl.value);
  statusMessage.value = 'Operator link copied to clipboard.';
}

async function rotateCollaboratorLink() {
  if (!workspace.share.value.shareSlug || !workspace.share.value.operatorSlug) return;
  try {
    const record = await draftStore.rotateCollaboratorLink(
      workspace.share.value.shareSlug,
      operatorMutationOptions(),
    );
    workspace.hydrateDraft(record);
    await appendActivity(createActivityEvent({ type: 'collaborator_link_rotated', actor: runtime.collaborationEnabled ? 'supabase' : 'local', detail: 'Collaborator link rotated' }));
    statusMessage.value = 'Collaborator link rotated. The previous signer link no longer works.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function rotateOperatorLink() {
  if (!workspace.share.value.shareSlug || !workspace.share.value.operatorSlug) return;
  try {
    const record = await draftStore.rotateOperatorLink(
      workspace.share.value.shareSlug,
      operatorMutationOptions(),
    );
    workspace.hydrateDraft(record);
    await appendActivity(createActivityEvent({ type: 'operator_link_rotated', actor: runtime.collaborationEnabled ? 'supabase' : 'local', detail: 'Operator link rotated' }));
    statusMessage.value = 'Operator link rotated. The previous operator link no longer works.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

function exportDraftJson() {
  const json = exportPreview.value;
  const blob = new Blob([json], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${workspace.share.value.shareSlug || 'aa-draft'}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  statusMessage.value = 'Draft JSON exported for storage, signature collection, or relay submission.';
}
</script>
