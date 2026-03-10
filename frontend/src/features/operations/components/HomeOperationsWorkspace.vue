<template>
  <section class="rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-6 md:p-8 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-neo-500/5 to-transparent pointer-events-none"></div>
    <div class="relative z-10">
      <div class="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="mb-2 text-xs font-bold uppercase tracking-widest text-neo-400">Abstract Account Workspace</p>
          <h1 class="text-3xl font-extrabold tracking-tight text-white font-outfit">Load, compose, sign, and broadcast</h1>
        </div>
        <div class="flex flex-wrap gap-3">
          <button class="btn-secondary" @click="connectNeoWallet">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg> Connect Neo Wallet
          </button>
          <button class="btn-secondary" @click="connectEvmWalletAction">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg> Connect EVM Wallet
          </button>
          <div class="relative">
            <button class="btn-primary" @click="showActionsMenu = !showActionsMenu">Actions <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>
            <transition name="fade-in-up">
              <div v-if="showActionsMenu" class="absolute right-0 mt-3 w-64 rounded-xl bg-slate-800 shadow-2xl border border-slate-700 py-2 z-50 overflow-hidden backdrop-blur-lg">
                <button class="w-full px-5 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-50" :disabled="!shareUrl" @click="copyShareLink">Copy Share Link</button>
                <button class="w-full px-5 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-50" :disabled="!collaborationUrl" @click="copyCollaboratorLink">Copy Collaborator Link</button>
                <button class="w-full px-5 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-50" :disabled="!operatorUrl" @click="copyOperatorLink">Copy Operator Link</button>
                <div class="border-t border-slate-700 my-1"></div>
                <button class="w-full px-5 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-50" :disabled="!collaborationUrl || isSubmissionPending" @click="rotateCollaboratorLink">Rotate Collaborator Link</button>
                <button class="w-full px-5 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-50" :disabled="!operatorUrl || isSubmissionPending" @click="rotateOperatorLink">Rotate Operator Link</button>
                <button class="w-full px-5 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-50" :disabled="!workspace.transactionBody.value" @click="exportDraftJson">Export Draft JSON</button>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <DraftStatusBanner v-if="workspace.operationBody.value || workspace.share.value.draftId || activityItems.length > 0" class="mb-8 rounded-xl border-slate-700/50 shadow-lg" :status="workspace.share.value.status" :activity="activityItems" />

      <div class="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-inner backdrop-blur-md">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Neo Wallet</p>
          <p class="text-sm text-white font-semibold truncate">{{ neoWalletLabel }}</p>
        </div>
        <div class="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-inner backdrop-blur-md">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">EVM Wallet</p>
          <p class="text-sm text-white font-semibold truncate">{{ evmWalletLabel }}</p>
        </div>
        <div class="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-inner backdrop-blur-md">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Signatures</p>
          <div class="flex items-center gap-2 mt-1">
            <div class="w-full bg-slate-700 rounded-full h-1.5"><div class="bg-neo-500 h-1.5 rounded-full" :style="{ width: (signerProgress.requiredCount ? Math.min(100, (signerProgress.signatureCount / signerProgress.requiredCount) * 100) : 0) + '%' }"></div></div>
            <p class="text-sm text-white font-semibold tabular-nums">{{ signerProgress.signatureCount }} / {{ signerProgress.requiredCount || 0 }}</p>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-inner backdrop-blur-md">
          <p class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Collaboration</p>
          <div class="flex items-center mt-1">
            <span class="w-2 h-2 rounded-full mr-2" :class="runtime.collaborationEnabled ? 'bg-neo-500 animate-pulse' : 'bg-slate-500'"></span>
            <p class="text-sm text-white font-semibold">{{ runtime.collaborationEnabled ? 'Ready' : 'Local' }}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-6">
          <div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-lg transition-all duration-300">
            <button @click="step1Expanded = !step1Expanded" class="w-full bg-slate-800/40 px-6 py-5 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-700/40 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-neo-500/20 border border-neo-500/50 text-neo-400 flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(34,197,94,0.2)]">1</div>
                <h2 class="text-lg font-bold text-white font-outfit">Load Account</h2>
              </div>
              <span class="text-slate-400 text-sm font-mono transform transition-transform" :class="step1Expanded ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-show="step1Expanded" class="p-6 md:p-8 animate-fade-in">
              <LoadAccountPanel class="dark-panel-override" :account-address-script-hash="accountAddressScriptHash" :candidate-addresses="discoveredAccountAddresses" :resolved-owner-address="resolvedMatrixOwnerAddress" @update:account-address-script-hash="accountAddressScriptHash = $event" @select-address="selectDiscoveredAccount" @load="loadAccount" />
            </div>
          </div>

          <div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-lg transition-all duration-300">
            <button @click="step2Expanded = !step2Expanded" class="w-full bg-slate-800/40 px-6 py-5 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-700/40 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-neo-500/20 border border-neo-500/50 text-neo-400 flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(34,197,94,0.2)]">2</div>
                <h2 class="text-lg font-bold text-white font-outfit">Compose Operation</h2>
              </div>
              <span class="text-slate-400 text-sm font-mono transform transition-transform" :class="step2Expanded ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-show="step2Expanded" class="p-6 md:p-8 animate-fade-in">
              <OperationComposerPanel class="dark-panel-override" :preset="preset" :preset-options="presetOptions" :target-contract="targetContract" :resolved-contract-hash="resolvedContractHash" :resolved-contract-name="resolvedContractName" :contract-suggestions="contractSuggestions" :contract-lookup-status="contractLookupStatus" :method-options="methodOptions" :parameter-fields="parameterFields" :method="method" :args-text="argsText" :transfer-token-script-hash="transferTokenScriptHash" :transfer-recipient="transferRecipient" :transfer-amount="transferAmount" :transfer-data="transferData" :multisig-title="multisigTitle" :multisig-description="multisigDescription" :summary-title="composerSummary.title" :summary-detail="composerSummary.detail" :batch-account-ids="batchAccountIds" :batch-admins="batchAdmins" :batch-admin-threshold="batchAdminThreshold" :batch-managers="batchManagers" :batch-manager-threshold="batchManagerThreshold" @update:preset="preset = $event" @update:target-contract="targetContract = $event" @update:method="method = $event" @select-contract-suggestion="selectContractSuggestion" @update:parameter-value="updateParameterValue" @update:args-text="argsText = $event" @update:transfer-token-script-hash="transferTokenScriptHash = $event" @update:transfer-recipient="transferRecipient = $event" @update:transfer-amount="transferAmount = $event" @update:transfer-data="transferData = $event" @update:multisig-title="multisigTitle = $event" @update:multisig-description="multisigDescription = $event" @update:batch-account-ids="batchAccountIds = $event" @update:batch-admins="batchAdmins = $event" @update:batch-admin-threshold="batchAdminThreshold = $event" @update:batch-managers="batchManagers = $event" @update:batch-manager-threshold="batchManagerThreshold = $event" @stage="stageOperation" />
            </div>
          </div>

          <div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-lg transition-all duration-300">
            <button @click="step3Expanded = !step3Expanded" class="w-full bg-slate-800/40 px-6 py-5 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-700/40 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-neo-500/20 border border-neo-500/50 text-neo-400 flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(34,197,94,0.2)]">3</div>
                <h2 class="text-lg font-bold text-white font-outfit">Collect Signatures</h2>
              </div>
              <span class="text-slate-400 text-sm font-mono transform transition-transform" :class="step3Expanded ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-show="step3Expanded" class="p-6 md:p-8 animate-fade-in space-y-6">
              <div class="flex gap-4">
                <button class="btn-secondary flex-1 border-neo-500/30 text-neo-300 hover:bg-neo-500/10 hover:border-neo-500/60 hover:text-white" :disabled="!workspace.transactionBody.value || isSubmissionPending" @click="signWithEvmWallet">Sign with EVM</button>
              </div>
              <SignatureWorkflowPanel class="dark-panel-override" :signer-id="signerId" :signer-kind="signerKind" :signature-hex="signatureHex" :required-signer-count="signerProgress.requiredCount" :signature-count="signerProgress.signatureCount" @update:signer-id="signerId = $event" @update:signer-kind="signerKind = $event" @update:signature-hex="signatureHex = $event" @append-signature="appendManualSignature" />
            </div>
          </div>

          <DraftSummaryStrip class="dark-panel-override shadow-xl rounded-xl border border-slate-700/50" v-if="workspace.operationBody.value || workspace.share.value.draftId" :draft="draftSummaryDraft" :action-context="activityActionContext" @summary-action="handleSummaryAction" />

          <div class="rounded-2xl border border-neo-500/20 bg-slate-800/60 overflow-hidden shadow-[0_4px_30px_rgba(34,197,94,0.05)] backdrop-blur-lg transition-all duration-300 relative">
            <div class="absolute inset-0 bg-gradient-to-t from-neo-500/5 to-transparent pointer-events-none"></div>
            <button @click="step4Expanded = !step4Expanded" class="relative w-full bg-slate-800/40 px-6 py-5 border-b border-neo-500/20 flex items-center justify-between hover:bg-slate-700/60 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-neo-500 text-slate-900 flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.4)]">4</div>
                <h2 class="text-lg font-bold text-white font-outfit">Broadcast</h2>
              </div>
              <span class="text-slate-400 text-sm font-mono transform transition-transform" :class="step4Expanded ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-show="step4Expanded" class="relative p-6 md:p-8 animate-fade-in space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button class="btn-primary" :disabled="!canClientBroadcast || isSubmissionPending" @click="broadcastWithNeoWallet">{{ pendingSubmissionAction === 'client-broadcast' ? 'Broadcasting…' : 'Broadcast with Neo Wallet' }}</button>
                <button class="btn-secondary" :disabled="relayPayloadOptions.length === 0 || isSubmissionPending" @click="checkRelay">{{ pendingSubmissionAction === 'relay-check' ? 'Checking Relay…' : 'Check Relay' }}</button>
                <button class="btn-primary bg-neo-600 hover:bg-neo-500 focus:ring-neo-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] border-transparent" :disabled="!canRelayBroadcast || isSubmissionPending" @click="submitViaRelay">{{ pendingSubmissionAction === 'relay-submit' ? 'Submitting…' : 'Submit via Relay' }}</button>
              </div>
              <BroadcastOptionsPanel class="dark-panel-override" :active-mode="workspace.broadcast.value.mode" :modes="runtime.broadcastModes" :active-relay-payload-mode="relayPayloadMode" :relay-payload-options="relayPayloadOptions" :relay-endpoint="runtime.relayEndpoint" @set-mode="workspace.setBroadcastMode($event)" @set-relay-payload-mode="relayPayloadMode = $event" @persist-draft="persistDraft" />
              <RelayPreflightPanel class="mt-6 dark-panel-override border-slate-700" v-if="relayCheck.level !== 'idle'" :level="relayCheck.level" :status-label="relayCheck.label" :detail="relayCheck.detail" :payload-mode="relayCheck.payloadMode" :vm-state="relayCheck.vmState" :gas-consumed="relayCheck.gasConsumed" :operation="relayCheck.operation" :exception="relayCheck.exception" :stack="relayCheck.stack" :can-copy-payload="Boolean(relayCheckRequest)" :can-copy-stack="relayCheck.stack.length > 0" :can-export-json="Boolean(relayCheckRequest) || relayCheck.stack.length > 0" @copy-payload="copyRelayPayload" @copy-stack="copyRelayStack" @export-json="exportRelayPreflight" />
              
              <transition name="fade-in-up">
                <div v-if="activeSubmissionReceipt" class="mt-6 rounded-xl border border-white/5 bg-slate-800/80 backdrop-blur-md px-6 py-5 shadow-xl" :class="activeSubmissionReceipt.tone === 'success' ? 'border-neo-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : activeSubmissionReceipt.tone === 'error' ? 'border-rose-500/30' : 'border-amber-500/30'">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="w-2.5 h-2.5 rounded-full" :class="activeSubmissionReceipt.tone === 'success' ? 'bg-neo-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : activeSubmissionReceipt.tone === 'error' ? 'bg-rose-500' : 'bg-amber-500'"></span>
                    <p class="text-xs font-bold uppercase tracking-widest text-white">Submission Receipt</p>
                  </div>
                  <p class="mt-1 text-sm text-slate-300 leading-relaxed">{{ activeSubmissionReceipt.detail }}</p>
                  <code v-if="activeSubmissionReceipt.txid" class="mt-4 block break-all rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-neo-300 font-mono shadow-inner">{{ activeSubmissionReceipt.txid }}</code>
                  <a v-if="activeSubmissionReceipt.explorerUrl" :href="activeSubmissionReceipt.explorerUrl" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex items-center text-sm font-semibold text-neo-400 hover:text-neo-300 transition-colors">
                    Open in Explorer <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  </a>
                  
                  <div v-if="submissionReceiptHistoryItems && submissionReceiptHistoryItems.length > 0" class="mt-6 border-t border-slate-700/50 pt-5">
                    <p class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Receipt History</p>
                    <div class="space-y-3">
                      <div v-for="item in submissionReceiptHistoryItems" :key="`${item.createdAt}:${item.action}`" class="rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3 hover:bg-slate-700/60 transition-colors">
                        <div class="flex items-center justify-between gap-3 mb-1">
                          <div class="text-sm font-semibold text-white">{{ item.title }}</div>
                          <div class="text-xs text-slate-400">{{ item.createdLabel }}</div>
                        </div>
                        <div class="text-sm text-slate-300 leading-relaxed">{{ item.detail }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
        <div>
          <ActivitySidebar class="dark-panel-override sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar-dark rounded-2xl border border-slate-700/50 bg-slate-800/50 shadow-2xl backdrop-blur-xl" :draft-id="workspace.share.value.draftId" :share-path="workspace.share.value.sharePath" :share-url="shareUrl" :collaboration-url="collaborationUrl" :operator-url="operatorUrl" :can-write="workspace.share.value.canWrite" :can-operate="workspace.share.value.canOperate" :access-scope="workspace.share.value.accessScope" :share-status="workspace.share.value.status" :broadcast-mode="workspace.broadcast.value.mode" :signature-count="signerProgress.signatureCount" :required-signer-count="signerProgress.requiredCount" :pending-signer-count="signerProgress.pending.length" :relay-readiness-label="relayReadiness.label" :relay-readiness-detail="relayReadiness.detail" :relay-readiness-level="relayReadiness.level" :activity-items="activityItems.slice().reverse().slice(0, 6)" :action-context="activityActionContext" timeline-preference-key="home-sidebar" @activity-action="handleActivityAction" :last-txid="lastBroadcastTxid" />
        </div>
      </div>
      <transition name="fade-in-up">
        <div v-if="statusMessage" class="mt-8 rounded-xl border border-neo-500/20 bg-slate-800/80 backdrop-blur-md px-5 py-4 text-sm text-neo-300 shadow-lg flex items-center">
          <svg class="w-5 h-5 mr-3 text-neo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span class="font-medium text-white">{{ statusMessage }}</span>
        </div>
      </transition>
    </div>
  </section>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@/i18n';
import { useWalletConnection } from '@/composables/useWalletConnection.js';
import { OPERATIONS_RUNTIME } from '@/config/operationsRuntime.js';
import { createDraftRecord, createDraftStore } from '@/features/operations/drafts.js';
import { buildDraftApprovalTypedData, buildDraftExportBundle, buildRelayPayloadOptions, buildStagedTransactionBody, executeBroadcast, resolveRelayPayloadMode } from '@/features/operations/execution.js';
import { OPERATION_PRESETS, buildOperationFromPreset, buildPresetSummary } from '@/features/operations/presets.js';
import { appendActivityEntries, createActivityEvent } from '@/features/operations/activity.js';
import { createOperationsPreferences } from '@/features/operations/preferences.js';
import { evaluateRelayReadiness } from '@/features/operations/relayReadiness.js';
import { runRelayPreflight, buildRelayPreflightRequest } from '@/features/operations/relayPreflight.js';
import { createDraftInteractionHandlers } from '@/features/operations/viewActions.js';
import { summarizeSignerProgress } from '@/features/operations/signatures.js';
import { buildDraftCollaborationUrl, buildDraftShareUrl } from '@/features/operations/shareLinks.js';
import { assertAccountAddressBound, buildExecuteMetaTxByAddressInvocation, buildMetaTransactionTypedData, computeArgsHash, fetchNonceForAddress, recoverPublicKeyFromTypedDataSignature } from '@/features/operations/metaTx.js';
import { createOperationsWorkspace } from '@/features/operations/useOperationsWorkspace.js';
import { buildSubmissionReceipt, getSubmissionButtonLabel, resolveLatestSubmissionReceipt } from '@/features/operations/submissionFeedback.js';
import { appendSubmissionReceiptEntries, buildSubmissionReceiptHistoryItems, createSubmissionReceiptEntry } from '@/features/operations/submissionReceipts.js';
import { getAbstractAccountHash, walletService } from '@/services/walletService.js';
import { getScriptHashFromAddress } from '@/utils/neo.js';
import { sanitizeHex } from '@/utils/hex.js';
import { discoverAccountsForMatrixDomain, isMatrixDomain } from '@/services/matrixDomainService.js';
import { isNeoDomain } from '@/services/domainResolverService.js';
import { buildParameterFields, buildContractParamFromField, loadContractManifest, searchContractsByName } from '@/services/contractLookupService.js';
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

const accountAddressScriptHash = ref('');
const discoveredAccountAddresses = ref([]);
const resolvedMatrixOwnerAddress = ref('');
const preset = ref('invoke');
const targetContract = ref('');
const resolvedContractHash = ref('');
const resolvedContractName = ref('');
const contractSuggestions = ref([]);
const contractLookupStatus = ref('');
const methodOptions = ref([]);
const parameterFields = ref([]);
const method = ref('');
const argsText = ref('[]');
const transferTokenScriptHash = ref('');
const transferRecipient = ref('');
const transferAmount = ref('');
const transferData = ref('');
const multisigTitle = ref('');
const multisigDescription = ref('');
const batchAccountIds = ref('[]');
const batchAdmins = ref('[]');
const batchAdminThreshold = ref('1');
const batchManagers = ref('[]');
const batchManagerThreshold = ref('0');
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
const showActionsMenu = ref(false);
const step1Expanded = ref(true);
const step2Expanded = ref(false);
const step3Expanded = ref(false);
const step4Expanded = ref(false);
let contractLookupRequestId = 0;
let contractSuggestionTimer = null;

const invokeTargetContract = computed(() => {
  if (resolvedContractHash.value) return resolvedContractHash.value;
  const raw = String(targetContract.value || '').trim();
  if (raw.startsWith('N')) {
    try {
      return sanitizeHex(getScriptHashFromAddress(raw));
    } catch (_error) {
      return '';
    }
  }
  const sanitized = sanitizeHex(raw);
  return /^[0-9a-f]{40}$/.test(sanitized) ? sanitized : '';
});

const draftCandidate = computed(() => buildOperationFromPreset({
  preset: preset.value,
  account: workspace.account.value,
  invoke: { targetContract: invokeTargetContract.value, method: method.value, argsText: argsText.value },
  transfer: { tokenScriptHash: transferTokenScriptHash.value, recipient: transferRecipient.value, amount: transferAmount.value, data: transferData.value },
  multisig: { title: multisigTitle.value, description: multisigDescription.value },
  batch: { accountIds: batchAccountIds.value, admins: batchAdmins.value, adminThreshold: batchAdminThreshold.value, managers: batchManagers.value, managerThreshold: batchManagerThreshold.value },
}));

const composerSummary = computed(() => buildPresetSummary(draftCandidate.value));
const signerProgress = computed(() => summarizeSignerProgress(workspace.signerRequirements.value, workspace.signatures.value));
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
const canClientBroadcast = computed(() => Boolean(workspace.transactionBody.value?.clientInvocation && walletConnection.isConnected.value));
const relayPayloadOptions = computed(() => buildRelayPayloadOptions({ runtime, transactionBody: workspace.transactionBody.value, signatures: workspace.signatures.value }));
const selectedRelayPayloadMode = computed(() => resolveRelayPayloadMode({ relayPayloadMode: relayPayloadMode.value, availableModes: relayPayloadOptions.value }));
const relayReadiness = computed(() => evaluateRelayReadiness({ runtime, transactionBody: workspace.transactionBody.value, signatures: workspace.signatures.value }));
const canRelayBroadcast = computed(() => relayReadiness.value.isReady);
const isSubmissionPending = computed(() => Boolean(pendingSubmissionAction.value));
const submissionReceiptHistoryItems = computed(() => buildSubmissionReceiptHistoryItems(submissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl, limit: 4 }));
const activeSubmissionReceipt = computed(() => submissionReceipt.value || resolveLatestSubmissionReceipt(submissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl }));
const activityActionContext = computed(() => ({ shareUrl: shareUrl.value, collaboratorUrl: collaborationUrl.value, operatorUrl: operatorUrl.value, relayTargetId: 'relay-preflight-panel', explorerBaseUrl: runtime.explorerBaseUrl }));
const { copyRelayPayload, copyRelayStack, exportRelayPreflight, handleSummaryAction, handleActivityAction } = createDraftInteractionHandlers({
  getRelayCheck: () => relayCheck.value,
  getRelayRequest: () => relayCheckRequest.value,
  setStatus: (message) => { statusMessage.value = message; },
});

watch(relayPayloadMode, (value) => { preferences.setRelayPayloadMode('home-workspace', value); });

function syncArgsTextFromParameters() {
  if (!parameterFields.value.length) return;
  argsText.value = JSON.stringify(parameterFields.value.map((field) => buildContractParamFromField(field)), null, 2);
}

function updateParameterValue({ key, value }) {
  parameterFields.value = parameterFields.value.map((field) => (field.key === key ? { ...field, value } : field));
  syncArgsTextFromParameters();
}

function selectContractSuggestion(suggestion) {
  targetContract.value = suggestion.displayName || `0x${suggestion.contractHash}`;
  resolvedContractHash.value = sanitizeHex(suggestion.contractHash);
  resolvedContractName.value = suggestion.displayName || '';
  contractSuggestions.value = [];
  void refreshContractMethods(`0x${sanitizeHex(suggestion.contractHash)}`);
}

async function refreshContractMethods(identifier = targetContract.value) {
  const requestId = ++contractLookupRequestId;
  contractLookupStatus.value = 'Loading contract methods…';
  try {
    const loaded = await loadContractManifest(identifier, {
      rpcUrl: walletService.rpcUrl || runtime.relayRpcUrl,
      matrixContractHash: runtime.matrixContractHash,
      neoNnsContractHash: runtime.neoNnsContractHash,
    });
    if (requestId !== contractLookupRequestId) return;

    resolvedContractHash.value = loaded.resolved?.contractHash || '';
    resolvedContractName.value = loaded.manifest?.name || loaded.resolved?.displayName || resolvedContractName.value;
    methodOptions.value = loaded.methods || [];
    contractSuggestions.value = [];

    if (method.value && !methodOptions.value.some((option) => option.name === method.value)) {
      method.value = '';
    }
    if (!method.value && methodOptions.value.length === 1) {
      method.value = methodOptions.value[0].name;
    }
    if (!method.value) {
      parameterFields.value = [];
    }

    contractLookupStatus.value = methodOptions.value.length
      ? `Loaded ${methodOptions.value.length} methods for ${resolvedContractName.value || `0x${resolvedContractHash.value}`}.`
      : 'Contract resolved, but no callable ABI methods were returned.';
  } catch (error) {
    if (requestId !== contractLookupRequestId) return;
    resolvedContractHash.value = '';
    resolvedContractName.value = '';
    methodOptions.value = [];
    parameterFields.value = [];
    contractLookupStatus.value = error?.message || String(error);
  }
}

watch(method, (nextMethod) => {
  const methodDefinition = methodOptions.value.find((option) => option.name === nextMethod) || null;
  parameterFields.value = buildParameterFields(methodDefinition);
  if (parameterFields.value.length) {
    syncArgsTextFromParameters();
  }
});

watch(targetContract, (value) => {
  const lookup = String(value || '').trim();
  clearTimeout(contractSuggestionTimer);
  contractSuggestions.value = [];

  if (!lookup) {
    resolvedContractHash.value = '';
    resolvedContractName.value = '';
    methodOptions.value = [];
    parameterFields.value = [];
    contractLookupStatus.value = '';
    return;
  }

  const directLookup = lookup.startsWith('N') || isMatrixDomain(lookup) || isNeoDomain(lookup) || /^[0-9a-f]{40}$/i.test(sanitizeHex(lookup));
  if (directLookup) {
    void refreshContractMethods(lookup);
    return;
  }

  contractSuggestionTimer = setTimeout(async () => {
    const requestId = ++contractLookupRequestId;
    contractLookupStatus.value = 'Searching contracts via N3Index…';
    try {
      const suggestions = await searchContractsByName(lookup, {
        baseUrl: runtime.n3IndexApiBaseUrl,
        network: runtime.n3IndexNetwork,
        rpcUrl: walletService.rpcUrl || runtime.relayRpcUrl,
      });
      if (requestId !== contractLookupRequestId) return;
      contractSuggestions.value = suggestions;
      resolvedContractHash.value = '';
      resolvedContractName.value = '';
      methodOptions.value = [];
      parameterFields.value = [];
      contractLookupStatus.value = suggestions.length
        ? 'Select a contract to load its ABI methods.'
        : 'No matching contracts found yet.';
    } catch (error) {
      if (requestId !== contractLookupRequestId) return;
      contractSuggestions.value = [];
      contractLookupStatus.value = error?.message || String(error);
    }
  }, 250);
});

onMounted(() => {
  if (String(targetContract.value || '').trim()) {
    void refreshContractMethods(targetContract.value);
  }
});

const draftSummaryDraft = computed(() => buildCurrentDraftRecord({ draftId: workspace.share.value.draftId || 'local-draft', shareSlug: workspace.share.value.shareSlug || 'local-share' }));
const exportPreview = computed(() => JSON.stringify(buildDraftExportBundle({ draftRecord: buildCurrentDraftRecord({ draftId: workspace.share.value.draftId || 'local-draft', shareSlug: workspace.share.value.shareSlug || 'local-share' }), origin: typeof window !== 'undefined' ? window.location.origin : '' }), null, 2));

function setSubmissionPending(action) {
  pendingSubmissionAction.value = action;
  submissionReceipt.value = buildSubmissionReceipt({ action, phase: 'pending', explorerBaseUrl: runtime.explorerBaseUrl });
}

function setSubmissionResult(action, { phase = 'success', detail = '', txid = '' } = {}) {
  pendingSubmissionAction.value = '';
  const entry = createSubmissionReceiptEntry({ action, phase, detail, txid });
  submissionReceipt.value = buildSubmissionReceipt({ action, phase, detail, txid, explorerBaseUrl: runtime.explorerBaseUrl });
  return entry;
}

function buildCurrentDraftRecord({ draftId, shareSlug } = {}) {
  return createDraftRecord({
    draftId, shareSlug,
    collaborationSlug: workspace.share.value.collaborationSlug || undefined,
    operatorSlug: workspace.share.value.operatorSlug || undefined,
    account: workspace.account.value,
    operationBody: workspace.operationBody.value,
    transactionBody: workspace.transactionBody.value,
    signerRequirements: workspace.signerRequirements.value,
    signatures: workspace.signatures.value,
    broadcastMode: workspace.broadcast.value.mode,
    metadata: {
      preset: preset.value, notes: notes.value, multisigTitle: multisigTitle.value, multisigDescription: multisigDescription.value,
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
    { id: walletService.address || workspace.account.value.accountAddressScriptHash || 'neo-wallet-pending', kind: 'neo' },
    { id: evmAddress.value || 'evm-wallet-pending', kind: 'evm' },
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

async function loadAccount(overrideAddress = '') {
  const lookup = String(overrideAddress || accountAddressScriptHash.value || '').trim();
  if (!lookup) {
    statusMessage.value = 'Enter an Abstract Account address or .matrix domain.';
    return;
  }

  let resolvedAddress = lookup;
  let resolvedAddressScriptHash = lookup;
  discoveredAccountAddresses.value = [];
  resolvedMatrixOwnerAddress.value = '';

  if (isMatrixDomain(lookup)) {
    const discovery = await discoverAccountsForMatrixDomain(lookup, {
      rpcUrl: walletService.rpcUrl,
      aaContractHash: getAbstractAccountHash(),
      matrixContractHash: runtime.matrixContractHash,
    });
    resolvedMatrixOwnerAddress.value = discovery.ownerAddress;

    if (discovery.accountAddresses.length > 1) {
      discoveredAccountAddresses.value = discovery.accountAddresses;
      statusMessage.value = 'Domain resolved to multiple Abstract Accounts. Select one to continue.';
      return;
    }

    if (discovery.accountAddresses.length === 1) {
      resolvedAddress = discovery.accountAddresses[0];
    } else if (discovery.ownerAddress) {
      resolvedAddress = discovery.ownerAddress;
    } else {
      statusMessage.value = 'No address could be resolved from that .matrix domain.';
      return;
    }
  }

  resolvedAddressScriptHash = resolvedAddress.startsWith('N')
    ? getScriptHashFromAddress(resolvedAddress)
    : sanitizeHex(resolvedAddress);

  try {
    await assertAccountAddressBound({
      rpcUrl: walletService.rpcUrl,
      aaContractHash: getAbstractAccountHash(),
      accountAddressScriptHash: resolvedAddressScriptHash,
    });
    accountAddressScriptHash.value = resolvedAddressScriptHash;
  } catch (e) {
    console.warn('Could not validate bound Abstract Account address.', e);
    statusMessage.value = isMatrixDomain(lookup)
      ? 'The .matrix domain resolved, but no bound Abstract Account was found for that controller address.'
      : 'No bound Abstract Account mapping was found for that address.';
    return;
  }

  workspace.loadAbstractAccount({ accountAddressScriptHash: resolvedAddressScriptHash });
  syncSignerRequirements();
  signerId.value = walletService.address || workspace.account.value.accountAddressScriptHash;
  appendActivity(createActivityEvent({ type: 'account_loaded', actor: 'workspace', detail: 'Abstract account loaded' }));
  statusMessage.value = isMatrixDomain(lookup)
    ? `Abstract Account loaded via ${lookup}.`
    : 'Abstract Account loaded into the home workspace.';
}

function stageOperation() {
  if (['invoke', 'multisigDraft'].includes(preset.value)) {
    if (!invokeTargetContract.value) {
      statusMessage.value = 'Resolve or select a contract before staging the operation.';
      return;
    }
    if (!String(method.value || '').trim()) {
      statusMessage.value = 'Pick a contract method before staging the operation.';
      return;
    }
  }

  const nextOperationBody = { ...draftCandidate.value, createdAt: new Date().toISOString() };
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
    if (!workspace.transactionBody.value) throw new Error('Stage an operation before creating a draft.');
    if (workspace.share.value.draftId) {
      statusMessage.value = 'This draft is already persisted and immutable.';
      return;
    }
    const payload = buildCurrentDraftRecord();
    const record = await draftStore.createDraft(payload);
    workspace.hydrateDraft(record);
    rawTransaction.value = record.transaction_body?.rawTransaction || '';
    if (record.metadata?.relayPreflight) relayCheck.value = { ...relayCheck.value, ...record.metadata.relayPreflight };
    submissionReceiptEntries.value = record.metadata?.submissionReceipts || submissionReceiptEntries.value;
    activityItems.value = record.metadata?.activity || [];
    await appendActivity(createActivityEvent({ type: 'draft_created', actor: runtime.collaborationEnabled ? 'supabase' : 'local', detail: 'Share draft persisted' }));
    statusMessage.value = runtime.collaborationEnabled ? 'Anonymous share draft persisted to Supabase. Share the collaborator link to collect signatures; the share link stays read-only.' : 'Local-only draft persisted in this browser. Share links will only reopen here until Supabase is configured.';
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

function selectDiscoveredAccount(address) {
  accountAddressScriptHash.value = address.startsWith('N') ? getScriptHashFromAddress(address) : sanitizeHex(address);
  discoveredAccountAddresses.value = [];
  void loadAccount(address);
}

async function appendManualSignature() {
  try {
    const nextSignature = { signerId: resolveSignerId(signerKind.value), kind: signerKind.value, signatureHex: signatureHex.value, createdAt: new Date().toISOString() };
    if (!nextSignature.signatureHex) throw new Error('Enter a signature before appending it to the draft.');
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
    if (!workspace.transactionBody.value) throw new Error('Stage an operation before requesting an EVM approval.');
    if (!evmAddress.value) {
      const { address } = await walletConnection.connectEvm();
      evmAddress.value = address.toLowerCase();
      syncSignerRequirements();
    }
    const aaContractHash = getAbstractAccountHash();
    const rpcUrl = walletService.rpcUrl;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const argsHashHex = await computeArgsHash({ rpcUrl, aaContractHash, args: workspace.operationBody.value?.args || [] });
    const nonce = await fetchNonceForAddress({ rpcUrl, aaContractHash, accountAddressScriptHash: workspace.account.value.accountAddressScriptHash, evmSignerAddress: evmAddress.value });
    const typedData = buildMetaTransactionTypedData({ chainId: 894710606, verifyingContract: aaContractHash, accountAddressScriptHash: workspace.account.value.accountAddressScriptHash, targetContract: workspace.operationBody.value?.targetContract, method: workspace.operationBody.value?.method, argsHashHex, nonce, deadline });
    const signature = await walletService.signTypedDataWithEvm(typedData);
    const publicKey = recoverPublicKeyFromTypedDataSignature({ typedData, signature });
    const metaInvocation = buildExecuteMetaTxByAddressInvocation({ aaContractHash, accountAddressScriptHash: workspace.account.value.accountAddressScriptHash, evmPublicKeyHex: publicKey, targetContract: workspace.operationBody.value?.targetContract, method: workspace.operationBody.value?.method, methodArgs: workspace.operationBody.value?.args || [], argsHashHex, nonce, deadline, signatureHex: signature });
    await appendSignatureRecordToWorkspace({ signerId: evmAddress.value, kind: 'evm', signatureHex: signature, publicKey, payloadDigest: argsHashHex, metadata: { typedData, argsHashHex, nonce: String(nonce), deadline: String(deadline), metaInvocation }, createdAt: new Date().toISOString() });
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
    relayCheckRequest.value = buildRelayPreflightRequest({ relayEndpoint: runtime.relayEndpoint, relayPayloadMode: relayPayloadMode.value, relayRawEnabled: runtime.relayRawEnabled, transactionBody: workspace.transactionBody.value, signatures: workspace.signatures.value });
    relayCheck.value = await runRelayPreflight({ walletService, relayEndpoint: runtime.relayEndpoint, relayPayloadMode: relayPayloadMode.value, relayRawEnabled: runtime.relayRawEnabled, transactionBody: workspace.transactionBody.value, signatures: workspace.signatures.value });
    await persistRelayCheckMetadata(relayCheck.value);
    await appendActivity(createActivityEvent({ type: 'relay_preflight', actor: 'relay', detail: relayCheck.value.label }));
    statusMessage.value = `${relayCheck.value.label}: ${relayCheck.value.detail}`;
    await persistSubmissionReceipt(setSubmissionResult('relay-check', { phase: 'success', detail: relayCheck.value.detail }));
  } catch (error) {
    relayCheck.value = { level: 'blocked', label: 'Relay Check Failed', detail: error?.message || String(error), payloadMode: relayPayloadMode.value, vmState: '', gasConsumed: '', operation: '', exception: error?.message || String(error), stack: [] };
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
    const result = await executeBroadcast({ mode: 'client', signerAddress: walletService.address, transactionBody: workspace.transactionBody.value, relayPayloadMode: relayPayloadMode.value, signatures: workspace.signatures.value, walletService, relayEndpoint: runtime.relayEndpoint });
    lastBroadcastTxid.value = result?.txid || result?.result?.hash || '';
    await updateDraftStatus('broadcasted');
    await appendActivity(createActivityEvent({ type: 'broadcast_client', actor: 'neo', detail: lastBroadcastTxid.value || 'Client broadcast submitted' }));
    statusMessage.value = `Client-side Neo broadcast submitted${lastBroadcastTxid.value ? `: ${lastBroadcastTxid.value}` : '.'}`;
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', { phase: 'success', detail: 'Client-side Neo broadcast submitted.', txid: lastBroadcastTxid.value }));
  } catch (error) {
    statusMessage.value = error?.message || String(error);
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', { phase: 'error', detail: statusMessage.value }));
  }
}

async function submitViaRelay() {
  setSubmissionPending('relay-submit');
  try {
    const result = await executeBroadcast({ mode: 'relay', relayRawEnabled: runtime.relayRawEnabled, transactionBody: workspace.transactionBody.value, walletService, relayEndpoint: runtime.relayEndpoint });
    lastBroadcastTxid.value = result?.txid || result?.result?.hash || '';
    await updateDraftStatus('relayed');
    await appendActivity(createActivityEvent({ type: 'broadcast_relay', actor: 'relay', detail: lastBroadcastTxid.value || 'Relay submission completed' }));
    statusMessage.value = `Relay submission completed${lastBroadcastTxid.value ? `: ${lastBroadcastTxid.value}` : '.'}`;
    await persistSubmissionReceipt(setSubmissionResult('relay-submit', { phase: 'success', detail: 'Relay submission completed.', txid: lastBroadcastTxid.value }));
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
  showActionsMenu.value = false;
}

async function copyCollaboratorLink() {
  if (!collaborationUrl.value || !navigator?.clipboard?.writeText) return;
  await navigator.clipboard.writeText(collaborationUrl.value);
  statusMessage.value = 'Collaborator link copied to clipboard.';
  showActionsMenu.value = false;
}

async function copyOperatorLink() {
  if (!operatorUrl.value || !navigator?.clipboard?.writeText) return;
  await navigator.clipboard.writeText(operatorUrl.value);
  statusMessage.value = 'Operator link copied to clipboard.';
  showActionsMenu.value = false;
}

async function rotateCollaboratorLink() {
  if (!workspace.share.value.shareSlug || !workspace.share.value.operatorSlug) return;
  try {
    const record = await draftStore.rotateCollaboratorLink(workspace.share.value.shareSlug, operatorMutationOptions());
    workspace.hydrateDraft(record);
    await appendActivity(createActivityEvent({ type: 'collaborator_link_rotated', actor: runtime.collaborationEnabled ? 'supabase' : 'local', detail: 'Collaborator link rotated' }));
    statusMessage.value = 'Collaborator link rotated. The previous signer link no longer works.';
    showActionsMenu.value = false;
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function rotateOperatorLink() {
  if (!workspace.share.value.shareSlug || !workspace.share.value.operatorSlug) return;
  try {
    const record = await draftStore.rotateOperatorLink(workspace.share.value.shareSlug, operatorMutationOptions());
    workspace.hydrateDraft(record);
    await appendActivity(createActivityEvent({ type: 'operator_link_rotated', actor: runtime.collaborationEnabled ? 'supabase' : 'local', detail: 'Operator link rotated' }));
    statusMessage.value = 'Operator link rotated. The previous operator link no longer works.';
    showActionsMenu.value = false;
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
  showActionsMenu.value = false;
}
</script>
