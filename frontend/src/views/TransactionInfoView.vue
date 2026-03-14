<template>
  <div class="relative min-h-screen bg-slate-900 overflow-hidden font-sans text-biconomy-text">
    <div class="absolute inset-0 z-0 pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-vibrant-glow rounded-full mix-blend-screen opacity-30 animate-pulse-slow"></div>
    </div>
    <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
      <div class="dark-panel-override glass-panel p-6 sm:p-10 rounded-2xl relative">
        <template v-if="draftId">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight mb-2">{{ t('sharedDraft.title', 'Shared Transaction Draft') }}</h1>
          <p class="text-sm text-slate-500 mb-8 max-w-2xl">{{ t('sharedDraft.subtitle', 'Load an immutable transaction draft, review collected approvals, append a new signature, and choose the final client-side or relay broadcast path.') }}</p>
          <DraftSummaryStrip class="mb-8" :title="t('sharedDraft.sharedDraftOverview', 'Shared Draft Overview')" :draft="draft" :action-context="activityActionContext" @summary-action="handleSummaryAction" />

          <DraftStatusBanner
            class="mb-8"
            :status="draft?.status || 'draft'"
            :activity="activityEvents"
          />

          <section class="mb-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5 shadow-[0_0_25px_rgba(16,185,129,0.12)] backdrop-blur-md">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-emerald-300">{{ t('sharedDraft.paymasterValidationLabel', 'Live-Validated Paymaster Path') }}</p>
                <h2 class="mt-2 text-lg font-bold text-slate-900">{{ t('sharedDraft.paymasterValidationTitle', 'AA + Morpheus paymaster is verified on Neo N3 testnet') }}</h2>
                <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
                  {{ t('sharedDraft.paymasterValidationBody', 'This shared-draft flow uses the same validated path for paymaster authorization and relay-backed executeUserOp submission. The live testnet run already covered account registration, verifier update, allowlist update, paymaster approval, relay submission, and on-chain HALT.') }}
                </p>
                <code class="mt-3 block break-all rounded-xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-xs font-medium text-emerald-300 shadow-inner">
                  {{ t('sharedDraft.paymasterValidationTx', 'Latest full-path relay tx: 0x057d4a581efbe815fad0148a3766284da2a33335e72fb50e54d476078d8f40d4') }}
                </code>
              </div>
              <div class="flex shrink-0 flex-wrap items-center gap-3">
                <router-link
                  class="inline-flex items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-500/60 hover:bg-emerald-400/15"
                  :to="{ path: '/docs', query: { doc: 'paymasterValidation' } }"
                >
                  {{ t('sharedDraft.paymasterValidationLink', 'Open Validation Ledger') }}
                </router-link>
                <a
                  v-if="latestPaymasterValidationExplorerUrl"
                  class="inline-flex items-center rounded-xl border border-slate-300/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  :href="latestPaymasterValidationExplorerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ t('sharedDraft.paymasterValidationExplorer', 'Open Explorer Tx') }}
                </a>
              </div>
            </div>
          </section>

          <div class="grid gap-4 mb-8 lg:grid-cols-4">
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Draft ID</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ draftId }}</code>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Share URL</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ shareUrl || 'Loading…' }}</code>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{{ t('sharedDraft.collaboratorLinkLabel', 'Collaborator Link') }}</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ collaborationUrl || 'Read-only access' }}</code>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{{ t('sharedDraft.operatorLinkLabel', 'Operator Link') }}</p>
              <code class="block text-sm font-mono text-slate-800 break-all">{{ operatorUrl || 'Operator access required' }}</code>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
              <div class="text-sm font-medium text-slate-800">{{ draft?.status || 'loading' }}</div>
            </div>
          </div>
          <div v-if="draft && accessScope === 'read'" class="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-medium">
            {{ t('sharedDraft.readOnlyNotice', 'This shared draft is read-only. Open the Collaborator Link to sign, or the Operator Link to manage relay and broadcast actions.') }}
          </div>
          <div v-else-if="draft && accessScope === 'sign'" class="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 font-medium">
            {{ t('sharedDraft.signatureOnlyNotice', 'This is a signature-only link. Relay checks, broadcasts, and link rotation require the Operator Link.') }}
          </div>
          <div v-if="loading" class="text-sm text-slate-500 font-medium">Loading shared draft…</div>
          <div v-else-if="loadError" class="text-sm text-rose-600 font-medium">{{ loadError }}</div>
          <div v-else-if="draft" class="space-y-6">
            <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-4">
                  <h2 class="text-base font-bold text-slate-900">Operation Snapshot</h2>
                  <p class="text-sm text-slate-500">Key execution details, relay state, and payload availability for this immutable draft.</p>
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <div v-for="item in operationSnapshotItems" :key="item.label" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">{{ item.label }}</p>
                    <div class="mt-1 text-sm font-medium text-slate-800 break-all">{{ item.value }}</div>
                    <p v-if="item.note" class="mt-1 text-xs text-slate-500">{{ item.note }}</p>
                  </div>
                </div>
              </section>
              <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-4">
                  <h2 class="text-base font-bold text-slate-900">Signer Checklist</h2>
                  <p class="text-sm text-slate-500">{{ signerProgress.signatureCount }}/{{ signerProgress.requiredCount }} required approvals collected{{ signerProgress.pending.length ? ` · ${signerProgress.pending.length} still pending` : signerProgress.requiredCount ? ' · all required signers satisfied' : ' · no required signer roster recorded' }}.</p>
                </div>
                <div v-if="signerChecklistItems.length === 0" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No signer checklist has been recorded for this draft yet.</div>
                <div v-else class="space-y-3">
                  <div v-for="item in signerChecklistItems" :key="item.key" class="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-800 break-all">{{ item.label }}</div>
                      <div class="mt-1 text-xs text-slate-500">{{ item.detail }}</div>
                      <code v-if="item.signaturePreview" class="mt-2 block text-xs text-slate-500">{{ item.signaturePreview }}</code>
                    </div>
                    <span :class="item.status === 'Collected' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'" class="shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">{{ item.status }}</span>
                  </div>
                </div>
              </section>
            </div>

            <div class="grid gap-6 lg:grid-cols-2">
              <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-4">
                  <h2 class="text-base font-bold text-slate-900">Signature Actions</h2>
                  <p class="text-sm text-slate-500">Connect wallets, paste external approvals, or append a contract-aligned EVM signature to the shared draft.</p>
                </div>
                <div class="mb-4 flex flex-wrap gap-2">
                  <button class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="connectNeoWallet">{{ t('operations.connectNeoWallet', 'Connect Neo Wallet') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="connectEvmWallet">{{ t('operations.connectEvmWallet', 'Connect EVM Wallet') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="copyShareUrl">{{ t('operations.copyShareLink', 'Copy Share Link') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="!collaborationUrl" @click="copyCollaboratorUrl">{{ t('operations.copyCollaboratorLink', 'Copy Collaborator Link') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="!operatorUrl" @click="copyOperatorUrl">{{ t('operations.copyOperatorLink', 'Copy Operator Link') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="!hasOperatorAccess || isSubmissionPending" @click="rotateCollaboratorLink">{{ t('operations.rotateCollaboratorLink', 'Rotate Collaborator Link') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="!hasOperatorAccess || isSubmissionPending" @click="rotateOperatorLink">{{ t('operations.rotateOperatorLink', 'Rotate Operator Link') }}</button>
                </div>
                <div class="grid gap-4 md:grid-cols-3">
                  <label class="space-y-1 text-sm">
                    <span class="font-medium text-slate-700">Signer ID</span>
                    <input v-model="signerId" class="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
                  </label>
                  <label class="space-y-1 text-sm">
                    <span class="font-medium text-slate-700">Signer Kind</span>
                    <select v-model="signerKind" class="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm">
                      <option value="neo">Neo</option>
                      <option value="evm">EVM</option>
                    </select>
                  </label>
                  <label class="space-y-1 text-sm">
                    <span class="font-medium text-slate-700">Signature Hex</span>
                    <input v-model="signatureHex" class="w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs" />
                  </label>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50" :disabled="!hasSignatureAccess || isSubmissionPending" @click="appendManualSignature">{{ t('operations.appendManualSignature', 'Append Manual Signature') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="!hasSignatureAccess || isSubmissionPending" @click="signWithEvmWallet">{{ t('operations.connectEvmWallet', 'Connect EVM Wallet') }}</button>
                </div>
                <p class="mt-4 text-xs text-slate-500">Use manual entry for external multisig collection, or collect an EVM typed-data approval here and keep the relay-ready invocation attached to the draft.</p>
              </section>

              <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-4">
                  <h2 class="text-base font-bold text-slate-900">Broadcast & Relay</h2>
                  <p class="text-sm text-slate-500">Choose the final submission path after signatures are attached and relay readiness looks healthy.</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Client Broadcast</p>
                    <div class="mt-1 text-sm font-medium text-slate-800">{{ clientBroadcastReady ? 'Invocation Ready' : 'Invocation Missing' }}</div>
                    <p class="mt-1 text-xs text-slate-500">{{ walletConnection.isConnected.value ? 'Neo wallet connected and ready to sign.' : 'Connect a Neo wallet before broadcasting client-side.' }}</p>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Relay Submission</p>
                    <div class="mt-1 text-sm font-medium text-slate-800">{{ relayReadiness.label }}</div>
                    <p class="mt-1 text-xs text-slate-500">{{ relayReadiness.detail }}</p>
                  </div>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50" :disabled="!hasOperatorAccess || !clientBroadcastReady || !walletConnection.isConnected.value || isSubmissionPending" :title="getSubmissionButtonLabel('client-broadcast', pendingSubmissionAction)" @click="broadcastWithNeoWallet">{{ pendingSubmissionAction === 'client-broadcast' ? t('sharedDraft.broadcasting', 'Broadcasting…') : t('sharedDraft.broadcastWithNeoWallet', 'Broadcast with Neo Wallet') }}</button>
                  <button class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="!hasOperatorAccess || relayPayloadOptions.length === 0 || isSubmissionPending" :title="getSubmissionButtonLabel('relay-check', pendingSubmissionAction)" @click="checkRelay">{{ pendingSubmissionAction === 'relay-check' ? t('sharedDraft.checkingRelay', 'Checking Relay…') : t('sharedDraft.checkRelay', 'Check Relay') }}</button>
                  <button class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50" :disabled="!hasOperatorAccess || !relayReadiness.isReady || isSubmissionPending" :title="getSubmissionButtonLabel('relay-submit', pendingSubmissionAction)" @click="submitViaRelay">{{ pendingSubmissionAction === 'relay-submit' ? t('sharedDraft.submitting', 'Submitting…') : t('sharedDraft.submitViaRelay', 'Submit via Relay') }}</button>
                  <select v-if="relayPayloadOptions.length > 1" v-model="relayPayloadMode" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
                    <option value="best">Best Available</option>
                    <option value="raw">Signed Raw Tx</option>
                    <option value="meta">Relay Invocation</option>
                  </select>
                </div>
                <p class="mt-4 text-xs text-slate-500">Selected relay payload: <span class="font-semibold text-slate-700">{{ selectedRelayPayloadLabel }}</span></p>
                <div v-if="activeSubmissionReceipt" class="mt-4 rounded-lg border px-4 py-3 text-sm"
                  :class="activeSubmissionReceipt.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : activeSubmissionReceipt.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'">
                  <p class="text-xs font-semibold uppercase tracking-wider">Submission Receipt</p>
                  <div class="mt-1 text-sm font-medium">{{ activeSubmissionReceipt.title }}</div>
                  <p class="mt-1 text-sm">{{ activeSubmissionReceipt.detail }}</p>
                  <code v-if="activeSubmissionReceipt.txid" class="mt-2 block break-all rounded-md border border-white/70 bg-white/70 px-3 py-1.5 text-xs">{{ activeSubmissionReceipt.txid }}</code>
                  <a v-if="activeSubmissionReceipt.explorerUrl" :href="activeSubmissionReceipt.explorerUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex font-medium text-xs underline">Open in Explorer</a>
                  <div v-if="submissionReceiptHistoryItems.length > 0" class="mt-4 border-t border-current/10 pt-3">
                    <p class="text-xs font-semibold uppercase tracking-wider">Receipt History</p>
                    <div class="mt-2 space-y-2">
                      <div v-for="item in submissionReceiptHistoryItems" :key="`${item.createdAt}:${item.action}`" class="rounded-md border border-white/60 bg-white/60 px-3 py-2">
                        <div class="flex items-center justify-between gap-3">
                          <div class="text-xs font-medium">{{ item.title }}</div>
                          <div class="text-xs opacity-70">{{ item.createdLabel }}</div>
                        </div>
                        <div class="mt-1 text-xs">{{ item.detail }}</div>
                        <a v-if="item.explorerUrl" :href="item.explorerUrl" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex text-xs font-medium underline">Open in Explorer</a>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="latestBroadcastTxid" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest Submission</p>
                  <code class="mt-1 block break-all text-xs text-slate-700">{{ latestBroadcastTxid }}</code>
                  <a v-if="latestBroadcastExplorerUrl" :href="latestBroadcastExplorerUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">View Latest in Explorer</a>
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

            <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-base font-bold text-slate-900 mb-3">{{ t('sharedDraft.recentActivityTitle', 'Recent Activity') }}</h2>
              <ActivityTimeline :items="activityEvents" :action-context="activityActionContext" preference-key="shared-draft" @activity-action="handleActivityAction" />
            </section>

            <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-base font-bold text-slate-900 mb-3">{{ t('sharedDraft.collectedSignaturesTitle', 'Collected Signatures') }}</h2>
              <div v-if="collectedSignatureCards.length === 0" class="text-sm text-slate-500">{{ t('sharedDraft.noSignaturesYet', 'No signatures have been attached yet.') }}</div>
              <div v-else class="grid gap-3 md:grid-cols-2">
                <div v-for="signature in collectedSignatureCards" :key="signature.key" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-slate-800 break-all">{{ signature.label }}</div>
                      <div class="mt-1 text-xs text-slate-500">Added {{ signature.createdLabel }}</div>
                    </div>
                    <div class="flex flex-wrap justify-end gap-1">
                      <span v-for="badge in signature.badges" :key="badge" class="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">{{ badge }}</span>
                    </div>
                  </div>
                  <code class="mt-3 block break-all rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">{{ signature.signaturePreview }}</code>
                  <details class="mt-3">
                    <summary class="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">{{ t('sharedDraft.viewFullSignature', 'View Full Signature') }}</summary>
                    <code class="mt-2 block break-all text-xs text-slate-500 bg-white border border-slate-200 p-2 rounded-md">{{ signature.signatureHex }}</code>
                  </details>
                </div>
              </div>
            </section>
          </div>
          <p v-if="statusMessage" class="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 font-medium">
            {{ statusMessage }}
          </p>
          <div class="mt-8">
            <RouterLink to="/" class="btn-secondary">{{ t('sharedDraft.returnHome', 'Return Home') }}</RouterLink>
          </div>
        </template>
        <template v-else>
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6 border border-emerald-200">
            <svg class="h-8 w-8 text-emerald-600 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight mb-2 text-center">Transaction Submitted</h1>
          <p class="text-sm text-slate-500 mb-8 max-w-lg mx-auto text-center">Your transaction has been securely broadcast to the Neo N3 network.</p>
          <div class="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-8 inline-block w-full max-w-full">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction Hash</p>
              <button @click="copyHash" class="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded">{{ copied ? 'Copied!' : 'Copy' }}</button>
            </div>
            <code class="block text-sm font-mono text-slate-800 break-all bg-white border border-slate-200 p-3 rounded-md select-all">{{ txid }}</code>
          </div>
          <div class="flex flex-col sm:flex-row justify-center gap-3">
            <RouterLink to="/" class="btn-secondary w-full sm:w-auto">Return Home</RouterLink>
            <a :href="submittedTxExplorerUrl || '#'" target="_blank" rel="noopener noreferrer" class="btn-primary w-full sm:w-auto">View in Explorer</a>
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
import { buildExecuteUnifiedByAddressInvocation, buildExecuteUserOpInvocation, buildMetaTransactionTypedData, buildV3UserOperationTypedData, computeArgsHash, fetchNonceForAddress, fetchV3Nonce, fetchV3Verifier, recoverPublicKeyFromTypedDataSignature, toCompactEcdsaSignature } from '@/features/operations/metaTx.js';
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
  meta: 'Relay Invocation',
  best: 'Best Available',
}[selectedRelayPayloadMode.value] || selectedRelayPayloadMode.value || 'Unavailable'));
const activityEvents = computed(() => (draft.value && draft.value.metadata && draft.value.metadata.activity) || []);
const persistedSubmissionReceiptEntries = computed(() => (draft.value?.metadata?.submissionReceipts) || []);
const latestBroadcastTxid = computed(() => extractLatestTransactionId(activityEvents.value));
const latestBroadcastExplorerUrl = computed(() => buildTransactionExplorerUrl(runtime.explorerBaseUrl, latestBroadcastTxid.value));
const submittedTxExplorerUrl = computed(() => buildTransactionExplorerUrl(runtime.explorerBaseUrl, props.txid));
const latestPaymasterValidationTxid = '0x057d4a581efbe815fad0148a3766284da2a33335e72fb50e54d476078d8f40d4';
const latestPaymasterValidationExplorerUrl = computed(() => buildTransactionExplorerUrl(runtime.explorerBaseUrl, latestPaymasterValidationTxid));
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

    const aaContractHash = getAbstractAccountHash();
    const rpcUrl = walletService.rpcUrl;
    const deadline = Date.now() + (60 * 60 * 1000);
    const argsHashHex = await computeArgsHash({
      rpcUrl,
      aaContractHash,
      args: draft.value.operation_body?.args || [],
    });
    let verifierHash = '';
    let nonce;
    let typedData;

    if (draft.value.account?.accountIdHash) {
      verifierHash = await fetchV3Verifier({
        rpcUrl,
        aaContractHash,
        accountIdHash: draft.value.account.accountIdHash,
      });
      if (!verifierHash) {
        throw new Error('No verifier plugin is configured for this V3 account.');
      }
      nonce = await fetchV3Nonce({
        rpcUrl,
        aaContractHash,
        accountIdHash: draft.value.account.accountIdHash,
        channel: 0n,
      });
      typedData = buildV3UserOperationTypedData({
        chainId: 894710606,
        verifyingContract: verifierHash,
        accountIdHash: draft.value.account.accountIdHash,
        targetContract: draft.value.operation_body?.targetContract,
        method: draft.value.operation_body?.method,
        argsHashHex,
        nonce,
        deadline,
      });
    } else {
      nonce = await fetchNonceForAddress({
        rpcUrl,
        aaContractHash,
        accountAddressScriptHash: draft.value.account?.accountAddressScriptHash,
        evmSignerAddress: evmAddress.value,
      });
      typedData = buildMetaTransactionTypedData({
        chainId: 894710606,
        verifyingContract: aaContractHash,
        targetContract: draft.value.operation_body?.targetContract,
        method: draft.value.operation_body?.method,
        argsHashHex,
        nonce,
        deadline,
      });
    }

    const signature = await walletService.signTypedDataWithEvm(typedData);
    const contractSignature = draft.value.account?.accountIdHash ? toCompactEcdsaSignature(signature) : signature;
    const publicKey = recoverPublicKeyFromTypedDataSignature({ typedData, signature });
    const metaInvocation = draft.value.account?.accountIdHash
      ? buildExecuteUserOpInvocation({
          aaContractHash,
          accountIdHash: draft.value.account.accountIdHash,
          targetContract: draft.value.operation_body?.targetContract,
          method: draft.value.operation_body?.method,
          methodArgs: draft.value.operation_body?.args || [],
          nonce,
          deadline,
          signatureHex: contractSignature,
        })
      : buildExecuteUnifiedByAddressInvocation({
          aaContractHash,
          accountAddressScriptHash: draft.value.account?.accountAddressScriptHash,
          evmPublicKeyHex: publicKey,
          targetContract: draft.value.operation_body?.targetContract,
          method: draft.value.operation_body?.method,
          methodArgs: draft.value.operation_body?.args || [],
          argsHashHex,
          nonce,
          deadline,
          signatureHex: contractSignature,
        });
    assertSignatureAccess();
    draft.value = await draftStore.appendSignature(draft.value.share_slug, {
      signerId: evmAddress.value,
      kind: 'evm',
      signatureHex: contractSignature,
      publicKey,
      payloadDigest: argsHashHex,
      metadata: {
        typedData,
        verifierHash,
        argsHashHex,
        nonce: String(nonce),
        deadline: String(deadline),
        metaInvocation,
        signatureFullHex: signature,
      },
      createdAt: new Date().toISOString(),
    }, accessMutationOptions());
    signerKind.value = 'evm';
    signerId.value = evmAddress.value;
    await appendActivity(createActivityEvent({ type: 'signature_added', actor: 'evm', detail: draft.value.account?.accountIdHash ? 'UserOperation signature collected' : 'Legacy relay signature collected' }));
    statusMessage.value = draft.value.account?.accountIdHash
      ? 'Contract-aligned EVM UserOperation signature collected and attached to the shared draft.'
      : 'Contract-aligned legacy relay signature collected and attached to the shared draft.';
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
