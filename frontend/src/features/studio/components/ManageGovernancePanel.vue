<template>
  <section class="card">
    <h2 class="text-lg font-bold text-white mb-2">{{ t('studioPanels.manageTitle', 'Manage Governance') }}</h2>
    <p class="text-sm text-aa-muted mb-8">{{ t('studioPanels.manageSubtitle', 'Load a V3 account, inspect its verifier / hook / escape state, then rotate plugins or operate the escape hatch.') }}</p>

    <div class="space-y-8">
      <div class="bg-aa-panel p-5 rounded-lg border border-aa-border/60">
        <label for="manage-target-account" class="block text-sm font-semibold text-aa-text mb-3">{{ t('studioPanels.targetAccountLabel', 'Target Account Seed / AccountId Hash') }}</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            id="manage-target-account"
            v-model="manageForm.accountAddress"
            type="text"
            list="loaded-manage-accounts"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4 bg-aa-dark"
            :placeholder="t('studioPanels.targetAccountPlaceholder', '20-byte hash160 or raw seed')"
          />
          <datalist id="loaded-manage-accounts">
            <option v-for="addr in autoLoadedAccounts" :key="addr" :value="addr" />
          </datalist>
          <button type="button" :aria-label="t('studioPanels.ariaLoadAccount', 'Load account')" class="btn-primary sm:w-auto" :class="{ 'btn-loading': manageBusy.load }" :disabled="manageBusy.load || !canManageTarget" @click="loadAccountConfiguration">
            {{ manageBusy.load ? t('studioPanels.loading', 'Loading...') : t('studioPanels.loadV3State', 'Load V3 State') }}
          </button>
        </div>
        <p class="mt-2 text-xs text-aa-muted">{{ t('studioPanels.v3StateKeyedHint', 'V3 state is keyed by `accountId` hash160, not by the derived virtual address.') }}</p>
      </div>

      <!-- Empty state when no account is loaded -->
      <div v-if="!manageSnapshot.loadedAt" class="empty-state">
        <div class="mx-auto w-12 h-12 rounded-full bg-aa-panel/30 flex items-center justify-center mb-3">
          <svg aria-hidden="true" class="w-6 h-6 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
        </div>
        <p class="text-sm text-aa-text font-medium mb-1">{{ t('studioPanels.noAccountLoaded', 'No account loaded') }}</p>
        <p class="text-xs text-aa-muted">{{ t('studioPanels.loadAccountHint', 'Enter a seed or account ID hash above and click "Load V3 State" to get started.') }}</p>
      </div>

      <transition name="fade-in-up">
        <div v-if="manageSnapshot.loadedAt" class="bg-gradient-to-r from-aa-success/10 to-aa-panel/60 rounded-lg p-5 border border-aa-orange/30 shadow-sm relative overflow-hidden backdrop-blur-sm">
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-aa-orange"></div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xs font-bold text-aa-orange uppercase tracking-wider font-outfit flex items-center gap-2">
              <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              {{ t('studioPanels.currentV3State', 'Current V3 State') }}
            </h3>
            <span class="text-xs text-aa-muted">{{ manageSnapshot.loadedAt }}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div class="rounded-lg bg-aa-dark/40 p-3 border border-aa-border/40">
              <span class="block text-aa-muted text-xs mb-1">{{ t('studioPanels.accountIdLabel', 'AccountId') }}</span>
              <div class="flex items-center">
                <span class="font-semibold text-aa-text break-all text-xs flex-1">{{ manageSnapshot.accountId || t('studioPanels.unset', 'unset') }}</span>
                <button v-if="manageSnapshot.accountId" :aria-label="t('studioPanels.copyAccountId', 'Copy AccountId')" @click="copyText(manageSnapshot.accountId); markCopied('governanceAccountId')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'governanceAccountId'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg bg-aa-dark/40 p-3 border border-aa-border/40">
              <span class="block text-aa-muted text-xs mb-1">{{ t('studioPanels.verifierLabel', 'Verifier') }}</span>
              <div class="flex items-center">
                <span class="font-semibold text-aa-text break-all text-xs flex-1">{{ manageSnapshot.verifier || t('studioPanels.unset', 'unset') }}</span>
                <button v-if="manageSnapshot.verifier" :aria-label="t('studioPanels.copyVerifier', 'Copy Verifier')" @click="copyText(manageSnapshot.verifier); markCopied('governanceVerifier')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'governanceVerifier'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg bg-aa-dark/40 p-3 border border-aa-border/40">
              <span class="block text-aa-muted text-xs mb-1">{{ t('studioPanels.hookLabel', 'Hook') }}</span>
              <div class="flex items-center">
                <span class="font-semibold text-aa-text break-all text-xs flex-1">{{ manageSnapshot.hook || t('studioPanels.unset', 'unset') }}</span>
                <button v-if="manageSnapshot.hook" :aria-label="t('studioPanels.copyHook', 'Copy Hook')" @click="copyText(manageSnapshot.hook); markCopied('governanceHook')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'governanceHook'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg bg-aa-dark/40 p-3 border border-aa-border/40">
              <span class="block text-aa-muted text-xs mb-1">{{ t('studioPanels.backupOwnerLabel', 'Backup Owner') }}</span>
              <div class="flex items-center">
                <span class="font-semibold text-aa-text break-all text-xs flex-1">{{ manageSnapshot.backupOwner || t('studioPanels.unset', 'unset') }}</span>
                <button v-if="manageSnapshot.backupOwner" :aria-label="t('studioPanels.copyBackupOwner', 'Copy Backup Owner')" @click="copyText(manageSnapshot.backupOwner); markCopied('governanceBackupOwner')" class="ml-1.5 text-aa-muted hover:text-aa-text transition-colors duration-200 flex-shrink-0">
                  <svg aria-hidden="true" v-if="copiedKey !== 'governanceBackupOwner'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                  <svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-aa-success" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
            <div class="rounded-lg bg-aa-dark/40 p-3 border border-aa-border/40">
              <span class="block text-aa-muted text-xs mb-1">{{ t('studioPanels.escapeTimelockLabel', 'Escape Timelock') }}</span>
              <span class="font-semibold text-aa-text text-xs">{{ manageSnapshot.escapeTimelock || 0 }} {{ t('studioPanels.sec', 'sec') }}</span>
            </div>
            <div class="rounded-lg bg-aa-dark/40 p-3 border border-aa-border/40">
              <span class="block text-aa-muted text-xs mb-1">{{ t('studioPanels.escapeStateLabel', 'Escape State') }}</span>
              <span class="font-semibold text-xs" :class="manageSnapshot.escapeActive ? 'text-aa-warning' : 'text-aa-success'">
                {{ manageSnapshot.escapeActive ? `${t('studioPanels.activeAt', 'active @')} ${manageSnapshot.escapeTriggeredAt}` : t('studioPanels.inactive', 'inactive') }}
              </span>
            </div>
          </div>
        </div>
      </transition>

      <div v-if="manageSnapshot.loadedAt" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="card hover:border-aa-muted transition-colors duration-200">
          <h3 class="text-sm font-bold text-white mb-5">{{ t('studioPanels.rotateVerifier', 'Rotate Verifier Plugin') }}</h3>
          <div class="space-y-4">
            <div>
              <label for="governance-verifier-hash" class="block text-xs font-semibold text-aa-muted mb-1">{{ t('studioPanels.verifierHash', 'Verifier Hash') }}</label>
              <input id="governance-verifier-hash" v-model="manageForm.verifierContract" type="text" class="input-field font-mono text-sm py-2 px-3 bg-aa-dark" :placeholder="t('studioPanels.hashPlaceholder', '0x...')" />
            </div>
            <div>
              <label for="governance-verifier-params" class="block text-xs font-semibold text-aa-muted mb-1">{{ t('studioPanels.verifierParamsHex', 'Verifier Params (hex)') }}</label>
              <textarea id="governance-verifier-params" v-model="manageForm.verifierParams" class="input-field font-mono text-xs py-2 px-3 bg-aa-dark min-h-24" :placeholder="t('studioPanels.manageVerifierParamsPlaceholder', 'Pubkey or verifier-specific config hex.')"></textarea>
            </div>
            <button type="button" :aria-label="t('studioPanels.ariaUpdateVerifier', 'Update verifier')" class="btn-primary w-full" :class="{ 'btn-loading': manageBusy.verifier }" :disabled="manageBusy.verifier || !canManageTarget" @click="updateVerifier">
              {{ manageBusy.verifier ? t('studioPanels.updating', 'Updating...') : t('studioPanels.updateVerifier', 'Update Verifier') }}
            </button>
          </div>
        </div>

        <div class="card hover:border-aa-muted transition-colors duration-200">
          <h3 class="text-sm font-bold text-white mb-5">{{ t('studioPanels.rotateHook', 'Rotate Hook Plugin') }}</h3>
          <div class="space-y-4">
            <div>
              <label for="governance-hook-hash" class="block text-xs font-semibold text-aa-muted mb-1">{{ t('studioPanels.hookHash', 'Hook Hash') }}</label>
              <input id="governance-hook-hash" v-model="manageForm.hookContract" type="text" class="input-field font-mono text-sm py-2 px-3 bg-aa-dark" :placeholder="t('studioPanels.hashPlaceholder', '0x...')" />
            </div>
            <button type="button" :aria-label="t('studioPanels.ariaUpdateHook', 'Update hook')" class="btn-primary w-full" :class="{ 'btn-loading': manageBusy.hook }" :disabled="manageBusy.hook || !canManageTarget" @click="updateHook">
              {{ manageBusy.hook ? t('studioPanels.updating', 'Updating...') : t('studioPanels.updateHook', 'Update Hook') }}
            </button>
            <p class="text-xs text-aa-muted">{{ t('studioPanels.hookPluginExamples', 'Examples: WhitelistHook, DailyLimitHook, NeoDIDCredentialHook, MultiHook.') }}</p>
          </div>
        </div>
      </div>

      <div v-if="manageSnapshot.loadedAt">
        <div class="card hover:border-aa-muted transition-colors duration-200">
          <h3 class="text-sm font-bold text-white mb-5">{{ t('studioPanels.escapeHatch', 'Escape Hatch') }}</h3>
          <div class="space-y-4">
            <div>
              <label for="governance-escape-verifier" class="block text-xs font-semibold text-aa-muted mb-1">{{ t('studioPanels.newVerifierAfterEscape', 'New Verifier After Escape') }}</label>
              <input id="governance-escape-verifier" v-model="manageForm.escapeNewVerifier" type="text" class="input-field font-mono text-sm py-2 px-3 bg-aa-dark" :placeholder="t('studioPanels.hashPlaceholder', '0x...')" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" :aria-label="t('studioPanels.ariaInitiateEscape', 'Initiate escape')" class="btn-warning w-full" :class="{ 'btn-loading': manageBusy.initiateEscape }" :disabled="manageBusy.initiateEscape || !canManageTarget" @click="confirmInitiateEscape">
                {{ manageBusy.initiateEscape ? t('studioPanels.starting', 'Starting...') : t('studioPanels.initiateEscape', 'Initiate Escape') }}
              </button>
              <button type="button" :aria-label="t('studioPanels.ariaFinalizeEscape', 'Finalize escape')" class="btn-primary w-full" :class="{ 'btn-loading': manageBusy.finalizeEscape }" :disabled="manageBusy.finalizeEscape || !canManageTarget" @click="confirmFinalizeEscape">
                {{ manageBusy.finalizeEscape ? t('studioPanels.finalizing', 'Finalizing...') : t('studioPanels.finalizeEscape', 'Finalize Escape') }}
              </button>
            </div>
            <p class="text-xs text-aa-muted">{{ t('studioPanels.escapeHint', 'Only the configured backup owner can operate the escape hatch.') }}</p>
          </div>
        </div>
      </div>

      <div v-if="manageSnapshot.loadedAt">
        <div class="card hover:border-aa-muted transition-colors duration-200">
          <h3 class="text-sm font-bold text-white mb-2">{{ t('studioPanels.metadataTitle', 'Account Metadata') }}</h3>
          <p class="text-xs text-aa-muted mb-5">{{ t('studioPanels.metadataSubtitle', 'Set a description, logo, and off-chain metadata URI for this account.') }}</p>
          <div class="space-y-4">
            <div>
              <label for="governance-metadata-uri" class="block text-xs font-semibold text-aa-muted mb-1">{{ t('studioPanels.metadataUriLabel', 'Metadata URI (on-chain, max 240 chars)') }}</label>
              <input id="governance-metadata-uri" v-model="metadataForm.metadataUri" type="text" class="input-field font-mono text-sm py-2 px-3 bg-aa-dark" :placeholder="t('studioPanels.metadataUriPlaceholder', 'https://example.com/metadata.json')" />
              <p class="mt-1 text-xs text-aa-muted">{{ metadataForm.metadataUri.length }} / 240 — {{ t('studioPanels.metadataUriHint', 'Points to a JSON file with extended account details.') }}</p>
            </div>
            <div>
              <label for="governance-description" class="block text-xs font-semibold text-aa-muted mb-1">{{ t('studioPanels.descriptionLabel', 'Description (off-chain, max 500 chars)') }}</label>
              <textarea id="governance-description" v-model="metadataForm.description" class="input-field font-mono text-sm py-2 px-3 bg-aa-dark min-h-20 resize-y" :placeholder="t('studioPanels.descriptionPlaceholder', 'A brief description of this account...')"></textarea>
              <p class="mt-1 text-xs text-aa-muted">{{ metadataForm.description.length }} / 500</p>
            </div>
            <div>
              <label for="governance-logo-url" class="block text-xs font-semibold text-aa-muted mb-1">{{ t('studioPanels.logoUrlLabel', 'Logo URL (off-chain, HTTPS only)') }}</label>
              <div class="flex items-center gap-3">
                <input id="governance-logo-url" v-model="metadataForm.logoUrl" type="text" class="input-field font-mono text-sm py-2 px-3 bg-aa-dark flex-1" :placeholder="t('studioPanels.logoUrlPlaceholder', 'https://example.com/logo.png')" />
                <img v-if="metadataForm.logoUrl" :src="metadataForm.logoUrl" :alt="t('studioPanels.logoPreview', 'Logo preview')" class="w-8 h-8 rounded border border-aa-border object-cover" @error="$event.target.style.display='none'" />
              </div>
              <div class="mt-2 flex items-center gap-2">
                <input ref="logoFileInput" type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
                <button type="button" :aria-label="t('studioPanels.ariaUploadLogo', 'Upload logo')" class="btn-secondary text-xs" :class="{ 'btn-loading': logoUploading }" :disabled="logoUploading" @click="$refs.logoFileInput.click()">
                  {{ logoUploading ? t('studioPanels.uploadingLogo', 'Uploading...') : t('studioPanels.uploadToNeoFS', 'Upload to NeoFS') }}
                </button>
                <span class="text-xs text-aa-muted">{{ t('studioPanels.uploadLogoHint', 'Upload an image to NeoFS and set the URL automatically.') }}</span>
              </div>
            </div>
            <button type="button" :aria-label="t('studioPanels.ariaSaveMetadata', 'Save metadata')" class="btn-primary w-full" :class="{ 'btn-loading': metadataBusy.save }" :disabled="metadataBusy.save || !canManageTarget" @click="saveMetadata">
              {{ metadataBusy.save ? t('studioPanels.savingMetadata', 'Saving...') : t('studioPanels.saveMetadata', 'Save Metadata') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Styled confirm modal -->
    <transition name="fade-in-up">
      <div ref="confirmOverlayRef" v-if="confirmModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="governance-dialog-title" @click.self="confirmModal = null" @keydown.escape="confirmModal = null" tabindex="-1">
        <div class="modal-panel">
          <h3 id="governance-dialog-title" class="text-lg font-bold font-outfit text-white mb-2">{{ confirmModal.title }}</h3>
          <p class="text-sm text-aa-muted mb-6">{{ confirmModal.message }}</p>
          <div class="flex gap-3 justify-end">
            <button class="btn-ghost" @click="confirmModal = null">{{ t('studioPanels.cancel', 'Cancel') }}</button>
            <button :class="confirmModal.danger ? 'btn-danger' : 'btn-primary'" @click="confirmModal.onConfirm(); confirmModal = null">{{ confirmModal.confirmLabel }}</button>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { inject, nextTick, ref, watch } from 'vue';
import { useI18n } from '@/i18n';
import { useToast } from 'vue-toastification';
import { uploadToNeoFS } from '@/utils/neofsUpload.js';
import { useClipboard } from '@/composables/useClipboard';
import { translateError } from '@/config/errorCodes.js';

const { t } = useI18n();
const toast = useToast();
const { copiedKey, markCopied, copyText } = useClipboard();

const logoFileInput = ref(null);
const logoUploading = ref(false);
const confirmModal = ref(null);
const confirmOverlayRef = ref(null);

watch(confirmModal, (value) => {
  if (value) {
    nextTick(() => confirmOverlayRef.value?.focus());
  }
});

async function handleLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  logoUploading.value = true;
  try {
    const url = await uploadToNeoFS(file);
    metadataForm.logoUrl = url;
  } catch (err) {
    toast.error(translateError(err?.message, t));
  } finally {
    logoUploading.value = false;
    if (logoFileInput.value) logoFileInput.value.value = '';
  }
}

const studio = inject('studio');
const {
  manageForm,
  manageBusy,
  manageSnapshot,
  metadataForm,
  metadataBusy,
  canManageTarget,
  autoLoadedAccounts,
  loadAccountConfiguration,
  updateVerifier,
  updateHook,
  initiateEscape,
  finalizeEscape,
  saveMetadata,
} = studio;

function confirmInitiateEscape() {
  confirmModal.value = {
    title: t('studioPanels.initiateEscapeTitle', 'Initiate Escape Hatch'),
    message: t('studioPanels.confirmInitiateEscape', 'This will start the escape hatch countdown. The current verifier will be replaced after the timelock expires. Continue?'),
    confirmLabel: t('studioPanels.initiateEscape', 'Initiate Escape'),
    danger: false,
    onConfirm: initiateEscape,
  };
}

function confirmFinalizeEscape() {
  confirmModal.value = {
    title: t('studioPanels.finalizeEscapeTitle', 'Finalize Escape Hatch'),
    message: t('studioPanels.confirmFinalizeEscape', 'This will finalize the escape hatch and permanently replace the current verifier. This action cannot be undone. Continue?'),
    confirmLabel: t('studioPanels.finalizeEscape', 'Finalize Escape'),
    danger: true,
    onConfirm: finalizeEscape,
  };
}
</script>
