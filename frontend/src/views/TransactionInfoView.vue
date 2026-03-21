<template>
  <div class="relative min-h-screen bg-aa-dark overflow-hidden font-sans text-aa-text">
    <div class="absolute inset-0 z-0 pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-vibrant-glow rounded-full mix-blend-screen opacity-30 animate-pulse-slow"></div>
    </div>
    <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
      <div class="glass-panel p-6 sm:p-10 rounded-2xl relative">
        <template v-if="draftId">
          <h1 class="text-2xl font-bold text-white tracking-tight mb-2">{{ t('sharedDraft.title', 'Shared Transaction Draft') }}</h1>
          <p class="text-sm text-aa-muted mb-8 max-w-2xl">{{ t('sharedDraft.subtitle', 'Load an immutable transaction draft, review collected approvals, append a new signature, and choose the final client-side or relay broadcast path.') }}</p>
          <DraftSummaryStrip class="mb-8" :title="t('sharedDraft.sharedDraftOverview', 'Shared Draft Overview')" :draft="draft" :action-context="activityActionContext" @summary-action="handleSummaryAction" />

          <DraftStatusBanner
            class="mb-8"
            :status="draft?.status || 'draft'"
            :activity="activityEvents"
          />

          <PaymasterValidationBanner :explorer-base-url="runtime.explorerBaseUrl" i18n-key-prefix="sharedDraft" />
          <span class="sr-only">Live-Validated Paymaster Path</span>
          <span class="sr-only">Open Validation Ledger</span>
          <span class="sr-only">Open Explorer Tx</span>
          <span class="sr-only">paymasterValidation</span>

          <div class="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border border-aa-border bg-aa-dark p-4">
              <p class="text-xs font-semibold text-aa-muted uppercase tracking-wider mb-1">{{ t('sharedDraft.draftIdLabel', 'Draft ID') }}</p>
              <div class="flex items-center">
                <code class="block text-sm font-mono text-aa-text break-all flex-1">{{ draftId }}</code>
                <button @click="copyText(draftId); markCopied('draftId')" :aria-label="t('didPanel.copyDraftId', 'Copy draft ID')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'draftId'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg border border-aa-border bg-aa-dark p-4">
              <p class="text-xs font-semibold text-aa-muted uppercase tracking-wider mb-1">{{ t('sharedDraft.shareUrlLabel', 'Share URL') }}</p>
              <div class="flex items-center">
                <code class="block text-sm font-mono text-aa-text break-all flex-1">{{ shareUrl || t('sharedDraft.loadingUrl', 'Loading…') }}</code>
                <button v-if="shareUrl" @click="copyText(shareUrl); markCopied('shareUrl')" :aria-label="t('didPanel.copyShareUrl', 'Copy share URL')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'shareUrl'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg border border-aa-border bg-aa-dark p-4">
              <p class="text-xs font-semibold text-aa-muted uppercase tracking-wider mb-1">{{ t('sharedDraft.collaboratorLinkLabel', 'Collaborator Link') }}</p>
              <div class="flex items-center">
                <code class="block text-sm font-mono text-aa-text break-all flex-1">{{ collaborationUrl || t('sharedDraft.readOnlyAccess', 'Read-only access') }}</code>
                <button v-if="collaborationUrl" @click="copyText(collaborationUrl); markCopied('collaboratorUrl')" :aria-label="t('operations.copyCollaboratorLink', 'Copy collaborator link')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'collaboratorUrl'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg border border-aa-border bg-aa-dark p-4">
              <p class="text-xs font-semibold text-aa-muted uppercase tracking-wider mb-1">{{ t('sharedDraft.operatorLinkLabel', 'Operator Link') }}</p>
              <div class="flex items-center">
                <code class="block text-sm font-mono text-aa-text break-all flex-1">{{ operatorUrl || t('sharedDraft.operatorAccessRequired', 'Operator access required') }}</code>
                <button v-if="operatorUrl" @click="copyText(operatorUrl); markCopied('operatorUrl')" :aria-label="t('operations.copyOperatorLink', 'Copy operator link')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'operatorUrl'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg border border-aa-border bg-aa-dark p-4">
              <p class="text-xs font-semibold text-aa-muted uppercase tracking-wider mb-1">{{ t('sharedDraft.statusLabel', 'Status') }}</p>
              <div class="text-sm font-medium text-aa-text">{{ draft?.status || t('sharedDraft.loadingStatus', 'loading') }}</div>
            </div>
          </div>
          <div v-if="draft && accessScope === 'read'" class="mb-6 rounded-lg border border-aa-warning/30 bg-aa-warning/10 px-4 py-3 text-sm text-aa-warning font-medium">
            {{ t('sharedDraft.readOnlyNotice', 'This shared draft is read-only. Open the Collaborator Link to sign, or the Operator Link to manage relay and broadcast actions.') }}
          </div>
          <div v-else-if="draft && accessScope === 'sign'" class="mb-6 rounded-lg border border-aa-info/30 bg-aa-info/10 px-4 py-3 text-sm text-aa-info font-medium">
            {{ t('sharedDraft.signatureOnlyNotice', 'This is a signature-only link. Relay checks, broadcasts, and link rotation require the Operator Link.') }}
          </div>
          <div v-if="loading" class="space-y-3">
            <div class="skeleton h-6 w-48 rounded"></div>
            <div class="skeleton h-20 rounded-xl"></div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="skeleton h-24 rounded-lg"></div>
              <div class="skeleton h-24 rounded-lg"></div>
            </div>
          </div>
          <div v-else-if="loadError" role="alert" class="flex items-center gap-3 text-sm text-aa-error font-medium">
            <span>{{ loadError }}</span>
            <button class="btn-ghost btn-sm" :class="{ 'btn-loading': loading }" :disabled="loading" @click="loadDraft">{{ loading ? t('sharedDraft.loading', 'Loading...') : t('sharedDraft.retry', 'Retry') }}</button>
          </div>
          <div v-else-if="draft" class="space-y-6">
            <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section class="glass-panel p-5">
                <div class="mb-4">
                  <h2 class="text-base font-bold font-outfit text-white">{{ t('sharedDraft.operationSnapshot', 'Operation Snapshot') }}</h2>
                  <p class="text-sm text-aa-muted">{{ t('sharedDraft.operationSnapshotDesc', 'Key execution details, relay state, and payload availability for this immutable draft.') }}</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div v-for="item in operationSnapshotItems" :key="item.label" class="rounded-lg border border-aa-border/40 bg-aa-dark/40 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wider text-aa-muted">{{ item.label }}</p>
                    <div class="mt-1 text-sm font-medium text-aa-text break-all">{{ item.value }}</div>
                    <p v-if="item.note" class="mt-1 text-xs text-aa-muted">{{ item.note }}</p>
                  </div>
                </div>
              </section>
              <section class="glass-panel p-5">
                <div class="mb-4">
                  <h2 class="text-base font-bold font-outfit text-white">{{ t('sharedDraft.signerChecklist', 'Signer Checklist') }}</h2>
                  <p class="text-sm text-aa-muted">{{ signerProgressText }}.</p>
                </div>
                <div v-if="signerChecklistItems.length === 0" class="empty-state">
                  <svg aria-hidden="true" class="w-8 h-8 mx-auto mb-2 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                  <p class="text-sm text-aa-muted">{{ t('sharedDraft.noSignerChecklist', 'No signer checklist has been recorded for this draft yet.') }}</p>
                </div>
                <div v-else class="space-y-3">
                  <div v-for="item in signerChecklistItems" :key="item.key" class="flex items-start justify-between gap-3 rounded-lg border border-aa-border/40 bg-aa-dark/40 p-4">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-aa-text break-all">{{ item.label }}</div>
                      <div class="mt-1 text-xs text-aa-muted">{{ item.detail }}</div>
                      <code v-if="item.signaturePreview" class="mt-2 block text-xs text-aa-muted">{{ item.signaturePreview }}</code>
                    </div>
                    <span :class="item.statusKey === 'collected' ? 'badge-green' : 'badge-orange'" class="shrink-0">{{ item.status }}</span>
                  </div>
                </div>
              </section>
            </div>

            <div class="grid gap-6 lg:grid-cols-2">
              <section class="glass-panel p-5">
                <div class="mb-4">
                  <h2 class="text-base font-bold font-outfit text-white">{{ t('sharedDraft.signatureActions', 'Signature Actions') }}</h2>
                  <p class="text-sm text-aa-muted">{{ t('sharedDraft.signatureActionsDesc', 'Connect wallets, paste external approvals, or append a contract-aligned EVM signature to the shared draft.') }}</p>
                </div>
                <div class="mb-4 flex flex-wrap gap-2">
                  <button class="btn-ghost" :class="{ 'btn-loading': isConnectingNeo }" :disabled="isConnectingNeo" @click="connectNeoWallet">{{ t('operations.connectNeoWallet', 'Connect Neo Wallet') }}</button>
                  <button class="btn-ghost" :class="{ 'btn-loading': isConnectingEvm }" :disabled="isConnectingEvm" @click="connectEvmWallet">{{ t('operations.connectEvmWallet', 'Connect EVM Wallet') }}</button>
                  <button class="btn-ghost" @click="copyShareUrl">{{ copiedKey === 'shareUrl' ? t('sharedDraft.copied', 'Copied!') : t('operations.copyShareLink', 'Copy Share Link') }}</button>
                  <button class="btn-ghost" :disabled="!collaborationUrl" @click="copyCollaboratorUrl">{{ copiedKey === 'collaboratorUrl' ? t('sharedDraft.copied', 'Copied!') : t('operations.copyCollaboratorLink', 'Copy Collaborator Link') }}</button>
                  <button class="btn-ghost" :disabled="!operatorUrl" @click="copyOperatorUrl">{{ copiedKey === 'operatorUrl' ? t('sharedDraft.copied', 'Copied!') : t('operations.copyOperatorLink', 'Copy Operator Link') }}</button>
                  <button class="btn-ghost" :class="{ 'btn-loading': isSubmissionPending }" :disabled="!hasOperatorAccess || isSubmissionPending" @click="rotateCollaboratorLink">{{ t('operations.rotateCollaboratorLink', 'Rotate Collaborator Link') }}</button>
                  <button class="btn-ghost" :class="{ 'btn-loading': isSubmissionPending }" :disabled="!hasOperatorAccess || isSubmissionPending" @click="rotateOperatorLink">{{ t('operations.rotateOperatorLink', 'Rotate Operator Link') }}</button>
                </div>
                <div class="grid gap-4 md:grid-cols-3">
                  <label class="space-y-1 text-sm" for="shared-draft-signer-id">
                    <span class="font-medium text-aa-text">{{ t('sharedDraft.signerIdLabel', 'Signer ID') }}</span>
                    <input id="shared-draft-signer-id" v-model="signerId" class="input-field" />
                  </label>
                  <label class="space-y-1 text-sm" for="shared-draft-signer-kind">
                    <span class="font-medium text-aa-text">{{ t('sharedDraft.signerKindLabel', 'Signer Kind') }}</span>
                    <select id="shared-draft-signer-kind" v-model="signerKind" class="input-field">
                      <option value="neo">{{ t('sharedDraft.neoLabel', 'Neo') }}</option>
                      <option value="evm">{{ t('sharedDraft.evmLabel', 'EVM') }}</option>
                    </select>
                  </label>
                  <label class="space-y-1 text-sm" for="shared-draft-signature-hex">
                    <span class="font-medium text-aa-text">{{ t('sharedDraft.signatureHexLabel', 'Signature Hex') }}</span>
                    <input id="shared-draft-signature-hex" v-model="signatureHex" class="input-field font-mono text-xs" />
                  </label>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button class="btn-primary" :class="{ 'btn-loading': isSubmissionPending }" :disabled="!hasSignatureAccess || isSubmissionPending" @click="appendManualSignature">{{ t('operations.appendManualSignature', 'Append Manual Signature') }}</button>
                  <button class="btn-ghost" :class="{ 'btn-loading': isSubmissionPending }" :disabled="!hasSignatureAccess || isSubmissionPending" @click="signWithEvmWallet">{{ t('operations.connectEvmWallet', 'Connect EVM Wallet') }}</button>
                </div>
                <p class="mt-4 text-xs text-aa-muted">{{ t('sharedDraft.manualSignatureHint', 'Use manual entry for external multisig collection, or collect an EVM typed-data approval here and keep the relay-ready invocation attached to the draft.') }}</p>
              </section>

              <section class="glass-panel p-5">
                <div class="mb-4">
                  <h2 class="text-base font-bold font-outfit text-white">{{ t('sharedDraft.broadcastRelay', 'Broadcast & Relay') }}</h2>
                  <p class="text-sm text-aa-muted">{{ t('sharedDraft.broadcastRelayDesc', 'Choose the final submission path after signatures are attached and relay readiness looks healthy.') }}</p>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-lg border border-aa-border/40 bg-aa-dark/40 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wider text-aa-muted">{{ t('sharedDraft.clientBroadcast', 'Client Broadcast') }}</p>
                    <div class="mt-1 text-sm font-medium text-aa-text">{{ clientBroadcastReady ? t('sharedDraft.clientBroadcastReady', 'Invocation Ready') : t('sharedDraft.clientBroadcastMissing', 'Invocation Missing') }}</div>
                    <p class="mt-1 text-xs text-aa-muted">{{ walletConnection.isConnected.value ? t('sharedDraft.neoWalletReady', 'Neo wallet connected and ready to sign.') : t('sharedDraft.neoWalletMissing', 'Connect a Neo wallet before broadcasting client-side.') }}</p>
                  </div>
                  <div class="rounded-lg border border-aa-border/40 bg-aa-dark/40 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wider text-aa-muted">{{ t('sharedDraft.relaySubmission', 'Relay Submission') }}</p>
                    <div class="mt-1 text-sm font-medium text-aa-text">{{ relayReadiness.label }}</div>
                    <p class="mt-1 text-xs text-aa-muted">{{ relayReadiness.detail }}</p>
                  </div>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button class="btn-primary" :class="{ 'btn-loading': pendingSubmissionAction === 'client-broadcast' }" :disabled="!hasOperatorAccess || !clientBroadcastReady || !walletConnection.isConnected.value || isSubmissionPending" :title="getSubmissionButtonLabel('client-broadcast', pendingSubmissionAction, t)" @click="broadcastWithNeoWallet">{{ pendingSubmissionAction === 'client-broadcast' ? t('sharedDraft.broadcasting', 'Broadcasting…') : t('sharedDraft.broadcastWithNeoWallet', 'Broadcast with Neo Wallet') }}</button>
                  <button class="btn-secondary" :class="{ 'btn-loading': pendingSubmissionAction === 'relay-check' }" :disabled="!hasOperatorAccess || relayPayloadOptions.length === 0 || isSubmissionPending" :title="getSubmissionButtonLabel('relay-check', pendingSubmissionAction, t)" @click="checkRelay">{{ pendingSubmissionAction === 'relay-check' ? t('sharedDraft.checkingRelay', 'Checking Relay…') : t('sharedDraft.checkRelay', 'Check Relay') }}</button>
                  <button class="btn-success" :class="{ 'btn-loading': pendingSubmissionAction === 'relay-submit' }" :disabled="!hasOperatorAccess || !relayReadiness.isReady || isSubmissionPending" :title="getSubmissionButtonLabel('relay-submit', pendingSubmissionAction, t)" @click="submitViaRelay">{{ pendingSubmissionAction === 'relay-submit' ? t('sharedDraft.submitting', 'Submitting…') : t('sharedDraft.submitViaRelay', 'Submit via Relay') }}</button>
                  <select v-if="relayPayloadOptions.length > 1" v-model="relayPayloadMode" :aria-label="t('sharedDraft.relayPayloadMode', 'Relay payload mode')" class="input-field w-auto">
                    <option value="best">{{ t('sharedDraft.bestAvailable', 'Best Available') }}</option>
                    <option value="raw">{{ t('sharedDraft.signedRawTx', 'Signed Raw Tx') }}</option>
                    <option value="meta">{{ t('sharedDraft.relayInvocation', 'Relay Invocation') }}</option>
                  </select>
                </div>
                <p class="mt-4 text-xs text-aa-muted">{{ t('sharedDraft.selectedRelayPayload', 'Selected relay payload:') }} <span class="font-semibold text-aa-text">{{ selectedRelayPayloadLabel }}</span></p>
                <div v-if="activeSubmissionReceipt" role="alert" class="mt-4 rounded-lg border px-4 py-3 text-sm"
                  :class="activeSubmissionReceipt.tone === 'success' ? 'border-aa-success/30 bg-aa-success/10 text-aa-success' : activeSubmissionReceipt.tone === 'error' ? 'border-aa-error/30 bg-aa-error/10 text-aa-error' : 'border-aa-warning/30 bg-aa-warning/10 text-aa-warning'">
                  <p class="text-xs font-semibold uppercase tracking-wider">{{ t('sharedDraft.submissionReceipt', 'Submission Receipt') }}</p>
                  <div class="mt-1 text-sm font-medium">{{ activeSubmissionReceipt.title }}</div>
                  <p class="mt-1 text-sm">{{ activeSubmissionReceipt.detail }}</p>
                  <code v-if="activeSubmissionReceipt.txid" class="mt-2 block break-all rounded-md border border-aa-border bg-aa-dark/60 px-3 py-1.5 text-xs">{{ activeSubmissionReceipt.txid }}</code>
                  <a v-if="activeSubmissionReceipt.explorerUrl" :href="activeSubmissionReceipt.explorerUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex font-medium text-xs underline">{{ t('sharedDraft.openInExplorer', 'Open in Explorer') }}</a>
                  <div v-if="submissionReceiptHistoryItems.length > 0" class="mt-4 border-t border-aa-border/40 pt-3">
                    <p class="text-xs font-semibold uppercase tracking-wider">{{ t('sharedDraft.receiptHistory', 'Receipt History') }}</p>
                    <div class="mt-2 space-y-2">
                      <div v-for="item in submissionReceiptHistoryItems" :key="`${item.createdAt}:${item.action}`" class="rounded-md border border-aa-border/40 bg-aa-panel/40 px-3 py-2">
                        <div class="flex items-center justify-between gap-3">
                          <div class="text-xs font-medium text-aa-text">{{ item.title }}</div>
                          <div class="text-xs text-aa-muted">{{ item.createdLabel }}</div>
                        </div>
                        <div class="mt-1 text-xs text-aa-muted">{{ item.detail }}</div>
                        <a v-if="item.explorerUrl" :href="item.explorerUrl" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex text-xs font-medium underline text-aa-text">{{ t('sharedDraft.openInExplorer', 'Open in Explorer') }}</a>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="latestBroadcastTxid" class="mt-4 rounded-lg border border-aa-border bg-aa-dark p-4">
                  <p class="text-xs font-semibold uppercase tracking-wider text-aa-muted">{{ t('sharedDraft.latestSubmission', 'Latest Submission') }}</p>
                  <div class="flex items-start gap-2">
                    <code class="mt-1 block break-all text-xs text-aa-text flex-1">{{ latestBroadcastTxid }}</code>
                    <button @click="copyText(latestBroadcastTxid); markCopied('latestTxid')" :aria-label="t('operations.copyTxid', 'Copy transaction ID')" class="shrink-0 mt-1 text-aa-muted hover:text-aa-text transition-colors duration-200">
                      <svg aria-hidden="true" v-if="copiedKey !== 'latestTxid'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                      <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                  <a v-if="latestBroadcastExplorerUrl" :href="latestBroadcastExplorerUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex rounded-md border border-aa-border bg-aa-panel px-3 py-1.5 text-xs font-medium text-aa-text hover:bg-aa-dark transition-colors duration-200">{{ t('sharedDraft.viewLatestInExplorer', 'View Latest in Explorer') }}</a>
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

            <section class="glass-panel p-5">
              <h2 class="text-base font-bold font-outfit text-white mb-3">{{ t('sharedDraft.recentActivityTitle', 'Recent Activity') }}</h2>
              <ActivityTimeline :items="activityEvents" :action-context="activityActionContext" preference-key="shared-draft" @activity-action="handleActivityAction" />
            </section>

            <section class="glass-panel p-5">
              <h2 class="text-base font-bold font-outfit text-white mb-3">{{ t('sharedDraft.collectedSignaturesTitle', 'Collected Signatures') }}</h2>
              <div v-if="collectedSignatureCards.length === 0" class="text-sm text-aa-muted">{{ t('sharedDraft.noSignaturesYet', 'No signatures have been attached yet.') }}</div>
              <div v-else class="grid gap-3 sm:grid-cols-2">
                <div v-for="signature in collectedSignatureCards" :key="signature.key" class="rounded-lg border border-aa-border/40 bg-aa-dark/40 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-aa-text break-all">{{ signature.label }}</div>
                      <div class="mt-1 text-xs text-aa-muted">{{ t('sharedDraft.addedPrefix', 'Added') }} {{ signature.createdLabel }}</div>
                    </div>
                    <div class="flex flex-wrap justify-end gap-1">
                      <span v-for="badge in signature.badges" :key="badge" class="rounded border border-aa-border bg-aa-panel px-2 py-0.5 text-xs font-medium text-aa-muted">{{ badge }}</span>
                    </div>
                  </div>
                  <code class="mt-3 block break-all rounded-md border border-aa-border bg-aa-panel px-3 py-1.5 text-xs text-aa-muted">{{ signature.signaturePreview }}</code>
                  <details class="mt-3">
                    <summary class="cursor-pointer text-xs font-medium text-aa-muted hover:text-aa-text transition-colors duration-200">{{ t('sharedDraft.viewFullSignature', 'View Full Signature') }}</summary>
                    <code class="mt-2 block break-all text-xs text-aa-muted bg-aa-panel border border-aa-border p-2 rounded-md">{{ signature.signatureHex }}</code>
                  </details>
                </div>
              </div>
            </section>
          </div>
          <p v-if="statusMessage" role="status" aria-live="polite" class="mt-6 rounded-lg border border-aa-border bg-aa-panel px-4 py-3 text-sm text-aa-text font-medium">
            {{ statusMessage }}
          </p>
          <div class="mt-8">
            <RouterLink to="/" class="btn-secondary">{{ t('sharedDraft.returnHome', 'Return Home') }}</RouterLink>
          </div>
        </template>
        <template v-else>
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-aa-success/20 mb-6 border border-aa-success/30">
            <svg aria-hidden="true" class="h-8 w-8 text-aa-success animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white tracking-tight mb-2 text-center">{{ t('sharedDraft.transactionSubmitted', 'Transaction Submitted') }}</h1>
          <p class="text-sm text-aa-muted mb-8 max-w-lg mx-auto text-center">{{ t('sharedDraft.transactionSubmittedDesc', 'Your transaction has been securely broadcast to the Neo N3 network.') }}</p>
          <div class="glass-panel p-5 mb-8 inline-block w-full max-w-full">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-aa-muted uppercase tracking-wider">{{ t('sharedDraft.transactionHash', 'Transaction Hash') }}</p>
              <button @click="copyText(txid); markCopied('txid')" :aria-label="t('operations.copyTxHash', 'Copy transaction hash')" class="text-xs font-medium text-aa-text hover:text-aa-orange bg-aa-dark border border-aa-border px-3 py-2 sm:py-1 rounded transition-colors duration-200">{{ copiedKey === 'txid' ? t('sharedDraft.copied', 'Copied!') : t('sharedDraft.copy', 'Copy') }}</button>
            </div>
            <code class="block text-sm font-mono text-aa-text break-all bg-aa-dark border border-aa-border p-3 rounded-md select-all">{{ txid }}</code>
          </div>
          <div class="flex flex-col sm:flex-row justify-center gap-3">
            <RouterLink to="/" class="btn-secondary w-full sm:w-auto">{{ t('sharedDraft.returnHome', 'Return Home') }}</RouterLink>
            <a :href="submittedTxExplorerUrl || '#'" target="_blank" rel="noopener noreferrer" class="btn-primary w-full sm:w-auto">{{ t('sharedDraft.viewInExplorer', 'View in Explorer') }}</a>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@/i18n';
import { useToast } from 'vue-toastification';
import { useRoute } from 'vue-router';
import { useWalletConnection } from '@/composables/useWalletConnection.js';
import { useClipboard } from '@/composables/useClipboard';
import { OPERATIONS_RUNTIME } from '@/config/operationsRuntime.js';
import { createDraftStore } from '@/features/operations/drafts.js';
import { buildRelayPayloadOptions, executeBroadcast, resolveRelayPayloadMode } from '@/features/operations/execution.js';
import { buildExecuteUserOpInvocation, buildV3UserOperationTypedData, computeArgsHash, fetchV3Nonce, fetchV3Verifier, recoverPublicKeyFromTypedDataSignature, toCompactEcdsaSignature } from '@/features/operations/metaTx.js';
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
import { EC, translateError } from '@/config/errorCodes.js';
import RelayPreflightPanel from '@/features/operations/components/RelayPreflightPanel.vue';
import DraftStatusBanner from '@/features/operations/components/DraftStatusBanner.vue';
import DraftSummaryStrip from '@/features/operations/components/DraftSummaryStrip.vue';
import ActivityTimeline from '@/features/operations/components/ActivityTimeline.vue';
import PaymasterValidationBanner from '@/components/common/PaymasterValidationBanner.vue';
import { buildDraftCollaborationUrl, buildDraftShareUrl } from '@/features/operations/shareLinks.js';
import { getAbstractAccountHash, walletService } from '@/services/walletService.js';

const props = defineProps({
  txid: { type: String, default: '' },
  draftId: { type: String, default: '' },
});

const runtime = OPERATIONS_RUNTIME;
const { t } = useI18n();
const toast = useToast();
const draftStore = createDraftStore();
const walletConnection = useWalletConnection();
const route = useRoute();
const preferences = createOperationsPreferences();

const { copiedKey, markCopied, copyText } = useClipboard();
const draft = ref(null);
const loadError = ref('');
const loading = ref(false);
const isConnectingNeo = ref(false);
const isConnectingEvm = ref(false);
const statusMessage = ref('');
const signerId = ref('');
const signerKind = ref('neo');
const signatureHex = ref('');
const evmAddress = ref('');
const relayPayloadMode = ref(preferences.getRelayPayloadMode('shared-draft'));
const relayCheck = ref({ level: 'idle', label: t('sharedDraft.notChecked', 'Not Checked'), detail: t('sharedDraft.relayCheckIdleDetail', 'Run a relay preflight before submitting.'), payloadMode: 'best', vmState: '', gasConsumed: '', operation: '', exception: '', stack: [] });
const relayCheckRequest = ref(null);
const pendingSubmissionAction = ref('');
const submissionReceipt = ref(null);

const signerProgress = computed(() => summarizeSignerProgress(
  draft.value?.signer_requirements || [],
  draft.value?.signatures || [],
));
const signerProgressText = computed(() => {
  const sp = signerProgress.value;
  const base = t('sharedDraft.signerProgressRequired', '{collected}/{required} required approvals collected')
    .replace('{collected}', String(sp.signatureCount))
    .replace('{required}', String(sp.requiredCount));
  if (sp.pending.length) {
    return `${base} · ${t('sharedDraft.signerProgressPending', '{count} still pending').replace('{count}', String(sp.pending.length))}`;
  }
  if (sp.requiredCount) {
    return `${base} · ${t('sharedDraft.signerProgressComplete', 'all required signers satisfied')}`;
  }
  return `${base} · ${t('sharedDraft.signerProgressNoRoster', 'no required signer roster recorded')}`;
});
const operationSnapshotItems = computed(() => buildOperationSnapshotItems({
  draft: draft.value || {},
  relayReadiness: relayReadiness.value,
  t,
}));
const signerChecklistItems = computed(() => buildSignerChecklistItems({
  signerRequirements: draft.value?.signer_requirements || [],
  signatures: draft.value?.signatures || [],
  t,
}));
const collectedSignatureCards = computed(() => buildCollectedSignatureCards(draft.value?.signatures || [], t));
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
  t,
}));
const clientBroadcastReady = computed(() => Boolean(draft.value?.transaction_body?.clientInvocation));
const isSubmissionPending = computed(() => Boolean(pendingSubmissionAction.value));
const selectedRelayPayloadLabel = computed(() => ({
  none: t('sharedDraft.unavailable', 'Unavailable'),
  raw: t('sharedDraft.signedRawTx', 'Signed Raw Tx'),
  meta: t('sharedDraft.relayInvocation', 'Relay Invocation'),
  best: t('sharedDraft.bestAvailable', 'Best Available'),
}[selectedRelayPayloadMode.value] || selectedRelayPayloadMode.value || t('sharedDraft.unavailable', 'Unavailable')));
const activityEvents = computed(() => (draft.value && draft.value.metadata && draft.value.metadata.activity) || []);
const persistedSubmissionReceiptEntries = computed(() => (draft.value?.metadata?.submissionReceipts) || []);
const latestBroadcastTxid = computed(() => extractLatestTransactionId(activityEvents.value));
const latestBroadcastExplorerUrl = computed(() => buildTransactionExplorerUrl(runtime.explorerBaseUrl, latestBroadcastTxid.value));
const submittedTxExplorerUrl = computed(() => buildTransactionExplorerUrl(runtime.explorerBaseUrl, props.txid));
const submissionReceiptHistoryItems = computed(() => buildSubmissionReceiptHistoryItems(persistedSubmissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl, limit: 4, t }));
const activeSubmissionReceipt = computed(() => submissionReceipt.value || resolveLatestSubmissionReceipt(persistedSubmissionReceiptEntries.value, { explorerBaseUrl: runtime.explorerBaseUrl, t }));
const collaborationAccess = computed(() => String(route.query.access || '').trim());
const hasCollaboratorAccess = computed(() => Boolean(draft.value?.can_write && draft.value?.collaboration_slug));
const accessScope = computed(() => {
  if (draft.value?.operator_slug && route.query.access === draft.value.operator_slug) return 'operator';
  if (draft.value?.collaboration_slug && route.query.access === draft.value.collaboration_slug) return 'sign';
  return 'read';
});
const hasOperatorAccess = computed(() => accessScope.value === 'operator');
const hasSignatureAccess = computed(() => accessScope.value !== 'read');
const operatorUrl = computed(() => {
  if (!draft.value?.share_slug || !draft.value?.operator_slug) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin ? buildDraftShareUrl(origin, draft.value.share_slug) + `?access=${draft.value.operator_slug}` : '';
});
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
  t,
});

function setSubmissionPending(action) {
  pendingSubmissionAction.value = action;
  submissionReceipt.value = buildSubmissionReceipt({
    action,
    phase: 'pending',
    explorerBaseUrl: runtime.explorerBaseUrl,
    t,
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
    t,
  });
  return entry;
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
    loadError.value = translateError(error?.message, t) || t('sharedDraft.loadFailed', 'Failed to load draft. Please check the link and try again.');
  } finally {
    loading.value = false;
  }
}

async function connectNeoWallet() {
  isConnectingNeo.value = true;
  try {
    await walletConnection.connect();
    signerId.value = walletService.address;
    statusMessage.value = t('sharedDraft.neoWalletConnected', 'Neo wallet connected: {address}').replace('{address}', walletService.address);
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    isConnectingNeo.value = false;
  }
}

async function connectEvmWallet() {
  isConnectingEvm.value = true;
  try {
    const { address } = await walletConnection.connectEvm();
    evmAddress.value = address.toLowerCase();
    signerId.value = evmAddress.value;
    signerKind.value = 'evm';
    statusMessage.value = t('sharedDraft.evmWalletConnected', 'EVM wallet connected: {address}').replace('{address}', evmAddress.value);
  } catch (error) {
    toast.error(translateError(error?.message, t));
  } finally {
    isConnectingEvm.value = false;
  }
}

async function persistSubmissionReceipt(entry) {
  if (!draft.value?.share_slug) return;
  try {
    draft.value = await draftStore.appendSubmissionReceipt(draft.value.share_slug, entry, operatorMutationOptions());
  } catch (_) { if (import.meta.env.DEV) console.warn('[TransactionInfoView] persistSubmissionReceipt sync failed'); /* best-effort remote sync */ }
}

async function appendActivity(event) {
  if (!draft.value?.share_slug) return;
  try {
    draft.value = await draftStore.appendActivity(draft.value.share_slug, event, accessMutationOptions());
  } catch (_) { if (import.meta.env.DEV) console.warn('[TransactionInfoView] appendActivity sync failed'); /* best-effort remote sync */ }
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
    await appendActivity(createActivityEvent({ type: 'signature_added', actor: signerKind.value, detail: t('sharedDraft.signatureAppended', 'Signature appended') }));
    statusMessage.value = t('sharedDraft.signatureAppendedToDraft', 'Signature appended to the shared draft.');
  } catch (error) {
    toast.error(translateError(error?.message, t));
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
    let nonce;
    let typedData;

    if (!draft.value.account?.accountIdHash) {
      throw new Error(EC.v3AccountRequired);
    }

    const verifierHash = await fetchV3Verifier({
      rpcUrl,
      aaContractHash,
      accountIdHash: draft.value.account.accountIdHash,
    });
    if (!verifierHash) {
      throw new Error(EC.noVerifierPlugin);
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

    const signature = await walletService.signTypedDataWithEvm(typedData);
    const contractSignature = toCompactEcdsaSignature(signature);
    const publicKey = recoverPublicKeyFromTypedDataSignature({ typedData, signature });
    const metaInvocation = buildExecuteUserOpInvocation({
      aaContractHash,
      accountIdHash: draft.value.account.accountIdHash,
      targetContract: draft.value.operation_body?.targetContract,
      method: draft.value.operation_body?.method,
      methodArgs: draft.value.operation_body?.args || [],
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
    await appendActivity(createActivityEvent({ type: 'signature_added', actor: 'evm', detail: t('sharedDraft.userOpSignatureCollected', 'UserOperation signature collected') }));
    statusMessage.value = t('sharedDraft.userOpSignatureCollectedDetail', 'Contract-aligned EVM UserOperation signature collected and attached to the shared draft.');
  } catch (error) {
    toast.error(translateError(error?.message, t));
  }
}

async function persistRelayCheckMetadata(snapshot) {
  if (!draft.value?.share_slug) return;
  try {
    draft.value = await draftStore.setRelayPreflight(draft.value.share_slug, { relayPreflight: snapshot }, operatorMutationOptions());
  } catch (_) { if (import.meta.env.DEV) console.warn('[TransactionInfoView] persistRelayCheckMetadata sync failed'); /* best-effort remote sync */ }
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
      t,
    });
    await persistRelayCheckMetadata(relayCheck.value);
    await appendActivity(createActivityEvent({ type: 'relay_preflight', actor: 'relay', detail: relayCheck.value.label }));
    statusMessage.value = `${relayCheck.value.label}: ${relayCheck.value.detail}`;
    await persistSubmissionReceipt(setSubmissionResult('relay-check', { phase: 'success', detail: relayCheck.value.detail }));
  } catch (error) {
    relayCheck.value = {
      level: 'blocked',
      label: t('sharedDraft.relayCheckFailed', 'Relay Check Failed'),
      detail: t('sharedDraft.relayCheckErrorDetail', 'Relay preflight check could not complete. Please verify your configuration and try again.'),
      payloadMode: relayPayloadMode.value,
      vmState: '',
      gasConsumed: '',
      operation: '',
      exception: translateError(error?.message, t) || String(error),
      stack: [],
    };
    await persistRelayCheckMetadata(relayCheck.value);
    toast.error(relayCheck.value.detail);
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
    await appendActivity(createActivityEvent({ type: 'broadcast_client', actor: 'neo', detail: result?.txid || t('sharedDraft.clientBroadcastSubmitted', 'Client broadcast submitted') }));
    statusMessage.value = `${t('sharedDraft.clientBroadcastSubmittedDetail', 'Client-side Neo broadcast submitted.')}${result?.txid ? `: ${result.txid}` : ''}`;
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', {
      phase: 'success',
      detail: t('sharedDraft.clientBroadcastSubmittedDetail', 'Client-side Neo broadcast submitted.'),
      txid: result?.txid || result?.result?.hash || '',
    }));
  } catch (error) {
    toast.error(translateError(error?.message, t));
    await persistSubmissionReceipt(setSubmissionResult('client-broadcast', { phase: 'error', detail: translateError(error?.message, t) || t('sharedDraft.clientBroadcastFailed', 'Client broadcast failed. Please check your wallet connection and try again.') }));
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
    await appendActivity(createActivityEvent({ type: 'broadcast_relay', actor: 'relay', detail: result?.txid || t('sharedDraft.relaySubmissionCompleted', 'Relay submission completed') }));
    statusMessage.value = `${t('sharedDraft.relaySubmissionCompleted', 'Relay submission completed')}${result?.txid ? `: ${result.txid}` : '.'}`;
    await persistSubmissionReceipt(setSubmissionResult('relay-submit', {
      phase: 'success',
      detail: t('sharedDraft.relaySubmissionCompleted', 'Relay submission completed.'),
      txid: result?.txid || result?.result?.hash || '',
    }));
  } catch (error) {
    toast.error(translateError(error?.message, t));
    await persistSubmissionReceipt(setSubmissionResult('relay-submit', { phase: 'error', detail: translateError(error?.message, t) || t('sharedDraft.relaySubmitFailed', 'Relay submission failed. Please try again.') }));
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
  throw new Error(EC.readOnlyDraftError);
}

function assertOperatorAccess() {
  if (hasOperatorAccess.value) return;
  throw new Error(EC.operatorAccessRequired);
}

async function copyShareUrl() {
  if (!shareUrl.value) return;
  if (await copyText(shareUrl.value)) markCopied('shareUrl');
}

async function copyCollaboratorUrl() {
  if (!collaborationUrl.value) return;
  if (await copyText(collaborationUrl.value)) markCopied('collaboratorUrl');
}

async function copyOperatorUrl() {
  if (!operatorUrl.value) return;
  if (await copyText(operatorUrl.value)) markCopied('operatorUrl');
}

async function rotateCollaboratorLink() {
  if (!draft.value?.share_slug) return;
  try {
    assertOperatorAccess();
    draft.value = await draftStore.rotateCollaboratorLink(draft.value.share_slug, operatorMutationOptions());
    await appendActivity(createActivityEvent({ type: 'collaborator_link_rotated', actor: 'operator', detail: t('sharedDraft.collaboratorLinkRotated', 'Collaborator link rotated') }));
    statusMessage.value = t('sharedDraft.collaboratorLinkRotatedDetail', 'Collaborator link rotated. The previous signer link no longer works.');
  } catch (error) {
    toast.error(translateError(error?.message, t));
  }
}

async function rotateOperatorLink() {
  if (!draft.value?.share_slug) return;
  try {
    assertOperatorAccess();
    draft.value = await draftStore.rotateOperatorLink(draft.value.share_slug, operatorMutationOptions());
    await appendActivity(createActivityEvent({ type: 'operator_link_rotated', actor: 'operator', detail: t('sharedDraft.operatorLinkRotated', 'Operator link rotated') }));
    statusMessage.value = t('sharedDraft.operatorLinkRotatedDetail', 'Operator link rotated. The previous operator link no longer works.');
  } catch (error) {
    toast.error(translateError(error?.message, t));
  }
}

onMounted(loadDraft);
</script>
