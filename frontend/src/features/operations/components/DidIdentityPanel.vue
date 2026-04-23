<template>
  <div class="rounded-2xl border border-aa-border bg-aa-panel/60 overflow-hidden shadow-glow-panel backdrop-blur-lg transition-all duration-200">
    <button @click="expanded = !expanded" :aria-expanded="expanded" aria-controls="did-panel-content" class="w-full bg-aa-panel/40 px-6 py-5 border-b border-aa-border flex items-center justify-between hover:bg-aa-dark/40 transition-colors duration-200">
      <div class="flex items-center gap-4">
        <div class="w-8 h-8 rounded-full bg-aa-info/20 border border-aa-info/50 text-aa-info flex items-center justify-center font-bold text-sm shadow-glow-sky">D</div>
        <h2 class="text-lg font-bold text-white font-outfit">{{ t('didPanel.title', 'NeoDID / Web3Auth') }}</h2>
      </div>
      <svg aria-hidden="true" class="w-4 h-4 text-aa-muted transform transition-transform duration-200" :class="expanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
    </button>
    <div id="did-panel-content" v-show="expanded" class="p-6 md:p-8 animate-fade-in space-y-6">
      <div class="rounded-xl border border-aa-info/20 bg-aa-info/5 p-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p class="text-xs uppercase tracking-wider text-aa-info font-bold mb-2">{{ t('didPanel.connectTitle', 'Connect Web3Auth First') }}</p>
            <p class="text-sm text-aa-text leading-6">
              {{ didAvailable ? t('didPanel.connectSubtitle', 'NeoDID bind, recovery, and private sessions all start from a live Web3Auth identity. Choose a login method below.') : t('didPanel.connectUnavailable', 'Web3Auth is not configured in this deployment yet.') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button v-if="didAvailable && !didConnected" class="btn-primary btn-xs" :aria-label="t('operations.ariaConnectDid', 'Connect DID')" :class="{ 'btn-loading': busy === 'connectDid' }" :disabled="busy === 'connectDid'" @click="connectDidAction()">
              {{ busy === 'connectDid' ? t('didPanel.connecting', 'Connecting…') : t('didPanel.connectModal', 'Open Web3Auth') }}
            </button>
            <button v-if="didAvailable && !didConnected" class="btn-secondary btn-xs" :aria-label="t('operations.ariaConnectGoogle', 'Connect via Google')" :class="{ 'btn-loading': busy === 'connectGoogle' }" :disabled="busy === 'connectGoogle'" @click="connectDidAction('google')">
              {{ busy === 'connectGoogle' ? t('didPanel.connecting', 'Connecting…') : t('didPanel.connectGoogle', 'Google') }}
            </button>
            <button v-if="didAvailable && !didConnected" class="btn-secondary btn-xs" :aria-label="t('operations.ariaConnectEmail', 'Connect via Email')" :class="{ 'btn-loading': busy === 'connectEmail' }" :disabled="busy === 'connectEmail'" @click="connectDidAction('email_passwordless')">
              {{ busy === 'connectEmail' ? t('didPanel.connecting', 'Connecting…') : t('didPanel.connectEmail', 'Email') }}
            </button>
            <button v-if="didAvailable && !didConnected" class="btn-secondary btn-xs" :aria-label="t('operations.ariaConnectSms', 'Connect via SMS')" :class="{ 'btn-loading': busy === 'connectSms' }" :disabled="busy === 'connectSms'" @click="connectDidAction('sms_passwordless')">
              {{ busy === 'connectSms' ? t('didPanel.connecting', 'Connecting…') : t('didPanel.connectSms', 'SMS') }}
            </button>
            <button v-if="didConnected" class="btn-secondary btn-xs" :aria-label="t('operations.ariaDisconnectDid', 'Disconnect DID')" :class="{ 'btn-loading': busy === 'disconnectDid' }" :disabled="busy === 'disconnectDid'" @click="disconnectDidAction">
              {{ t('didPanel.disconnect', 'Disconnect Web3Auth') }}
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.identityRoot', 'Identity Root') }}</p>
          <p class="text-sm text-aa-text font-semibold break-all">{{ didProfile?.identityRoot || didProfile?.providerUid || t('didPanel.notConnected', 'not connected') }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.provider', 'Provider') }}</p>
          <p class="text-sm text-aa-text font-semibold">{{ didProfile?.provider || t('operations.web3auth', 'web3auth') }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.serviceDid', 'NeoDID Service DID') }}</p>
          <p class="text-sm text-aa-text font-semibold break-all">{{ serviceDid }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.resolvedAccountId', 'Resolved AccountId') }}</p>
          <p class="text-sm text-aa-text font-semibold break-all">{{ resolvedAccountId || t('didPanel.unresolved', 'unresolved') }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.linkedAccounts', 'Linked Accounts') }}</p>
          <p class="text-sm text-aa-text font-semibold">{{ linkedAccountsLabel }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.emailNotice', 'Email Notice') }}</p>
          <p class="text-sm text-aa-text font-semibold">{{ didProfile?.email || t('didPanel.unavailable', 'unavailable') }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.smsNotice', 'SMS Notice') }}</p>
          <p class="text-sm text-aa-text font-semibold">{{ didProfile?.phone || t('didPanel.unavailable', 'unavailable') }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.emailChannel', 'Email Channel') }}</p>
          <p class="text-sm text-aa-text font-semibold">{{ canEmailNotice ? t('didPanel.enabled', 'enabled') : t('didPanel.disabled', 'disabled') }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.smsChannel', 'SMS Channel') }}</p>
          <p class="text-sm text-aa-text font-semibold">{{ canSmsNotice ? t('didPanel.enabled', 'enabled') : t('didPanel.disabled', 'disabled') }}</p>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-2">{{ t('didPanel.resolver', 'Resolver') }}</p>
          <p class="text-sm text-aa-text break-all">{{ resolverUrl }}</p>
          <p class="mt-2 text-xs text-aa-muted">{{ t('didPanel.resolverHint', 'Public DID resolution is metadata-only. Private JWT claims and nullifiers never appear in resolver output.') }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-2">{{ t('didPanel.runtimeStatus', 'Runtime Status') }}</p>
          <p class="text-sm text-aa-text font-semibold break-all">{{ runtimeSummary }}</p>
          <div class="mt-3 flex flex-wrap gap-3">
            <button class="btn-secondary btn-sm" :aria-label="t('operations.ariaResolveServiceDid', 'Resolve Service DID')" :class="{ 'btn-loading': busy === 'resolveServiceDid' }" :disabled="busy === 'resolveServiceDid'" @click="resolveServiceDidAction">
              {{ busy === 'resolveServiceDid' ? t('didPanel.resolving', 'Resolving…') : t('didPanel.resolveServiceDid', 'Resolve Service DID') }}
            </button>
            <a :href="resolverUrl" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm no-underline">
              {{ t('didPanel.openResolver', 'Open Resolver') }}
            </a>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button class="btn-secondary btn-sm" :aria-label="t('operations.ariaRefreshChainState', 'Refresh chain state')" :class="{ 'btn-loading': busy === 'refreshState' }" :disabled="busy === 'refreshState' || !props.accountAddressScriptHash" @click="refreshVerifierStateAction">
          {{ busy === 'refreshState' ? t('didPanel.refreshing', 'Refreshing…') : t('didPanel.refreshChainState', 'Refresh Chain State') }}
        </button>
        <button class="btn-secondary btn-sm" :aria-label="t('operations.ariaSendEmailNotice', 'Send email notice')" :class="{ 'btn-loading': busy === 'notifyEmail' }" :disabled="busy === 'notifyEmail' || !canEmailNotice" @click="sendEmailNoticeAction">
          {{ busy === 'notifyEmail' ? t('didPanel.sendingEmail', 'Sending Email…') : t('didPanel.sendEmailNotice', 'Send Email Notice') }}
        </button>
        <button class="btn-secondary btn-sm" :aria-label="t('operations.ariaSendSmsNotice', 'Send SMS notice')" :class="{ 'btn-loading': busy === 'notifySms' }" :disabled="busy === 'notifySms' || !canSmsNotice" @click="sendSmsNoticeAction">
          {{ busy === 'notifySms' ? t('didPanel.sendingSms', 'Sending SMS…') : t('didPanel.sendSmsNotice', 'Send SMS Notice') }}
        </button>
        <span class="text-xs text-aa-muted">{{ t('didPanel.flowHint', 'Recommended flow: Connect Web3Auth → Bind NeoDID → Start Recovery / Private Session → Finalize / Revoke.') }}</span>
      </div>

      <div v-if="verifierState" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.boundVerifier', 'Bound Verifier') }}</p>
          <p class="text-sm text-aa-text font-semibold break-all">{{ verifierState.verifierHash }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.verifierOwner', 'Verifier Owner') }}</p>
          <p class="text-sm text-aa-text font-semibold break-all">{{ verifierState.owner || t('didPanel.unset', 'unset') }}</p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.recovery', 'Recovery') }}</p>
          <p class="text-sm text-aa-text font-semibold">
            {{ verifierState.pendingRecovery?.active ? `${t('didPanel.statusPending', '(pending)').replace(/[()（）]/g, '').trim()} ${verifierState.pendingRecovery.approvedCount}/${verifierState.threshold}` : `${t('didPanel.nonce', 'nonce')} ${verifierState.recoveryNonce}` }}
          </p>
        </div>
        <div class="rounded-xl border border-aa-border bg-aa-panel/40 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold mb-1">{{ t('didPanel.privateSession', 'Private Session') }}</p>
          <p class="text-sm text-aa-text font-semibold">
            {{ verifierState.activeSession?.active ? t('didPanel.statusActive', '(active)').replace(/[()（）]/g, '').trim() : `${t('didPanel.nonce', 'nonce')} ${verifierState.sessionNonce}` }}
          </p>
        </div>
      </div>
      <div v-else class="empty-state rounded-xl bg-aa-panel/20 p-6">
        <svg aria-hidden="true" class="w-8 h-8 mx-auto mb-2 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        <p class="text-sm text-aa-muted">{{ t('didPanel.noVerifierState', 'No on-chain verifier state loaded yet.') }}</p>
        <p class="text-xs text-aa-muted mt-1">{{ t('didPanel.refreshHint', 'Click "Refresh Chain State" to query the latest data.') }}</p>
      </div>

      <div v-if="verifierState && (verifierState.pendingRecovery?.active || verifierState.activeSession?.active)" class="grid gap-4 xl:grid-cols-2">
        <div v-if="verifierState.pendingRecovery?.active" class="rounded-xl border border-aa-warning/30 bg-aa-warning/5 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-warning font-bold mb-2">{{ t('didPanel.pendingRecovery', 'Pending Recovery') }}</p>
          <p class="text-sm text-aa-text break-all">{{ t('didPanel.newOwner', 'new owner') }}: {{ verifierState.pendingRecovery.newOwner || t('didPanel.unset', 'unset') }}</p>
          <p class="text-sm text-aa-text">{{ t('didPanel.approved', 'approved') }}: {{ verifierState.pendingRecovery.approvedCount }} / {{ verifierState.threshold }}</p>
          <p class="text-sm text-aa-text">{{ t('didPanel.executableAt', 'executable at') }}: {{ verifierState.pendingRecovery.executableAt }}</p>
          <div class="mt-4 flex gap-3">
            <button class="btn-primary flex-1" :aria-label="t('operations.ariaFinalizeRecovery', 'Finalize recovery')" :class="{ 'btn-loading': busy === 'finalizeRecovery' }" :disabled="busy === 'finalizeRecovery'" @click="finalizeRecoveryAction">
              {{ busy === 'finalizeRecovery' ? t('didPanel.finalizingRecovery', 'Finalizing…') : t('didPanel.finalizeRecovery', 'Finalize Recovery') }}
            </button>
            <button class="btn-secondary flex-1" :aria-label="t('operations.ariaCancelRecovery', 'Cancel recovery')" :class="{ 'btn-loading': busy === 'cancelRecovery' }" :disabled="busy === 'cancelRecovery'" @click="cancelRecoveryAction">
              {{ busy === 'cancelRecovery' ? t('didPanel.cancellingRecovery', 'Cancelling…') : t('didPanel.cancelRecovery', 'Cancel Recovery') }}
            </button>
          </div>
        </div>
        <div v-if="verifierState.activeSession?.active" class="rounded-xl border border-aa-info/30 bg-aa-info/5 p-4">
          <p class="text-xs uppercase tracking-wider text-aa-info font-bold mb-2">{{ t('didPanel.activePrivateSession', 'Active Private Session') }}</p>
          <p class="text-sm text-aa-text break-all">{{ t('didPanel.executor', 'executor') }}: {{ verifierState.activeSession.executor || t('didPanel.unset', 'unset') }}</p>
          <p class="text-sm text-aa-text break-all">{{ t('didPanel.action', 'action') }}: {{ verifierState.activeSession.actionId || t('didPanel.unset', 'unset') }}</p>
          <p class="text-sm text-aa-text">{{ t('didPanel.expiresAt', 'expires at') }}: {{ verifierState.activeSession.expiresAt }}</p>
          <button class="btn-secondary mt-4 w-full" :aria-label="t('operations.ariaRevokeSession', 'Revoke session')" :class="{ 'btn-loading': busy === 'revokeSession' }" :disabled="busy === 'revokeSession'" @click="revokeSessionAction">
            {{ busy === 'revokeSession' ? t('didPanel.revokingSession', 'Revoking…') : t('didPanel.revokeSession', 'Revoke Session') }}
          </button>
        </div>
      </div>

      <div v-if="maintenanceItems.length > 0" class="rounded-xl border border-aa-warning/30 bg-aa-warning/5 p-4 space-y-3">
        <p class="text-xs uppercase tracking-wider text-aa-warning font-bold">{{ t('didPanel.pendingMaintenance', 'Pending Account Maintenance') }}</p>
        <div v-for="item in maintenanceItems" :key="item.id" class="rounded-lg border border-aa-warning/20 bg-aa-panel/40 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-aa-text">{{ item.title }}</p>
            <span class="text-xs font-medium text-aa-warning">{{ t('didPanel.statusPending', '(pending)').replace(/[()（）]/g, '').trim() }}</span>
          </div>
          <p class="mt-1 text-xs text-aa-muted">{{ item.description }}</p>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <p class="text-[10px] uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.executableAt', 'executable at') }}</p>
              <p class="mt-1 text-sm text-aa-text break-all">{{ item.executeAfter }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.boundModule', 'Bound Module') }}</p>
              <p class="mt-1 text-sm text-aa-text break-all">{{ item.moduleHash || t('didPanel.unset', 'unset') }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.pendingCallHash', 'Pending Call Hash') }}</p>
              <p class="mt-1 text-sm text-aa-text break-all">{{ item.callHash || t('didPanel.unset', 'unset') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <section class="rounded-xl border border-aa-border bg-aa-panel/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.stepBind', '1. Bind NeoDID') }} {{ bindStatusLabel }}</p>
            <p class="mt-1 text-sm text-aa-text">{{ t('didPanel.stepBindHint', 'Seal the live Web3Auth id_token locally, then let the TEE derive the stable identity root inside Morpheus.') }}</p>
          </div>
          <label for="did-panel-vault-script-hash" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.vaultScriptHash', 'Vault Script Hash') }}</span>
            <input id="did-panel-vault-script-hash" v-model="vaultAccount" class="mt-1 input-field" :placeholder="t('operations.hexPlaceholder', '0x...')" />
          </label>
          <label for="did-panel-claim-type" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.claimType', 'Claim Type') }}</span>
            <input id="did-panel-claim-type" v-model="claimType" class="mt-1 input-field" />
          </label>
          <label for="did-panel-claim-value" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.claimValue', 'Claim Value') }}</span>
            <input id="did-panel-claim-value" v-model="claimValue" class="mt-1 input-field" />
          </label>
          <button class="btn-secondary w-full" :aria-label="t('operations.ariaBindDidMorpheus', 'Bind DID with Morpheus')" :class="{ 'btn-loading': busy === 'bind' }" :disabled="!didConnected || !vaultAccount || busy === 'bind'" @click="bindDidAction">
            {{ busy === 'bind' ? t('didPanel.binding', 'Binding…') : t('didPanel.bindAction', 'Bind DID with Morpheus') }}
          </button>

          <div v-if="zkloginVerifierParamsHex" class="rounded-xl border border-aa-info/20 bg-aa-info/5 p-4 space-y-3">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wider text-aa-info font-bold">{{ t('didPanel.zkloginParamsTitle', 'ZK Login Verifier Params') }}</p>
                <p class="mt-1 text-xs text-aa-muted">{{ t('didPanel.zkloginParamsHint', 'Use this hex when deploying/binding the ZkLoginVerifier plugin for the currently connected Web3Auth identity.') }}</p>
              </div>
              <button class="btn-secondary btn-xs" :aria-label="t('didPanel.copyZkloginParams', 'Copy ZK login verifier params')" :disabled="!zkloginVerifierParamsHex" @click="copyZkloginVerifierParams">
                <span class="flex items-center gap-1.5">
                  <svg aria-hidden="true" v-if="copiedKey !== 'zklogin-params'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  <svg aria-hidden="true" v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  {{ copiedKey === 'zklogin-params' ? t('operations.copied', 'Copied!') : t('operations.copy', 'Copy') }}
                </span>
              </button>
            </div>

            <p class="font-mono text-xs break-all text-aa-text">0x{{ zkloginVerifierParamsHex }}</p>

            <details class="rounded-lg border border-aa-border bg-aa-panel/30 p-3">
              <summary class="cursor-pointer text-xs font-semibold text-aa-muted hover:text-aa-text transition-colors duration-200 flex items-center gap-2">
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {{ t('didPanel.zkloginParamsDetails', 'Show underlying fields') }}
              </summary>
              <div class="mt-3 space-y-3">
                <div v-if="zkloginPublicKey" class="space-y-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-xs uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.zkloginSignerKey', 'Signer Public Key') }}</p>
                    <button class="btn-secondary btn-xs" :aria-label="t('didPanel.copyZkloginPublicKey', 'Copy zklogin signer public key')" @click="copyZkloginPublicKey">
                      <span class="flex items-center gap-1.5">
                        <svg aria-hidden="true" v-if="copiedKey !== 'zklogin-pubkey'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        <svg aria-hidden="true" v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        {{ copiedKey === 'zklogin-pubkey' ? t('operations.copied', 'Copied!') : t('operations.copy', 'Copy') }}
                      </span>
                    </button>
                  </div>
                  <p class="font-mono text-xs break-all text-aa-muted">0x{{ zkloginPublicKey }}</p>
                </div>

                <div v-if="zkloginMasterNullifier" class="space-y-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-xs uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.zkloginMasterNullifier', 'Master Nullifier') }}</p>
                    <button class="btn-secondary btn-xs" :aria-label="t('didPanel.copyZkloginMasterNullifier', 'Copy zklogin master nullifier')" @click="copyZkloginMasterNullifier">
                      <span class="flex items-center gap-1.5">
                        <svg aria-hidden="true" v-if="copiedKey !== 'zklogin-master-nullifier'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        <svg aria-hidden="true" v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        {{ copiedKey === 'zklogin-master-nullifier' ? t('operations.copied', 'Copied!') : t('operations.copy', 'Copy') }}
                      </span>
                    </button>
                  </div>
                  <p class="font-mono text-xs break-all text-aa-muted">0x{{ zkloginMasterNullifier }}</p>
                </div>
              </div>
            </details>
          </div>
        </section>

        <section class="rounded-xl border border-aa-border bg-aa-panel/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.stepRecovery', '2. Social Recovery') }} {{ recoveryStatusLabel }}</p>
            <p class="mt-1 text-sm text-aa-text">{{ t('didPanel.stepRecoveryHint', 'Submit a Morpheus recovery request through the bound verifier for the currently connected Web3Auth identity.') }}</p>
          </div>
          <label for="did-panel-recovery-verifier-hash" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.recoveryVerifierHash', 'Recovery Verifier Hash') }}</span>
            <input id="did-panel-recovery-verifier-hash" v-model="recoveryVerifierHash" class="mt-1 input-field" :placeholder="t('operations.hexPlaceholder', '0x...')" />
          </label>
          <label for="did-panel-recovery-new-owner" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.newOwnerAddress', 'New Owner Address / Script Hash') }}</span>
            <input id="did-panel-recovery-new-owner" v-model="recoveryNewOwner" class="mt-1 input-field" :placeholder="t('operations.neoOrHexPlaceholder', 'N... or 0x...')" />
          </label>
          <label for="did-panel-recovery-expiry" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.expiryMinutes', 'Expiry (minutes)') }}</span>
            <input id="did-panel-recovery-expiry" v-model="recoveryExpiryMinutes" type="number" min="1" class="mt-1 input-field" />
          </label>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" :aria-label="t('operations.ariaPreviewRecoveryTicket', 'Preview recovery ticket')" :class="{ 'btn-loading': busy === 'previewRecovery' }" :disabled="!canPreviewRecovery || busy === 'previewRecovery'" @click="previewRecoveryAction">
              {{ busy === 'previewRecovery' ? t('didPanel.preparingTicket', 'Preparing…') : t('didPanel.previewTicket', 'Preview Ticket') }}
            </button>
            <button class="btn-primary flex-1" :aria-label="t('operations.ariaInvokeRecovery', 'Invoke recovery')" :class="{ 'btn-loading': busy === 'invokeRecovery' }" :disabled="!canInvokeRecovery || busy === 'invokeRecovery'" @click="invokeRecoveryAction">
              {{ busy === 'invokeRecovery' ? t('didPanel.requestingRecovery', 'Requesting…') : t('didPanel.invokeRecovery', 'Invoke Recovery') }}
            </button>
          </div>
        </section>

        <section class="rounded-xl border border-aa-border bg-aa-panel/40 p-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.stepPrivateActions', '3. Private Actions') }} {{ sessionStatusLabel }}</p>
            <p class="mt-1 text-sm text-aa-text">{{ t('didPanel.stepPrivateActionsHint', 'Create a short-lived private execution session without exposing the long-term identity root on-chain.') }}</p>
          </div>
          <label for="did-panel-proxy-verifier-hash" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.proxyVerifierHash', 'Proxy Verifier Hash') }}</span>
            <input id="did-panel-proxy-verifier-hash" v-model="proxyVerifierHash" class="mt-1 input-field" :placeholder="t('operations.hexPlaceholder', '0x...')" />
          </label>
          <label for="did-panel-proxy-executor" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.executorAddress', 'Executor Address / Script Hash') }}</span>
            <input id="did-panel-proxy-executor" v-model="proxyExecutor" class="mt-1 input-field" :placeholder="t('operations.neoOrHexPlaceholder', 'N... or 0x...')" />
          </label>
          <label for="did-panel-proxy-expiry" class="block text-sm">
            <span class="text-aa-muted">{{ t('didPanel.expiryMinutes', 'Expiry (minutes)') }}</span>
            <input id="did-panel-proxy-expiry" v-model="proxyExpiryMinutes" type="number" min="1" class="mt-1 input-field" />
          </label>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" :aria-label="t('operations.ariaPreviewProxyTicket', 'Preview proxy ticket')" :class="{ 'btn-loading': busy === 'previewProxy' }" :disabled="!canPreviewProxy || busy === 'previewProxy'" @click="previewProxyAction">
              {{ busy === 'previewProxy' ? t('didPanel.preparingTicket', 'Preparing…') : t('didPanel.previewTicket', 'Preview Ticket') }}
            </button>
            <button class="btn-primary flex-1" :aria-label="t('operations.ariaInvokeProxySession', 'Invoke proxy session')" :class="{ 'btn-loading': busy === 'invokeProxy' }" :disabled="!canInvokeProxy || busy === 'invokeProxy'" @click="invokeProxyAction">
              {{ busy === 'invokeProxy' ? t('didPanel.requestingSession', 'Requesting…') : t('didPanel.invokeSession', 'Invoke Session') }}
            </button>
          </div>
        </section>
      </div>

      <div v-if="resultJson" class="rounded-xl border border-aa-border bg-aa-dark/70 p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs uppercase tracking-wider text-aa-muted font-bold">{{ t('didPanel.latestResult', 'Latest Result') }}</p>
          <button class="btn-secondary btn-xs" :aria-label="t('operations.ariaCopyResult', 'Copy result')" @click="copyResult">
            <span class="flex items-center gap-1.5">
              <svg aria-hidden="true" v-if="copiedKey !== 'result'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              <svg aria-hidden="true" v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              {{ copiedKey === 'result' ? t('operations.copied', 'Copied!') : t('operations.copy', 'Copy') }}
            </span>
          </button>
        </div>
        <pre class="text-xs text-aa-text whitespace-pre-wrap break-all">{{ resultJson }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from '@/i18n';
import { useToast } from 'vue-toastification';
import { useClipboard } from '@/composables/useClipboard.js';
import { useDidConnection } from '@/composables/useDidConnection.js';
import { morpheusDidService, fetchAccountIdByAddress, fetchAccountMaintenanceState, fetchVerifierContractByAddress, fetchUnifiedVerifierState } from '@/services/morpheusDidService.js';
import { notificationService } from '@/services/notificationService.js';
import { getAbstractAccountHash } from '@/services/walletService.js';
import { getScriptHashFromAddress } from '@/utils/neo.js';
import { sanitizeHex } from '@/utils/hex.js';
import { RUNTIME_CONFIG } from '@/config/runtimeConfig.js';
import { translateError } from '@/config/errorCodes.js';

const props = defineProps({
  aaContractHash: {
    type: String,
    default: '',
  },
  accountAddressScriptHash: {
    type: String,
    default: '',
  },
  accountIdPrefill: {
    type: String,
    default: '',
  },
  neoWalletAddress: {
    type: String,
    default: '',
  },
  recoveryVerifierPrefill: {
    type: String,
    default: '',
  },
  recoveryNewOwnerPrefill: {
    type: String,
    default: '',
  },
  recoveryExpiryPrefill: {
    type: [String, Number],
    default: '',
  },
  autoPreviewRecovery: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(['status', 'activity']);

const { t } = useI18n();
const toast = useToast();
const {
  isConfigured: didAvailableRef,
  isConnected: didConnectedRef,
  didProfile,
  connectDid,
  disconnectDid,
} = useDidConnection();
const didAvailable = computed(() => didAvailableRef.value);
const didConnected = computed(() => didConnectedRef.value);
const linkedAccountsLabel = computed(() => (didProfile.value?.linkedAccounts || []).join(', ') || t('operations.none', 'none'));
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
const maintenanceState = ref(null);
const busy = ref('');
const resultJson = ref('');
const { copiedKey, markCopied, copyText: clipboardCopy } = useClipboard();
const expanded = ref(true);
const bindResponse = ref(null);

const zkloginVerifierParamsHex = computed(() => sanitizeHex(bindResponse.value?.zklogin_verifier_params_hex || bindResponse.value?.verifier_params_hex || ''));
const zkloginPublicKey = computed(() => sanitizeHex(bindResponse.value?.public_key || bindResponse.value?.publicKey || ''));
const zkloginMasterNullifier = computed(() => sanitizeHex(bindResponse.value?.master_nullifier || bindResponse.value?.masterNullifier || ''));

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

function formatScheduledTimestamp(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return raw;
  const millis = raw.length >= 13 ? numeric : numeric * 1000;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.toISOString()} (${raw})`;
}

const maintenanceItems = computed(() => {
  if (!maintenanceState.value) return [];
  const items = [];
  if (maintenanceState.value.pendingVerifierCall?.active) {
    items.push({
      id: 'pending-verifier-call',
      title: t('didPanel.pendingVerifierCall', 'Pending Verifier Maintenance Call'),
      description: t('didPanel.pendingVerifierCallHint', 'A delayed verifier maintenance request is staged and can only be confirmed after the contract timelock expires.'),
      executeAfter: formatScheduledTimestamp(maintenanceState.value.pendingVerifierCall.executeAfter),
      moduleHash: maintenanceState.value.pendingVerifierCall.moduleHash,
      callHash: maintenanceState.value.pendingVerifierCall.callHash,
    });
  }
  if (maintenanceState.value.pendingHookCall?.active) {
    items.push({
      id: 'pending-hook-call',
      title: t('didPanel.pendingHookCall', 'Pending Hook Maintenance Call'),
      description: t('didPanel.pendingHookCallHint', 'A delayed hook maintenance request is staged and can only be confirmed after the contract timelock expires.'),
      executeAfter: formatScheduledTimestamp(maintenanceState.value.pendingHookCall.executeAfter),
      moduleHash: maintenanceState.value.pendingHookCall.moduleHash,
      callHash: maintenanceState.value.pendingHookCall.callHash,
    });
  }
  if (maintenanceState.value.pendingVerifierUpdate?.active) {
    items.push({
      id: 'pending-verifier-update',
      title: t('didPanel.pendingVerifierUpdate', 'Pending Verifier Rotation'),
      description: t('didPanel.pendingVerifierUpdateHint', 'A verifier rotation is queued behind the V3 config-update timelock.'),
      executeAfter: formatScheduledTimestamp(maintenanceState.value.pendingVerifierUpdate.executeAfter),
      moduleHash: '',
      callHash: '',
    });
  }
  if (maintenanceState.value.pendingHookUpdate?.active) {
    items.push({
      id: 'pending-hook-update',
      title: t('didPanel.pendingHookUpdate', 'Pending Hook Rotation'),
      description: t('didPanel.pendingHookUpdateHint', 'A hook rotation is queued behind the V3 config-update timelock.'),
      executeAfter: formatScheduledTimestamp(maintenanceState.value.pendingHookUpdate.executeAfter),
      moduleHash: '',
      callHash: '',
    });
  }
  return items;
});
const prefillRecoveryVerifier = computed(() => String(props.recoveryVerifierPrefill || '').trim());
const prefillRecoveryNewOwner = computed(() => String(props.recoveryNewOwnerPrefill || '').trim());
const prefillRecoveryExpiryMinutes = computed(() => {
  const raw = Number(String(props.recoveryExpiryPrefill || '').trim());
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
});
const autoRecoveryPreviewKey = ref('');

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
  if (props.accountIdPrefill) {
    resolvedAccountId.value = sanitizeHex(props.accountIdPrefill);
    return;
  }
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
  } catch (error) {
    if (import.meta.env.DEV) console.error('[DidIdentityPanel] refreshAccountId failed:', error?.message);
    toast.error(translateError(error?.message, t));
    resolvedAccountId.value = '';
  }
}

async function refreshBoundVerifier() {
  try {
    const bound = props.accountAddressScriptHash
      ? await fetchVerifierContractByAddress({
          rpcUrl: RUNTIME_CONFIG.rpcUrl,
          aaContractHash: props.aaContractHash || getAbstractAccountHash(),
          accountAddressScriptHash: props.accountAddressScriptHash,
        })
      : '';
    const preferredRecoveryVerifier = prefillRecoveryVerifier.value || bound;
    if (!recoveryVerifierHash.value && preferredRecoveryVerifier) {
      recoveryVerifierHash.value = preferredRecoveryVerifier;
    }
    if (!proxyVerifierHash.value && bound) {
      proxyVerifierHash.value = bound;
    }
    if (resolvedAccountId.value) {
      maintenanceState.value = await fetchAccountMaintenanceState({
        rpcUrl: RUNTIME_CONFIG.rpcUrl,
        aaContractHash: props.aaContractHash || getAbstractAccountHash(),
        accountIdHex: resolvedAccountId.value,
      }).catch((err) => { if (import.meta.env.DEV) console.error('[DidIdentityPanel] fetchAccountMaintenanceState failed:', err?.message); return null; });
    }
    if ((preferredRecoveryVerifier || bound) && resolvedAccountId.value) {
      verifierState.value = await fetchUnifiedVerifierState({
        rpcUrl: RUNTIME_CONFIG.rpcUrl,
        verifierHash: preferredRecoveryVerifier || bound,
        accountIdHex: resolvedAccountId.value,
      }).catch((err) => { if (import.meta.env.DEV) console.error('[DidIdentityPanel] fetchUnifiedVerifierState failed:', err?.message); return null; });
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[DidIdentityPanel] refreshBoundVerifier failed:', error?.message);
    toast.error(translateError(error?.message, t));
    recoveryVerifierHash.value = prefillRecoveryVerifier.value || '';
    proxyVerifierHash.value = '';
    verifierState.value = null;
    maintenanceState.value = null;
  }
}

watch(() => props.accountAddressScriptHash, () => {
  void refreshAccountId();
  void refreshBoundVerifier();
}, { immediate: true });

watch(
  () => [prefillRecoveryVerifier.value, prefillRecoveryNewOwner.value, prefillRecoveryExpiryMinutes.value, props.autoPreviewRecovery],
  () => {
    if (prefillRecoveryVerifier.value) {
      recoveryVerifierHash.value = prefillRecoveryVerifier.value;
    }
    if (prefillRecoveryNewOwner.value) {
      recoveryNewOwner.value = prefillRecoveryNewOwner.value;
    }
    if (prefillRecoveryExpiryMinutes.value > 0) {
      recoveryExpiryMinutes.value = prefillRecoveryExpiryMinutes.value;
    }
    if (props.autoPreviewRecovery) {
      expanded.value = true;
      autoRecoveryPreviewKey.value = '';
    }
  },
  { immediate: true },
);

let verifierStateRequestId = 0;
watch([resolvedAccountId, recoveryVerifierHash], async ([accountId, verifier]) => {
  if (!accountId) return;
  const requestId = ++verifierStateRequestId;
  try {
    const maintenance = await fetchAccountMaintenanceState({
      rpcUrl: RUNTIME_CONFIG.rpcUrl,
      aaContractHash: props.aaContractHash || getAbstractAccountHash(),
      accountIdHex: accountId,
    });
    if (requestId !== verifierStateRequestId) return;
    maintenanceState.value = maintenance;
    if (!verifier) {
      verifierState.value = null;
      return;
    }
    const state = await fetchUnifiedVerifierState({
      rpcUrl: RUNTIME_CONFIG.rpcUrl,
      verifierHash: verifier,
      accountIdHex: accountId,
    });
    if (requestId !== verifierStateRequestId) return;
    verifierState.value = state;
  } catch (error) {
    if (requestId !== verifierStateRequestId) return;
    if (import.meta.env.DEV) console.error('[DidIdentityPanel] fetchUnifiedVerifierState failed:', error?.message);
    toast.error(translateError(error?.message, t));
    verifierState.value = null;
    maintenanceState.value = null;
  }
});

async function refreshVerifierStateAction() {
  busy.value = 'refreshState';
  try {
    if (resolvedAccountId.value) {
      maintenanceState.value = await fetchAccountMaintenanceState({
        rpcUrl: RUNTIME_CONFIG.rpcUrl,
        aaContractHash: props.aaContractHash || getAbstractAccountHash(),
        accountIdHex: resolvedAccountId.value,
      });
    }
    if (resolvedAccountId.value && (recoveryVerifierHash.value || proxyVerifierHash.value)) {
      verifierState.value = await fetchUnifiedVerifierState({
        rpcUrl: RUNTIME_CONFIG.rpcUrl,
        verifierHash: recoveryVerifierHash.value || proxyVerifierHash.value,
        accountIdHex: resolvedAccountId.value,
      });
      publishStatus(t('didPanel.refreshChainState', 'Refresh Chain State'));
    }
  } catch (err) {
    toast.error(translateError(err?.message, t));
  } finally {
    busy.value = '';
  }
}

watch(() => props.neoWalletAddress, (next) => {
  if (!next) return;
  try {
    vaultAccount.value = sanitizeHex(getScriptHashFromAddress(next));
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[DidIdentityPanel] neoWalletAddress script hash parse failed:', e?.message);
    vaultAccount.value = '';
  }
}, { immediate: true });

const canPreviewRecovery = computed(() => didConnected.value && recoveryVerifierHash.value && recoveryNewOwner.value && resolvedAccountId.value);
const canInvokeRecovery = computed(() => canPreviewRecovery.value);
const canPreviewProxy = computed(() => didConnected.value && proxyExecutor.value);
const effectiveProxyVerifierHash = computed(() => proxyVerifierHash.value || recoveryVerifierHash.value);
const canInvokeProxy = computed(() => didConnected.value && effectiveProxyVerifierHash.value && proxyExecutor.value && resolvedAccountId.value);

watch(
  () => [
    props.autoPreviewRecovery,
    didConnected.value,
    canPreviewRecovery.value,
    resolvedAccountId.value,
    recoveryVerifierHash.value,
    recoveryNewOwner.value,
    recoveryExpiryMinutes.value,
  ],
  async ([autoPreview, connected, canPreview, accountId, verifier, newOwner, expiry]) => {
    if (!autoPreview || !connected || !canPreview) return;
    const nextKey = [accountId, verifier, newOwner, expiry].join('|');
    if (!nextKey || autoRecoveryPreviewKey.value === nextKey || busy.value) return;
    autoRecoveryPreviewKey.value = nextKey;
    await previewRecoveryAction();
  },
);

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
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    bindResponse.value = response;
    resultJson.value = JSON.stringify(response, null, 2);
    publishStatus(t('didPanel.bindAction', 'Bind DID with Morpheus'));
    publishActivity('did_bound', t('didPanel.activity.didBound', 'Web3Auth DID bound through Morpheus NeoDID'));
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    publishActivity('did_resolved', t('didPanel.activity.didResolved', 'Morpheus NeoDID service DID resolved'));
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    publishActivity('recovery_requested', t('didPanel.activity.recoveryRequested', 'Morpheus social recovery request submitted'));
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    publishActivity('proxy_session_requested', t('didPanel.activity.proxySessionRequested', 'Morpheus proxy session request submitted'));
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    publishActivity('recovery_finalized', t('didPanel.activity.recoveryFinalized', 'Morpheus recovery finalized'));
    await refreshVerifierStateAction();
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    publishActivity('recovery_cancelled', t('didPanel.activity.recoveryCancelled', 'Morpheus recovery cancelled'));
    await refreshVerifierStateAction();
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    publishActivity('proxy_session_revoked', t('didPanel.activity.proxySessionRevoked', 'Morpheus private session revoked'));
    await refreshVerifierStateAction();
  } catch (err) {
    toast.error(translateError(err?.message, t));
  } finally {
    busy.value = '';
  }
}

async function copyResult() {
  if (!resultJson.value) return;
  if (await clipboardCopy(resultJson.value)) markCopied('result');
}

async function copyZkloginVerifierParams() {
  if (!zkloginVerifierParamsHex.value) return;
  if (await clipboardCopy(`0x${sanitizeHex(zkloginVerifierParamsHex.value)}`)) markCopied('zklogin-params');
}

async function copyZkloginPublicKey() {
  if (!zkloginPublicKey.value) return;
  if (await clipboardCopy(`0x${sanitizeHex(zkloginPublicKey.value)}`)) markCopied('zklogin-pubkey');
}

async function copyZkloginMasterNullifier() {
  if (!zkloginMasterNullifier.value) return;
  if (await clipboardCopy(`0x${sanitizeHex(zkloginMasterNullifier.value)}`)) markCopied('zklogin-master-nullifier');
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
    publishActivity('did_notice_sent', t('didPanel.activity.emailNoticeSent', 'Recovery email notice sent'));
  } catch (err) {
    toast.error(translateError(err?.message, t));
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
    publishActivity('did_notice_sent', t('didPanel.activity.smsNoticeSent', 'Recovery SMS notice sent'));
  } catch (err) {
    toast.error(translateError(err?.message, t));
  } finally {
    busy.value = '';
  }
}
</script>
