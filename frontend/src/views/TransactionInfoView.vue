<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in-up">
    <div class="relative bg-white/80 backdrop-blur-xl shadow-2xl shadow-neo-500/10 rounded-3xl overflow-hidden border border-slate-200/60 p-8 sm:p-12">
      <div class="relative z-10">
        <template v-if="draftId">
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">{{ t('sharedDraft.title', 'Shared Transaction Draft') }}</h1>
          <p class="text-base text-slate-500 mb-8 max-w-2xl">{{ t('sharedDraft.subtitle', 'Load an immutable transaction draft, review collected approvals, append a new signature, and choose the final client-side or relay broadcast path.') }}</p>
          <DraftSummaryStrip class="mb-8" :title="t('sharedDraft.sharedDraftOverview', 'Shared Draft Overview')" :draft="draft" :action-context="activityActionContext" @summary-action="handleSummaryAction" />

          <DraftStatusBanner
            class="mb-8"
            :status="draft?.status || 'draft'"
            :activity="activityEvents"
          />

          <div class="grid gap-4 mb-8 lg:grid-cols-4">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Draft ID</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ draftId }}</code>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Share URL</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ shareUrl || 'Loading…' }}</code>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{{ t('sharedDraft.collaboratorLinkLabel', 'Collaborator Link') }}</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ collaborationUrl || 'Read-only access' }}</code>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{{ t('sharedDraft.operatorLinkLabel', 'Operator Link') }}</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ operatorUrl || 'Operator access required' }}</code>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status</p>
              <div class="text-sm text-slate-700">{{ draft?.status || 'loading' }}</div>
            </div>
          </div>
          <div v-if="draft && accessScope === 'read'" class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {{ t('sharedDraft.readOnlyNotice', 'This shared draft is read-only. Open the Collaborator Link to sign, or the Operator Link to manage relay and broadcast actions.') }}
          </div>
          <div v-else-if="draft && accessScope === 'sign'" class="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {{ t('sharedDraft.signatureOnlyNotice', 'This is a signature-only link. Relay checks, broadcasts, and link rotation require the Operator Link.') }}
          </div>
          <div v-if="loading" class="text-sm text-slate-500">Loading shared draft…</div>
          <div v-else-if="loadError" class="text-sm text-rose-600">{{ loadError }}</div>
          <div v-else-if="draft" class="space-y-6">
            <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <h2 class="text-lg font-bold text-slate-900">Operation Snapshot</h2>
                  <p class="text-sm text-slate-500">Key execution details, relay state, and payload availability for this immutable draft.</p>
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <div v-for="item in operationSnapshotItems" :key="item.label" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{{ item.label }}</p>
                    <div class="mt-2 text-sm font-medium text-slate-800 break-all">{{ item.value }}</div>
                    <p v-if="item.note" class="mt-2 text-xs leading-relaxed text-slate-500">{{ item.note }}</p>
                  </div>
                </div>
              </section>
              <section class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <h2 class="text-lg font-bold text-slate-900">Signer Checklist</h2>
                  <p class="text-sm text-slate-500">{{ signerProgress.signatureCount }}/{{ signerProgress.requiredCount }} required approvals collected{{ signerProgress.pending.length ? ` · ${signerProgress.pending.length} still pending` : signerProgress.requiredCount ? ' · all required signers satisfied' : ' · no required signer roster recorded' }}.</p>
                </div>
                <div v-if="signerChecklistItems.length === 0" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No signer checklist has been recorded for this draft yet.</div>
                <div v-else class="space-y-3">
                  <div v-for="item in signerChecklistItems" :key="item.key" class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-800 break-all">{{ item.label }}</div>
                      <div class="mt-1 text-xs leading-relaxed text-slate-500">{{ item.detail }}</div>
                      <code v-if="item.signaturePreview" class="mt-2 block text-[11px] text-slate-500">{{ item.signaturePreview }}</code>
                    </div>
                    <span :class="item.status === 'Collected' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'" class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">{{ item.status }}</span>
                  </div>
                </div>
              </section>
            </div>

            <div class="grid gap-6 lg:grid-cols-2">
              <section class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <h2 class="text-lg font-bold text-slate-900">Signature Actions</h2>
                  <p class="text-sm text-slate-500">Connect wallets, paste external approvals, or append a contract-aligned EVM signature to the shared draft.</p>
                </div>
                <div class="mb-4 flex flex-wrap gap-3">
                  <button class="rounded-xl border border-neo-200 bg-neo-50 px-4 py-2 text-sm font-semibold text-neo-700" @click="connectNeoWallet">{{ t('operations.connectNeoWallet', 'Connect Neo Wallet') }}</button>
                  <button class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700" @click="connectEvmWallet">{{ t('operations.connectEvmWallet', 'Connect EVM Wallet') }}</button>
                  <button class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" @click="copyShareUrl">{{ t('operations.copyShareLink', 'Copy Share Link') }}</button>
                  <button class="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!collaborationUrl" @click="copyCollaboratorUrl">{{ t('operations.copyCollaboratorLink', 'Copy Collaborator Link') }}</button>
                  <button class="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-semibold text-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!operatorUrl" @click="copyOperatorUrl">{{ t('operations.copyOperatorLink', 'Copy Operator Link') }}</button>
                  <button class="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hasOperatorAccess || isSubmissionPending" @click="rotateCollaboratorLink">{{ t('operations.rotateCollaboratorLink', 'Rotate Collaborator Link') }}</button>
                  <button class="rounded-xl border border-fuchsia-200 bg-white px-4 py-2 text-sm font-semibold text-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hasOperatorAccess || isSubmissionPending" @click="rotateOperatorLink">{{ t('operations.rotateOperatorLink', 'Rotate Operator Link') }}</button>
                </div>
                <div class="grid gap-4 md:grid-cols-3">
                  <label class="space-y-1 text-sm">
                    <span class="font-medium text-slate-700">Signer ID</span>
                    <input v-model="signerId" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
                  </label>
                  <label class="space-y-1 text-sm">
                    <span class="font-medium text-slate-700">Signer Kind</span>
                    <select v-model="signerKind" class="w-full rounded-xl border border-slate-300 px-3 py-2">
                      <option value="neo">Neo</option>
                      <option value="evm">EVM</option>
                    </select>
                  </label>
                  <label class="space-y-1 text-sm">
                    <span class="font-medium text-slate-700">Signature Hex</span>
                    <input v-model="signatureHex" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs" />
                  </label>
                </div>
                <div class="mt-4 flex flex-wrap gap-3">
                  <button class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hasSignatureAccess || isSubmissionPending" @click="appendManualSignature">{{ t('operations.appendManualSignature', 'Append Manual Signature') }}</button>
                  <button class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hasSignatureAccess || isSubmissionPending" @click="signWithEvmWallet">{{ t('operations.connectEvmWallet', 'Connect EVM Wallet') }}</button>
                </div>
                <p class="mt-4 text-xs leading-relaxed text-slate-500">Use manual entry for external multisig collection, or collect an EVM typed-data approval here and keep the relay-ready invocation attached to the draft.</p>
              </section>

              <section class="rounded-2xl border border-slate-200 bg-white p-5">
                <div class="mb-4">
                  <h2 class="text-lg font-bold text-slate-900">Broadcast & Relay</h2>
                  <p class="text-sm text-slate-500">Choose the final submission path after signatures are attached and relay readiness looks healthy.</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Client Broadcast</p>
                    <div class="mt-2 text-sm font-medium text-slate-800">{{ clientBroadcastReady ? 'Invocation Ready' : 'Invocation Missing' }}</div>
                    <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ walletConnection.isConnected.value ? 'Neo wallet connected and ready to sign.' : 'Connect a Neo wallet before broadcasting client-side.' }}</p>
                  </div>
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Relay Submission</p>
                    <div class="mt-2 text-sm font-medium text-slate-800">{{ relayReadiness.label }}</div>
                    <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ relayReadiness.detail }}</p>
                  </div>
                </div>
                <div class="mt-4 flex flex-wrap gap-3">
                  <button class="rounded-xl bg-neo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hasOperatorAccess || !clientBroadcastReady || !walletConnection.isConnected.value || isSubmissionPending" :title="getSubmissionButtonLabel('client-broadcast', pendingSubmissionAction)" @click="broadcastWithNeoWallet">{{ pendingSubmissionAction === 'client-broadcast' ? t('sharedDraft.broadcasting', 'Broadcasting…') : t('sharedDraft.broadcastWithNeoWallet', 'Broadcast with Neo Wallet') }}</button>
                  <button class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hasOperatorAccess || relayPayloadOptions.length === 0 || isSubmissionPending" :title="getSubmissionButtonLabel('relay-check', pendingSubmissionAction)" @click="checkRelay">{{ pendingSubmissionAction === 'relay-check' ? t('sharedDraft.checkingRelay', 'Checking Relay…') : t('sharedDraft.checkRelay', 'Check Relay') }}</button>
                  <button class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!hasOperatorAccess || !relayReadiness.isReady || isSubmissionPending" :title="getSubmissionButtonLabel('relay-submit', pendingSubmissionAction)" @click="submitViaRelay">{{ pendingSubmissionAction === 'relay-submit' ? t('sharedDraft.submitting', 'Submitting…') : t('sharedDraft.submitViaRelay', 'Submit via Relay') }}</button>
                  <select v-if="relayPayloadOptions.length > 1" v-model="relayPayloadMode" class="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                    <option value="best">Best Available</option>
                    <option value="raw">Signed Raw Tx</option>
                    <option value="meta">Meta Invocation</option>
                  </select>
                </div>
                <p class="mt-4 text-xs leading-relaxed text-slate-500">Selected relay payload: <span class="font-semibold text-slate-700">{{ selectedRelayPayloadLabel }}</span></p>
                <div v-if="activeSubmissionReceipt" class="mt-4 rounded-2xl border px-4 py-3 text-sm"
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
                <div v-if="latestBroadcastTxid" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Latest Submission</p>
                  <code class="mt-2 block break-all text-xs text-slate-700">{{ latestBroadcastTxid }}</code>
                  <a v-if="latestBroadcastExplorerUrl" :href="latestBroadcastExplorerUrl" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">View Latest in Explorer</a>
                </div>
              </section>
            </div>

            <RelayPreflightPanel
              id="relay-preflight-panel"
              :level="relayCheck.level"
              :status-label="relayCheck.label"
              :detail="relayCheck.detail"
              :payload-mode="relayCheck.payloadMode"
              :vm-state="relayCheck.vmState"
              :gas-consumed="relayCheck.gasConsumed"
              :operation="relayCheck.operation"
              :exception="relayCheck.exception"
            />

            <section class="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 class="text-lg font-bold text-slate-900 mb-3">{{ t('sharedDraft.recentActivityTitle', 'Recent Activity') }}</h2>
              <ActivityTimeline :items="activityEvents" :action-context="activityActionContext" preference-key="shared-draft" @activity-action="handleActivityAction" />
            </section>

            <section class="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 class="text-lg font-bold text-slate-900 mb-3">{{ t('sharedDraft.collectedSignaturesTitle', 'Collected Signatures') }}</h2>
              <div v-if="collectedSignatureCards.length === 0" class="text-sm text-slate-500">{{ t('sharedDraft.noSignaturesYet', 'No signatures have been attached yet.') }}</div>
              <div v-else class="grid gap-3 md:grid-cols-2">
                <div v-for="signature in collectedSignatureCards" :key="signature.key" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-800 break-all">{{ signature.label }}</div>
                      <div class="mt-1 text-xs text-slate-500">Added {{ signature.createdLabel }}</div>
                    </div>
                    <div class="flex flex-wrap justify-end gap-2">
                      <span v-for="badge in signature.badges" :key="badge" class="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{{ badge }}</span>
                    </div>
                  </div>
                  <code class="mt-3 block break-all rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{{ signature.signaturePreview }}</code>
                  <details class="mt-3">
                    <summary class="cursor-pointer text-xs font-semibold text-slate-600">{{ t('sharedDraft.viewFullSignature', 'View Full Signature') }}</summary>
                    <code class="mt-2 block break-all text-[11px] text-slate-500">{{ signature.signatureHex }}</code>
                  </details>
                </div>
              </div>
            </section>
          </div>
          <p v-if="statusMessage" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {{ statusMessage }}
          </p>
          <div class="mt-8">
            <RouterLink to="/" class="btn-secondary py-3 px-6 text-base inline-flex items-center justify-center gap-2">{{ t('sharedDraft.returnHome', 'Return Home') }}</RouterLink>
          </div>
        </template>
        <template v-else>
          <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-green-50 mb-6 shadow-inner border border-green-200">
            <svg class="h-10 w-10 text-green-500 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight mb-3">Transaction Submitted</h1>
          <p class="text-base text-slate-500 mb-10 max-w-lg mx-auto leading-relaxed">Your transaction has been securely broadcast to the Neo N3 network.</p>
          <div class="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 mb-10 inline-block mx-auto max-w-full shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Hash</p>
              <button @click="copyHash" class="text-xs font-semibold text-neo-600 hover:text-neo-800 transition-colors bg-neo-50 px-2 py-1 rounded">{{ copied ? 'Copied!' : 'Copy' }}</button>
            </div>
            <code class="block text-sm sm:text-base font-mono text-slate-800 break-all bg-white border border-slate-200 p-4 rounded-xl shadow-inner select-all">{{ txid }}</code>
          </div>
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <RouterLink to="/" class="btn-secondary py-3 px-6 text-base w-full sm:w-auto flex items-center justify-center gap-2">Return Home</RouterLink>
            <a :href="submittedTxExplorerUrl || '#'" target="_blank" rel="noopener noreferrer" class="btn-primary py-3 px-6 text-base w-full sm:w-auto flex items-center justify-center gap-2">View in Explorer</a>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@/i18n';
import { useRoute } from 'vue-router';
import { useWalletConnection } from '@/composables/useWalletConnection.js';
import { OPERATIONS_RUNTIME } from '@/config/operationsRuntime.js';
import { createDraftStore } from '@/features/operations/drafts.js';
import { buildRelayPayloadOptions, executeBroadcast, resolveRelayPayloadMode } from '@/features/operations/execution.js';
import { buildExecuteMetaTxByAddressInvocation, buildMetaTransactionTypedData, computeArgsHash, fetchNonceForAddress, recoverPublicKeyFromTypedDataSignature } from '@/features/operations/metaTx.js';
import { summarizeSignerProgress } from '@/features/operations/signatures.js';
import { createActivityEvent } from '@/features/operations/activity.js';
import { createOperationsPreferences } from '@/features/operations/preferences.js';
import { evaluateRelayReadiness } from '@/features/operations/relayReadiness.js';
import { runRelayPreflight, buildRelayPreflightRequest } from '@/features/operations/relayPreflight.js';
import { createDraftInteractionHandlers } from '@/features/operations/viewActions.js';
import { buildCollectedSignatureCards, buildOperationSnapshotItems, buildSignerChecklistItems } from '@/features/operations/sharedDraftView.js';
import { buildTransactionExplorerUrl, extractLatestTransactionId } from '@/features/operations/explorer.js';
import { buildSubmissionReceipt, getSubmissionButtonLabel, resolveLatestSubmissionReceipt } from '@/features/operations/submissionFeedback.js';
import { buildSubmissionReceiptHistoryItems, createSubmissionReceiptEntry } from '@/features/operations/submissionReceipts.js';
import RelayPreflightPanel from '@/features/operations/components/RelayPreflightPanel.vue';
import DraftStatusBanner from '@/features/operations/components/DraftStatusBanner.vue';
import DraftSummaryStrip from '@/features/operations/components/DraftSummaryStrip.vue';
import ActivityTimeline from '@/features/operations/components/ActivityTimeline.vue';
import { buildDraftCollaborationUrl, buildDraftShareUrl } from '@/features/operations/shareLinks.js';
import { getAbstractAccountHash, walletService } from '@/services/walletService.js';

const props = defineProps({
  txid: { type: String, default: '' },
  draftId: { type: String, default: '' },
});

const runtime = OPERATIONS_RUNTIME;
const { t } = useI18n();
const draftStore = createDraftStore();
const walletConnection = useWalletConnection();
const route = useRoute();
const preferences = createOperationsPreferences();

const copied = ref(false);
const draft = ref(null);
const loadError = ref('');
const loading = ref(false);
const statusMessage = ref('');
const signerId = ref('');
const signerKind = ref('neo');
const signatureHex = ref('');
const evmAddress = ref('');
const relayPayloadMode = ref(preferences.getRelayPayloadMode('shared-draft'));
const relayCheck = ref({ level: 'idle', label: 'Not Checked', detail: 'Run a relay preflight before submitting.', payloadMode: 'best', vmState: '', gasConsumed: '', operation: '', exception: '', stack: [] });
const relayCheckRequest = ref(null);
const pendingSubmissionAction = ref('');
const submissionReceipt = ref(null);

const signerProgress = computed(() => summarizeSignerProgress(
  draft.value?.signer_requirements || [],
  draft.value?.signatures || [],
));
const operationSnapshotItems = computed(() => buildOperationSnapshotItems({
  draft: draft.value || {},
  relayReadiness: relayReadiness.value,
}));
const signerChecklistItems = computed(() => buildSignerChecklistItems({
  signerRequirements: draft.value?.signer_requirements || [],
  signatures: draft.value?.signatures || [],
}));
const collectedSignatureCards = computed(() => buildCollectedSignatureCards(draft.value?.signatures || []));
const relayPayloadOptions = computed(() => buildRelayPayloadOptions({
  runtime,
  transactionBody: draft.value?.transaction_body || {},
  signatures: draft.value?.signatures || [],
}));
const selectedRelayPayloadMode = computed(() => resolveRelayPayloadMode({
  relayPayloadMode: relayPayloadMode.value,
  availableModes: relayPayloadOptions.value,
}));
const relayReadiness = computed(() => evaluateRelayReadiness({
  runtime,
  transactionBody: draft.value?.transaction_body || {},
  signatures: draft.value?.signatures || [],
}));
const clientBroadcastReady = computed(() => Boolean(draft.value?.transaction_body?.clientInvocation));
const isSubmissionPending = computed(() => Boolean(pendingSubmissionAction.value));
const selectedRelayPayloadLabel = computed(() => ({
  none: 'Unavailable',
  raw: 'Signed Raw Tx',
  meta: 'Meta Invocation',
  best: 'Best Available',
}[selectedRelayPayloadMode.value] || selectedRelayPayloadMode.value || 'Unavailable'));
const activityEvents = computed(() => (draft.value && draft.value.metadata && draft.value.metadata.activity) || []);
const persistedSubmissionReceiptEntries = computed(() => (draft.value?.metadata?.submissionReceipts) || []);
const latestBroadcastTxid = computed(() => extractLatestTransactionId(activityEvents.value));
const latestBroadcastExplorerUrl = computed(() => buildTransactionExplorerUrl(runtime.explorerBaseUrl, latestBroadcastTxid.value));
const submittedTxExplorerUrl = computed(() => buildTransactionExplorerUrl(runtime.explorerBaseUrl, props.txid));
const submissionReceiptHistoryItems = computed(() => buildSubmissionReceiptHistoryItems(persistedSubmissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl, limit: 4 }));
const activeSubmissionReceipt = computed(() => submissionReceipt.value || resolveLatestSubmissionReceipt(persistedSubmissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl }));
const collaborationAccess = computed(() => String(route.query.access || '').trim());
const hasCollaboratorAccess = computed(() => Boolean(draft.value?.can_write && draft.value?.collaboration_slug));
watch(relayPayloadMode, (value) => {
  preferences.setRelayPayloadMode('shared-draft', value);
});

const collaborationUrl = computed(() => {
  if (!draft.value?.share_slug || !hasCollaboratorAccess.value) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const accessSlug = draft.value?.collaboration_slug || collaborationAccess.value;
  return origin ? buildDraftCollaborationUrl(origin, draft.value.share_slug, accessSlug) : draft.value.collaboration_path || '';
});
const activityActionContext = computed(() => ({
  shareUrl: shareUrl.value,
  collaboratorUrl: collaborationUrl.value,
  relayTargetId: 'relay-preflight-panel',
  explorerBaseUrl: runtime.explorerBaseUrl,
}));

const shareUrl = computed(() => {
  if (!draft.value?.share_slug) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin ? buildDraftShareUrl(origin, draft.value.share_slug) : draft.value.share_path || '';
});
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

function copyHash() {
  if (!props.txid) return;
  navigator.clipboard.writeText(props.txid).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  });
}

async function loadDraft() {
  if (!props.draftId) return;
  loading.value = true;
  try {
    draft.value = await draftStore.loadDraft(props.draftId, { accessSlug: String(route.query.access || '') });
    signerId.value = draft.value?.account?.accountAddressScriptHash || '';
    if (draft.value?.metadata?.relayPreflight) {
      relayCheck.value = { ...relayCheck.value, ...draft.value.metadata.relayPreflight };
    }
  } catch (error) {
    loadError.value = error?.message || String(error);
  } finally {
    loading.value = false;
  }
}

async function connectNeoWallet() {
  try {
    await walletConnection.connect();
    signerId.value = walletService.address;
    statusMessage.value = `Neo wallet connected: ${walletService.address}`;
  } catch {
    statusMessage.value = 'Neo wallet connection failed.';
  }
}

async function connectEvmWallet() {
  try {
    const { address } = await walletConnection.connectEvm();
    evmAddress.value = address.toLowerCase();
    signerId.value = evmAddress.value;
    signerKind.value = 'evm';
    statusMessage.value = `EVM wallet connected: ${evmAddress.value}`;
  } catch {
    statusMessage.value = 'EVM wallet connection failed.';
  }
}

async function persistSubmissionReceipt(entry) {
  if (!draft.value?.share_slug) return;
  try {
    draft.value = await draftStore.appendSubmissionReceipt(draft.value.share_slug, entry, operatorMutationOptions());
  } catch (_) {}
}

async function appendActivity(event) {
  if (!draft.value?.share_slug) return;
  try {
    draft.value = await draftStore.appendActivity(draft.value.share_slug, event, accessMutationOptions());
  } catch (_) {}
}

async function refreshDraftStatus(status) {
  if (!runtime.collaborationEnabled || !draft.value?.share_slug) return;
  draft.value = await draftStore.updateStatus(draft.value.share_slug, status, operatorMutationOptions());
}

async function appendManualSignature() {
  if (!draft.value?.share_slug) return;
  try {
    assertSignatureAccess();
    draft.value = await draftStore.appendSignature(draft.value.share_slug, {
      signerId: signerId.value.trim() || walletService.address || evmAddress.value || 'pending-signer',
      kind: signerKind.value,
      signatureHex: signatureHex.value,
      createdAt: new Date().toISOString(),
    }, accessMutationOptions());
    signatureHex.value = '';
    await appendActivity(createActivityEvent({ type: 'signature_added', actor: signerKind.value, detail: 'Signature appended' }));
    statusMessage.value = 'Signature appended to the shared draft.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function signWithEvmWallet() {
  if (!draft.value) return;
  try {
    if (!evmAddress.value) {
      const { address } = await walletConnection.connectEvm();
      evmAddress.value = address.toLowerCase();
    }

    const verifyingContract = getAbstractAccountHash();
    const rpcUrl = walletService.rpcUrl;
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const argsHashHex = await computeArgsHash({
      rpcUrl,
      aaContractHash: verifyingContract,
      args: draft.value.operation_body?.args || [],
    });
    const nonce = await fetchNonceForAddress({
      rpcUrl,
      aaContractHash: verifyingContract,
      accountAddressScriptHash: draft.value.account?.accountAddressScriptHash,
      evmSignerAddress: evmAddress.value,
    });
    const typedData = buildMetaTransactionTypedData({
      chainId: 894710606,
      verifyingContract,
      accountIdHex: draft.value.account?.accountIdHex,
      targetContract: draft.value.operation_body?.targetContract,
      method: draft.value.operation_body?.method,
      argsHashHex,
      nonce,
      deadline,
    });
    const signature = await walletService.signTypedDataWithEvm(typedData);
    const publicKey = recoverPublicKeyFromTypedDataSignature({ typedData, signature });
    const metaInvocation = buildExecuteMetaTxByAddressInvocation({
      aaContractHash: verifyingContract,
      accountAddressScriptHash: draft.value.account?.accountAddressScriptHash,
      evmPublicKeyHex: publicKey,
      targetContract: draft.value.operation_body?.targetContract,
      method: draft.value.operation_body?.method,
      methodArgs: draft.value.operation_body?.args || [],
      argsHashHex,
      nonce,
      deadline,
      signatureHex: signature,
    });
    assertSignatureAccess();
    draft.value = await draftStore.appendSignature(draft.value.share_slug, {
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
    }, accessMutationOptions());
    signerKind.value = 'evm';
    signerId.value = evmAddress.value;
    await appendActivity(createActivityEvent({ type: 'signature_added', actor: 'evm', detail: 'Contract-aligned meta signature collected' }));
    statusMessage.value = 'Contract-aligned EVM meta signature collected and attached to the shared draft.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function persistRelayCheckMetadata(snapshot) {
  if (!draft.value?.share_slug) return;
  try {
    draft.value = await draftStore.setRelayPreflight(draft.value.share_slug, { relayPreflight: snapshot }, operatorMutationOptions());
  } catch (_) {}
}

async function checkRelay() {
  setSubmissionPending('relay-check');
  try {
    relayCheckRequest.value = buildRelayPreflightRequest({
      relayEndpoint: runtime.relayEndpoint,
      relayPayloadMode: relayPayloadMode.value,
      relayRawEnabled: runtime.relayRawEnabled,
      transactionBody: draft.value?.transaction_body || {},
      signatures: draft.value?.signatures || [],
    });
    relayCheck.value = await runRelayPreflight({
      walletService,
      relayEndpoint: runtime.relayEndpoint,
      relayPayloadMode: relayPayloadMode.value,
      relayRawEnabled: runtime.relayRawEnabled,
      transactionBody: draft.value?.transaction_body || {},
      signatures: draft.value?.signatures || [],
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

async function broadcastWithNeoWallet() {
  if (!draft.value?.transaction_body) return;
  setSubmissionPending('client-broadcast');
  try {
    const result = await executeBroadcast({
      mode: 'client',
      signerAddress: walletService.address,
      transactionBody: draft.value.transaction_body,
      relayPayloadMode: relayPayloadMode.value,
      signatures: draft.value.signatures || [],
      walletService,
      relayEndpoint: runtime.relayEndpoint,
    });
    await refreshDraftStatus('broadcasted');
    await appendActivity(createActivityEvent({ type: 'broadcast_client', actor: 'neo', detail: result?.txid || 'Client broadcast submitted' }));
    statusMessage.value = `Client-side Neo broadcast submitted${result?.txid ? `: ${result.txid}` : '.'}`;
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', {
      phase: 'success',
      detail: 'Client-side Neo broadcast submitted.',
      txid: result?.txid || result?.result?.hash || '',
    }));
  } catch (error) {
    statusMessage.value = error?.message || String(error);
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', { phase: 'error', detail: statusMessage.value }));
  }
}

async function submitViaRelay() {
  if (!draft.value?.transaction_body) return;
  setSubmissionPending('relay-submit');
  try {
    const result = await executeBroadcast({
      mode: 'relay',
      relayRawEnabled: runtime.relayRawEnabled,
      transactionBody: draft.value.transaction_body,
      walletService,
      relayEndpoint: runtime.relayEndpoint,
    });
    await refreshDraftStatus('relayed');
    await appendActivity(createActivityEvent({ type: 'broadcast_relay', actor: 'relay', detail: result?.txid || 'Relay submission completed' }));
    statusMessage.value = `Relay submission completed${result?.txid ? `: ${result.txid}` : '.'}`;
    await persistSubmissionReceipt(setSubmissionResult('relay-submit', {
      phase: 'success',
      detail: 'Relay submission completed.',
      txid: result?.txid || result?.result?.hash || '',
    }));
  } catch (error) {
    statusMessage.value = error?.message || String(error);
    await persistSubmissionReceipt(setSubmissionResult('relay-submit', { phase: 'error', detail: statusMessage.value }));
  }
}

function accessMutationOptions() {
  return { accessSlug: draft.value?.operator_slug || draft.value?.collaboration_slug || collaborationAccess.value || '' };
}

function operatorMutationOptions() {
  return { accessSlug: draft.value?.operator_slug || collaborationAccess.value || '' };
}

function assertSignatureAccess() {
  if (hasSignatureAccess.value) return;
  throw new Error('This shared draft is read-only. Open the Collaborator Link to add signatures.');
}

function assertOperatorAccess() {
  if (hasOperatorAccess.value) return;
  throw new Error('Operator access is required to manage relay, broadcast, or link rotation for this shared draft.');
}

async function copyShareUrl() {
  if (!shareUrl.value) return;
  await navigator.clipboard.writeText(shareUrl.value);
  statusMessage.value = 'Share link copied to clipboard.';
}

async function copyCollaboratorUrl() {
  if (!collaborationUrl.value) return;
  await navigator.clipboard.writeText(collaborationUrl.value);
  statusMessage.value = 'Collaborator link copied to clipboard.';
}

async function copyOperatorUrl() {
  if (!operatorUrl.value) return;
  await navigator.clipboard.writeText(operatorUrl.value);
  statusMessage.value = 'Operator link copied to clipboard.';
}

async function rotateCollaboratorLink() {
  if (!draft.value?.share_slug) return;
  try {
    assertOperatorAccess();
    draft.value = await draftStore.rotateCollaboratorLink(draft.value.share_slug, operatorMutationOptions());
    await appendActivity(createActivityEvent({ type: 'collaborator_link_rotated', actor: 'operator', detail: 'Collaborator link rotated' }));
    statusMessage.value = 'Collaborator link rotated. The previous signer link no longer works.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

async function rotateOperatorLink() {
  if (!draft.value?.share_slug) return;
  try {
    assertOperatorAccess();
    draft.value = await draftStore.rotateOperatorLink(draft.value.share_slug, operatorMutationOptions());
    await appendActivity(createActivityEvent({ type: 'operator_link_rotated', actor: 'operator', detail: 'Operator link rotated' }));
    statusMessage.value = 'Operator link rotated. The previous operator link no longer works.';
  } catch (error) {
    statusMessage.value = error?.message || String(error);
  }
}

onMounted(loadDraft);
</script>
