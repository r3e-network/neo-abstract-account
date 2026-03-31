<template>
  <section class="glass-panel p-6">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">{{ t('recovery.title', 'Account Recovery') }}</h2>
        <p class="text-sm text-aa-muted">{{ t('recovery.subtitle', 'Recover access to your account using the backup owner escape hatch.') }}</p>
      </div>
    </div>

    <!-- Step indicator -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div v-for="(step, idx) in steps" :key="step.id" class="flex-1 flex items-center">
          <div class="flex flex-col items-center w-full">
            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200" :class="getStepClass(idx)">
              <span v-if="idx < currentStep" class="text-aa-dark">
                <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
              <span v-else class="text-sm font-bold">{{ idx + 1 }}</span>
            </div>
            <p class="mt-2 text-xs font-medium text-center" :class="getStepLabelClass(idx)">{{ step.label }}</p>
          </div>
          <div v-if="idx < steps.length - 1" class="flex-1 h-1 transition-all duration-200" :class="getConnectorClass(idx)"></div>
        </div>
      </div>
    </div>

    <!-- Step 1: Verify Backup Owner -->
    <div v-if="currentStep === 0" class="max-w-2xl mx-auto">
      <div class="rounded-xl border border-aa-border bg-aa-panel/60 p-6">
        <div class="flex items-start gap-4 mb-5">
          <div class="w-12 h-12 rounded-full bg-neo-500/20 flex items-center justify-center">
            <svg aria-hidden="true" class="w-6 h-6 text-neo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-2">{{ t('recovery.step1Title', 'Verify Backup Owner') }}</h3>
            <p class="text-sm text-aa-muted mb-4">{{ t('recovery.step1Desc', 'Connect as the backup owner to initiate recovery. Only the configured backup owner can operate the escape hatch.') }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label for="backup-owner-address" class="block text-sm font-medium text-aa-text mb-2">{{ t('recovery.backupOwnerAddress', 'Backup Owner Address') }}</label>
            <input
              id="backup-owner-address"
              v-model="backupOwnerAddress"
              type="text"
              class="input-field font-mono"
              :placeholder="t('recovery.backupOwnerPlaceholder', 'N... or 0x...')"
              @input="validateBackupOwner"
            />
            <p v-if="backupOwnerError" role="alert" class="text-xs text-aa-error mt-1">{{ backupOwnerError }}</p>
            <p v-else-if="backupOwnerAddress && !backupOwnerError" class="text-xs text-aa-success mt-1">
              <svg aria-hidden="true" class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              {{ t('recovery.backupOwnerVerified', 'Backup owner verified') }}
            </p>
          </div>

          <div class="rounded-lg border border-aa-warning/30 bg-aa-warning/5 p-4">
            <div class="flex items-start gap-3">
              <svg aria-hidden="true" class="w-5 h-5 text-aa-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-sm font-semibold text-aa-warning mb-1">{{ t('recovery.important', 'Important') }}</p>
                <p class="text-xs text-aa-warning-light">{{ t('recovery.backupOwnerRole', 'The backup owner has the power to take control of your account after the escape timelock expires. Only assign this role to addresses you fully trust.') }}</p>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              class="btn-primary"
              :class="{ 'btn-loading': verifying }"
              :disabled="!canProceedToStep1 || verifying"
              @click="proceedToStep2"
            >
              {{ verifying ? t('recovery.verifying', 'Verifying…') : t('recovery.continue', 'Continue') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Initiate Escape -->
    <div v-if="currentStep === 1" class="max-w-2xl mx-auto">
      <div class="rounded-xl border border-aa-border bg-aa-panel/60 p-6">
        <div class="flex items-start gap-4 mb-5">
          <div class="w-12 h-12 rounded-full bg-aa-warning/20 flex items-center justify-center">
            <svg aria-hidden="true" class="w-6 h-6 text-aa-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-2">{{ t('recovery.step2Title', 'Initiate Escape Hatch') }}</h3>
            <p class="text-sm text-aa-muted mb-4">{{ t('recovery.step2Desc', 'Start the escape hatch countdown. You must wait for the timelock period to expire before finalizing recovery.') }}</p>
          </div>
        </div>

        <div class="mb-5 rounded-lg border border-aa-border bg-aa-dark/40 p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-aa-muted mb-3">{{ t('recovery.escapeConfig', 'Escape Configuration') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="escape-timelock" class="block text-xs font-medium text-aa-text mb-1">{{ t('recovery.timelockDuration', 'Timelock Duration') }}</label>
              <p class="text-sm font-mono text-aa-text">{{ escapeTimelock }} {{ t('recovery.seconds', 'seconds') }}</p>
            </div>
            <div>
              <label for="new-verifier" class="block text-xs font-medium text-aa-text mb-1">{{ t('recovery.newVerifier', 'New Verifier') }}</label>
              <p class="text-sm font-mono text-aa-text truncate" :title="newVerifier">{{ formatHash(newVerifier) }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-aa-warning/30 bg-aa-warning/5 p-4 mb-5">
          <div class="flex items-start gap-3">
            <svg aria-hidden="true" class="w-5 h-5 text-aa-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="text-sm font-semibold text-aa-warning mb-2">{{ t('recovery.whatHappensDuringEscape', 'What happens during escape:') }}</p>
              <ul class="text-xs text-aa-warning-light space-y-1">
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.escapeEffect1', 'Current signer access is suspended') }}
                </li>
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.escapeEffect2', 'Pending operations can be cancelled') }}
                </li>
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.escapeEffect3', 'Account is put in recovery mode') }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="currentStep--">
            {{ t('recovery.back', 'Back') }}
          </button>
          <button
            class="btn-primary"
            :class="{ 'btn-loading': initiating }"
            :disabled="initiating"
            @click="proceedToStep3"
          >
            {{ initiating ? t('recovery.initiating', 'Initiating…') : t('recovery.initiateEscape', 'Initiate Escape') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: Wait for Timelock -->
    <div v-if="currentStep === 2" class="max-w-2xl mx-auto">
      <div class="rounded-xl border-2 border-aa-warning/50 bg-aa-warning/5 p-6">
        <div class="flex items-start gap-4 mb-5">
          <div class="w-12 h-12 rounded-full bg-aa-warning/20 flex items-center justify-center">
            <svg aria-hidden="true" class="w-6 h-6 text-aa-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-2">{{ t('recovery.step3Title', 'Wait for Timelock') }}</h3>
            <p class="text-sm text-aa-muted mb-4">{{ t('recovery.step3Desc', 'The escape hatch must wait for the timelock period to expire before recovery can be finalized.') }}</p>
          </div>
        </div>

        <!-- Countdown display -->
        <div class="mb-5 rounded-lg border border-aa-border bg-aa-dark/60 p-6 text-center">
          <p class="text-xs font-bold uppercase tracking-widest text-aa-muted mb-3">{{ t('recovery.timeRemaining', 'Time Remaining') }}</p>
          <div class="flex items-center justify-center gap-2 mb-4">
            <span class="text-5xl font-bold font-mono text-aa-warning">{{ formattedTimeRemaining }}</span>
          </div>
          <div class="relative h-2 rounded-full bg-aa-border max-w-md mx-auto">
            <div
              class="absolute left-0 top-0 h-2 rounded-full bg-aa-warning transition-all duration-1000"
              :style="{ width: timelockProgress + '%' }"
            ></div>
          </div>
        </div>

        <div class="rounded-lg border border-aa-border bg-aa-panel/50 p-4 mb-5">
          <div class="flex items-start gap-3">
            <svg aria-hidden="true" class="w-5 h-5 text-aa-info-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="text-sm font-semibold text-aa-info-light mb-1">{{ t('recovery.duringTimelock', 'During this time:') }}</p>
              <ul class="text-xs text-aa-muted space-y-1">
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5 text-aa-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.timelockEffect1', 'Account state is visible but frozen') }}
                </li>
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5 text-aa-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.timelockEffect2', 'New operations cannot be staged') }}
                </li>
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5 text-aa-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.timelockEffect3', 'You can cancel the escape anytime') }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <button
            class="btn-danger"
            :class="{ 'btn-loading': cancelling }"
            :disabled="cancelling"
            @click="cancelEscape"
          >
            {{ cancelling ? t('recovery.canceling', 'Canceling…') : t('recovery.cancelEscape', 'Cancel Escape') }}
          </button>
          <button
            v-if="timelockExpired"
            class="btn-primary"
            :class="{ 'btn-loading': finalizing }"
            :disabled="!timelockExpired || finalizing"
            @click="proceedToStep4"
          >
            {{ finalizing ? t('recovery.finalizing', 'Finalizing…') : t('recovery.finalizeRecovery', 'Finalize Recovery') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 4: Finalize Recovery -->
    <div v-if="currentStep === 3" class="max-w-2xl mx-auto">
      <div class="rounded-xl border-2 border-aa-success/30 bg-aa-success/5 p-6">
        <div class="flex items-start gap-4 mb-5">
          <div class="w-12 h-12 rounded-full bg-aa-success/20 flex items-center justify-center">
            <svg aria-hidden="true" class="w-6 h-6 text-aa-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-2">{{ t('recovery.step4Title', 'Finalize Recovery') }}</h3>
            <p class="text-sm text-aa-muted mb-4">{{ t('recovery.step4Desc', 'Timelock has expired. Finalize the recovery to take full control of the account.') }}</p>
          </div>
        </div>

        <div class="mb-5 rounded-lg border border-aa-success/30 bg-aa-success/10 p-4">
          <div class="flex items-start gap-3">
            <svg aria-hidden="true" class="w-5 h-5 text-aa-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="text-sm font-semibold text-aa-success mb-1">{{ t('recovery.finalizeSummary', 'Recovery will:') }}</p>
              <ul class="text-xs text-aa-success-light space-y-1">
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.finalizeEffect1', 'Replace current verifier with backup owner') }}
                </li>
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.finalizeEffect2', 'Unfreeze the account for normal operation') }}
                </li>
                <li class="flex items-start gap-2">
                  <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  {{ t('recovery.finalizeEffect3', 'This action cannot be undone') }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="currentStep--">
            {{ t('recovery.back', 'Back') }}
          </button>
          <button
            class="btn-primary"
            :class="{ 'btn-loading': finalizing }"
            :disabled="finalizing"
            @click="finalizeRecovery"
          >
            {{ finalizing ? t('recovery.finalizing', 'Finalizing…') : t('recovery.confirmFinalize', 'Confirm Finalize') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Recovery Complete -->
    <div v-if="currentStep === 4" class="max-w-2xl mx-auto">
      <div class="rounded-xl border-2 border-aa-success/50 bg-aa-success/10 p-8 text-center">
        <div class="mx-auto w-16 h-16 rounded-full bg-aa-success/20 flex items-center justify-center mb-4">
          <svg aria-hidden="true" class="w-8 h-8 text-aa-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-white mb-2">{{ t('recovery.completeTitle', 'Recovery Complete') }}</h3>
        <p class="text-sm text-aa-muted mb-6">{{ t('recovery.completeDesc', 'Your account has been successfully recovered. You now have full control as the backup owner.') }}</p>
        <div class="space-y-3">
          <router-link to="/app" class="btn-primary w-full">
            {{ t('recovery.openAccount', 'Open Account') }}
          </router-link>
          <router-link :to="{ path: '/docs', query: { doc: 'recoveryGuide' } }" class="btn-secondary w-full">
            {{ t('recovery.viewRecoveryGuide', 'View Recovery Guide') }}
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@/i18n';
import { sanitizeHex } from '@/utils/hex.js';

const { t } = useI18n();

const props = defineProps({
  accountLoaded: { type: Boolean, default: false },
  escapeTimelock: { type: Number, default: 86400 },
  newVerifier: { type: String, default: '' },
  currentEscapeState: {
    type: Object,
    default: () => ({
      active: false,
      triggeredAt: null,
      totalTime: 86400,
      elapsedTime: 0,
    }),
  },
});

const emit = defineEmits(['initiate-escape', 'cancel-escape', 'finalize-escape']);

const currentStep = ref(0);
const backupOwnerAddress = ref('');
const backupOwnerError = ref('');
const verifying = ref(false);
const initiating = ref(false);
const cancelling = ref(false);
const finalizing = ref(false);

// Recovery steps
const steps = computed(() => [
  { id: 'verify', label: t('recovery.verifyStep', 'Verify') },
  { id: 'initiate', label: t('recovery.initiateStep', 'Initiate') },
  { id: 'wait', label: t('recovery.waitStep', 'Wait') },
  { id: 'finalize', label: t('recovery.finalizeStep', 'Finalize') },
]);

// Validation
const canProceedToStep1 = computed(() => {
  return backupOwnerAddress.value.trim().length > 0 && !backupOwnerError.value;
});

// Timelock countdown
const timeRemaining = computed(() => {
  if (!props.currentEscapeState.active) return props.escapeTimelock;
  const elapsed = props.currentEscapeState.elapsedTime || 0;
  const total = props.currentEscapeState.totalTime || props.escapeTimelock;
  return Math.max(0, total - elapsed);
});

const formattedTimeRemaining = computed(() => {
  const seconds = timeRemaining.value;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
});

const timelockExpired = computed(() => {
  return timeRemaining.value <= 0;
});

const timelockProgress = computed(() => {
  const total = props.currentEscapeState.totalTime || props.escapeTimelock;
  const elapsed = props.currentEscapeState.elapsedTime || 0;
  return Math.min(100, (elapsed / total) * 100);
});

// Auto-advance to waiting step if escape is already active
onMounted(() => {
  if (props.currentEscapeState.active) {
    currentStep.value = 2; // Skip to waiting step
  }
});

let countdownInterval = null;

onMounted(() => {
  countdownInterval = setInterval(() => {
    // Update countdown - parent component should emit updates
    // In real implementation, this would trigger reactivity
  }, 1000);
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

function validateBackupOwner() {
  const addr = backupOwnerAddress.value.trim();
  if (!addr) {
    backupOwnerError.value = '';
    return;
  }
  if (addr.startsWith('N') && addr.length !== 34) {
    backupOwnerError.value = t('recovery.invalidNeoAddress', 'Invalid Neo address');
    return;
  }
  if (addr.startsWith('0x') && addr.length !== 42) {
    backupOwnerError.value = t('recovery.invalidEvmAddress', 'Invalid EVM address');
    return;
  }
  backupOwnerError.value = '';
}

function proceedToStep2() {
  verifying.value = true;
  setTimeout(() => {
    verifying.value = false;
    currentStep.value = 1;
  }, 1000);
}

function proceedToStep3() {
  initiating.value = true;
  emit('initiate-escape');
  setTimeout(() => {
    initiating.value = false;
    currentStep.value = 2;
  }, 2000);
}

function proceedToStep4() {
  currentStep.value = 3;
}

function cancelEscape() {
  cancelling.value = true;
  emit('cancel-escape');
  setTimeout(() => {
    cancelling.value = false;
    currentStep.value = 1; // Go back to initiate step
  }, 1000);
}

function finalizeRecovery() {
  finalizing.value = true;
  emit('finalize-escape');
  setTimeout(() => {
    finalizing.value = false;
    currentStep.value = 4; // Success state
  }, 2000);
}

function getStepClass(idx) {
  if (idx < currentStep.value) {
    return 'bg-aa-success text-aa-success';
  }
  if (idx === currentStep.value) {
    return 'bg-aa-orange text-aa-orange ring-2 ring-aa-orange ring-offset-2 ring-offset-aa-dark';
  }
  return 'bg-aa-panel text-aa-muted';
}

function getStepLabelClass(idx) {
  if (idx < currentStep.value) return 'text-aa-success';
  if (idx === currentStep.value) return 'text-aa-orange';
  return 'text-aa-muted';
}

function getConnectorClass(idx) {
  if (idx < currentStep.value - 1) {
    return 'bg-aa-success';
  }
  if (idx === currentStep.value - 1) {
    return 'bg-aa-orange';
  }
  return 'bg-aa-border';
}

function formatHash(hash) {
  if (!hash) return t('recovery.unknown', 'Unknown');
  const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
  if (clean.length <= 10) return `0x${clean}`;
  return `0x${clean.slice(0, 6)}…${clean.slice(-4)}`;
}
</script>
