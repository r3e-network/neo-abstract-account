<template>
  <section class="glass-panel p-6">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-white">{{ t('security.title', 'Security Dashboard') }}</h2>
        <p class="text-sm text-aa-muted">{{ t('security.subtitle', 'Overview of account security state, active policies, and recovery settings.') }}</p>
      </div>
      <span v-if="accountLoaded" class="badge" :class="overallSecurityLevel.badgeClass">
        <span class="w-1.5 h-1.5 rounded-full" :class="overallSecurityLevel.dotClass"></span>
        {{ overallSecurityLevel.label }}
      </span>
    </div>

    <!-- Empty state when no account is loaded -->
    <div v-if="!accountLoaded" class="empty-state">
      <div class="mx-auto w-12 h-12 rounded-full bg-aa-panel/30 flex items-center justify-center mb-3">
        <svg aria-hidden="true" class="w-6 h-6 text-aa-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
      </div>
      <p class="text-sm text-aa-text font-medium mb-1">{{ t('security.noAccountLoaded', 'No account loaded') }}</p>
      <p class="text-xs text-aa-muted">{{ t('security.loadAccountForSecurity', 'Load an account to view its security dashboard.') }}</p>
    </div>

    <!-- Security overview when account is loaded -->
    <template v-else>
      <!-- Overall Security Score -->
      <div class="mb-6 rounded-lg border border-aa-border bg-gradient-to-br from-aa-panel/80 to-aa-dark/60 p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <p class="text-xs font-bold uppercase tracking-widest text-aa-muted mb-2">{{ t('security.overallScore', 'Overall Security Score') }}</p>
            <div class="flex items-center gap-4">
              <div class="relative w-20 h-20">
                <svg class="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    class="text-aa-border"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    :stroke-dasharray="`${securityScorePercentage} 100`"
                    :class="overallSecurityLevel.circleClass"
                  />
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-lg font-bold" :class="overallSecurityLevel.scoreTextClass">
                  {{ securityScore }}/3
                </span>
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-aa-text">{{ overallSecurityLevel.description }}</p>
                <p class="mt-1 text-xs text-aa-muted">{{ overallSecurityLevel.hint }}</p>
              </div>
            </div>
          </div>
          <router-link :to="{ path: '/docs', query: { doc: 'securityGuide' } }" class="btn-secondary btn-xs whitespace-nowrap">
            {{ t('security.viewSecurityGuide', 'View Guide') }}
          </router-link>
        </div>
      </div>

      <!-- Security Status Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Verifier Status -->
        <div class="rounded-lg border bg-aa-panel/50 p-4" :class="verifierStatus.borderClass">
          <div class="flex items-center gap-2 mb-2">
            <svg aria-hidden="true" class="w-5 h-5" :class="verifierStatus.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            <span class="text-xs font-bold uppercase tracking-wider" :class="verifierStatus.labelClass">{{ t('security.verifierStatus', 'Verifier') }}</span>
          </div>
          <p class="font-semibold text-sm text-aa-text truncate" :title="accountState.verifier">
            {{ verifierStatus.displayValue }}
          </p>
          <p class="mt-1 text-xs" :class="verifierStatus.descriptionClass">{{ verifierStatus.description }}</p>
        </div>

        <!-- Hook Status -->
        <div class="rounded-lg border bg-aa-panel/50 p-4" :class="hookStatus.borderClass">
          <div class="flex items-center gap-2 mb-2">
            <svg aria-hidden="true" class="w-5 h-5" :class="hookStatus.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
            </svg>
            <span class="text-xs font-bold uppercase tracking-wider" :class="hookStatus.labelClass">{{ t('security.hookStatus', 'Hook') }}</span>
          </div>
          <p class="font-semibold text-sm text-aa-text truncate" :title="accountState.hook">
            {{ hookStatus.displayValue }}
          </p>
          <p class="mt-1 text-xs" :class="hookStatus.descriptionClass">{{ hookStatus.description }}</p>
        </div>

        <!-- Backup Owner Status -->
        <div class="rounded-lg border bg-aa-panel/50 p-4" :class="backupStatus.borderClass">
          <div class="flex items-center gap-2 mb-2">
            <svg aria-hidden="true" class="w-5 h-5" :class="backupStatus.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <span class="text-xs font-bold uppercase tracking-wider" :class="backupStatus.labelClass">{{ t('security.backupOwner', 'Backup Owner') }}</span>
          </div>
          <p class="font-semibold text-sm text-aa-text truncate" :title="accountState.backupOwner">
            {{ backupStatus.displayValue }}
          </p>
          <p class="mt-1 text-xs" :class="backupStatus.descriptionClass">{{ backupStatus.description }}</p>
        </div>

        <!-- Escape Hatch Status -->
        <div class="rounded-lg border bg-aa-panel/50 p-4" :class="escapeStatus.borderClass">
          <div class="flex items-center gap-2 mb-2">
            <svg aria-hidden="true" class="w-5 h-5" :class="escapeStatus.iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-xs font-bold uppercase tracking-wider" :class="escapeStatus.labelClass">{{ t('security.escapeHatch', 'Escape Hatch') }}</span>
          </div>
          <p class="font-semibold text-sm text-aa-text">{{ escapeStatus.displayValue }}</p>
          <p class="mt-1 text-xs" :class="escapeStatus.descriptionClass">{{ escapeStatus.description }}</p>
        </div>
      </div>

      <!-- Active Policies Section -->
      <div v-if="activePolicies.length > 0" class="mb-6 rounded-lg border border-aa-border bg-aa-panel/60 p-5">
        <p class="text-xs font-bold uppercase tracking-widest text-aa-muted mb-3">{{ t('security.activePolicies', 'Active Policies') }}</p>
        <div class="space-y-3">
          <div v-for="policy in activePolicies" :key="policy.id" class="flex items-start gap-3 rounded-lg bg-aa-dark/40 p-3">
            <span class="badge shrink-0" :class="policy.badgeClass">
              {{ policy.badgeText }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-aa-text truncate">{{ policy.title }}</p>
              <p class="text-xs text-aa-muted mt-0.5">{{ policy.description }}</p>
            </div>
            <span class="text-xs font-mono text-aa-muted shrink-0">{{ policy.value || '' }}</span>
          </div>
        </div>
      </div>

      <!-- Pending Updates Section -->
      <div v-if="pendingUpdates.length > 0" class="mb-6 rounded-lg border border-aa-warning/30 bg-aa-warning/5 p-5">
        <div class="flex items-center gap-2 mb-3">
          <svg aria-hidden="true" class="w-5 h-5 text-aa-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs font-bold uppercase tracking-widest text-aa-warning">{{ t('security.pendingUpdates', 'Pending Updates') }}</p>
        </div>
        <div class="space-y-3">
          <div v-for="update in pendingUpdates" :key="update.id" class="flex items-start gap-3 rounded-lg bg-aa-dark/40 p-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-aa-text">{{ update.title }}</p>
              <p class="text-xs text-aa-muted mt-0.5">{{ update.description }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-mono" :class="update.timeRemainingClass">{{ update.timeRemaining }}</p>
              <button
                v-if="update.canCancel"
                class="mt-1 text-xs text-aa-warning hover:text-aa-warning-light transition-colors duration-200"
                @click="$emit('cancel-pending-update', update.id)"
              >
                {{ t('security.cancelUpdate', 'Cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Session Keys Section (for SessionKeyVerifier) -->
      <div v-if="sessionKeys.length > 0" class="rounded-lg border border-aa-border bg-aa-panel/60 p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <svg aria-hidden="true" class="w-5 h-5 text-aa-info-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
            </svg>
            <p class="text-xs font-bold uppercase tracking-widest text-aa-muted">{{ t('security.sessionKeys', 'Session Keys') }}</p>
          </div>
          <span class="text-xs text-aa-muted">{{ sessionKeys.length }} {{ t('security.active', 'active') }}</span>
        </div>
        <div class="space-y-2">
          <div v-for="key in sessionKeys" :key="key.id" class="flex items-center gap-3 rounded-lg bg-aa-dark/40 px-3 py-2.5">
            <div class="w-8 h-8 rounded-full bg-aa-panel/50 flex items-center justify-center">
              <svg aria-hidden="true" class="w-4 h-4 text-aa-info-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-aa-text truncate">{{ key.label }}</p>
              <p class="text-xs text-aa-muted">{{ key.target }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-mono text-aa-muted">{{ key.expiresAt }}</p>
              <button
                v-if="key.canRevoke"
                class="mt-0.5 text-xs text-aa-error hover:text-aa-error-light transition-colors duration-200"
                @click="$emit('revoke-session-key', key.id)"
              >
                {{ t('security.revoke', 'Revoke') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Security Recommendations -->
      <div v-if="recommendations.length > 0" class="mt-6 rounded-lg border border-aa-border bg-aa-panel/60 p-5">
        <div class="flex items-center gap-2 mb-3">
          <svg aria-hidden="true" class="w-5 h-5 text-aa-info-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs font-bold uppercase tracking-widest text-aa-muted">{{ t('security.recommendations', 'Recommendations') }}</p>
        </div>
        <div class="space-y-2">
          <div v-for="rec in recommendations" :key="rec.id" class="flex items-start gap-3 rounded-lg bg-aa-dark/30 px-4 py-3">
            <span class="mt-0.5" :class="rec.iconClass">
              <svg v-if="rec.type === 'warning'" aria-hidden="true" class="w-4 h-4 text-aa-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <svg v-else-if="rec.type === 'info'" aria-hidden="true" class="w-4 h-4 text-aa-info-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <svg v-else aria-hidden="true" class="w-4 h-4 text-aa-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </span>
            <div class="flex-1">
              <p class="text-sm font-medium text-aa-text">{{ rec.title }}</p>
              <p class="text-xs text-aa-muted mt-0.5">{{ rec.description }}</p>
            </div>
            <router-link
              v-if="rec.docLink"
              :to="{ path: '/docs', query: { doc: rec.docLink } }"
              class="btn-ghost btn-xs shrink-0"
            >
              {{ t('security.learnMore', 'Learn More') }}
            </router-link>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const props = defineProps({
  accountLoaded: { type: Boolean, default: false },
  accountState: {
    type: Object,
    default: () => ({
      accountId: '',
      verifier: '',
      hook: '',
      backupOwner: '',
      escapeTimelock: 0,
      escapeActive: false,
      escapeTriggeredAt: '',
      verifierType: '',
      hookType: '',
    }),
  },
  activePolicies: { type: Array, default: () => [] },
  pendingUpdates: { type: Array, default: () => [] },
  sessionKeys: { type: Array, default: () => [] },
});

defineEmits(['cancel-pending-update', 'revoke-session-key']);

// Overall security score calculation
const securityScore = computed(() => {
  let score = 0;
  if (props.accountState.verifier && props.accountState.verifier !== '0x') score++;
  if (props.accountState.hook && props.accountState.hook !== '0x') score++;
  if (props.accountState.backupOwner && props.accountState.backupOwner !== '0x') score++;
  return score;
});

const securityScorePercentage = computed(() => (securityScore.value / 3) * 100);

const overallSecurityLevel = computed(() => {
  if (securityScore.value === 3) {
    return {
      label: t('security.secure', 'Secure'),
      badgeClass: 'badge-green',
      dotClass: 'bg-aa-success animate-pulse',
      circleClass: 'text-aa-success',
      scoreTextClass: 'text-aa-success',
      description: t('security.secureDesc', 'All security features are configured'),
      hint: t('security.secureHint', 'Your account has full protection'),
    };
  }
  if (securityScore.value === 2) {
    return {
      label: t('security.good', 'Good'),
      badgeClass: 'badge-blue',
      dotClass: 'bg-aa-info',
      circleClass: 'text-aa-info',
      scoreTextClass: 'text-aa-info',
      description: t('security.goodDesc', 'Most security features are configured'),
      hint: t('security.goodHint', 'Consider adding backup owner'),
    };
  }
  return {
    label: t('security.basic', 'Basic'),
    badgeClass: 'badge-orange',
    dotClass: 'bg-aa-warning',
    circleClass: 'text-aa-warning',
    scoreTextClass: 'text-aa-warning',
    description: t('security.basicDesc', 'Basic protection only'),
    hint: t('security.basicHint', 'Add verifier, hook, and backup owner'),
  };
});

// Verifier status
const verifierStatus = computed(() => {
  if (!props.accountState.verifier || props.accountState.verifier === '0x') {
    return {
      displayValue: t('security.notSet', 'Not Set'),
      description: t('security.verifierNotSetDesc', 'No verifier configured'),
      borderClass: 'border-aa-error/30',
      iconClass: 'text-aa-error',
      labelClass: 'text-aa-error',
      descriptionClass: 'text-aa-error',
    };
  }
  return {
    displayValue: formatHash(props.accountState.verifier),
    description: props.accountState.verifierType || t('security.customVerifier', 'Custom Verifier'),
    borderClass: 'border-aa-success/30',
    iconClass: 'text-aa-success',
    labelClass: 'text-aa-success',
    descriptionClass: 'text-aa-muted',
  };
});

// Hook status
const hookStatus = computed(() => {
  if (!props.accountState.hook || props.accountState.hook === '0x') {
    return {
      displayValue: t('security.notSet', 'Not Set'),
      description: t('security.hookNotSetDesc', 'No hook configured'),
      borderClass: 'border-aa-error/30',
      iconClass: 'text-aa-error',
      labelClass: 'text-aa-error',
      descriptionClass: 'text-aa-error',
    };
  }
  return {
    displayValue: formatHash(props.accountState.hook),
    description: props.accountState.hookType || t('security.customHook', 'Custom Hook'),
    borderClass: 'border-aa-success/30',
    iconClass: 'text-aa-success',
    labelClass: 'text-aa-success',
    descriptionClass: 'text-aa-muted',
  };
});

// Backup owner status
const backupStatus = computed(() => {
  if (!props.accountState.backupOwner || props.accountState.backupOwner === '0x') {
    return {
      displayValue: t('security.notSet', 'Not Set'),
      description: t('security.backupNotSetDesc', 'No recovery configured'),
      borderClass: 'border-aa-error/30',
      iconClass: 'text-aa-error',
      labelClass: 'text-aa-error',
      descriptionClass: 'text-aa-error',
    };
  }
  return {
    displayValue: formatHash(props.accountState.backupOwner),
    description: t('security.backupSetDesc', 'Recovery is available'),
    borderClass: 'border-aa-success/30',
    iconClass: 'text-aa-success',
    labelClass: 'text-aa-success',
    descriptionClass: 'text-aa-success',
  };
});

// Escape hatch status
const escapeStatus = computed(() => {
  if (!props.accountState.escapeTimelock || props.accountState.escapeTimelock === 0) {
    return {
      displayValue: t('security.disabled', 'Disabled'),
      description: t('security.escapeDisabledDesc', 'No escape timelock'),
      borderClass: 'border-aa-error/30',
      iconClass: 'text-aa-error',
      labelClass: 'text-aa-error',
      descriptionClass: 'text-aa-error',
    };
  }
  if (props.accountState.escapeActive) {
    return {
      displayValue: t('security.escapeActive', 'Active'),
      description: `${t('security.since')} ${formatTime(props.accountState.escapeTriggeredAt)}`,
      borderClass: 'border-aa-warning/30',
      iconClass: 'text-aa-warning',
      labelClass: 'text-aa-warning',
      descriptionClass: 'text-aa-warning',
      timeRemainingClass: 'text-aa-warning',
    };
  }
  return {
    displayValue: `${props.accountState.escapeTimelock}s`,
    description: t('security.escapeReadyDesc', 'Recovery is ready'),
    borderClass: 'border-aa-success/30',
    iconClass: 'text-aa-success',
    labelClass: 'text-aa-success',
    descriptionClass: 'text-aa-muted',
    timeRemainingClass: 'text-aa-muted',
  };
});

// Recommendations based on current state
const recommendations = computed(() => {
  const recs = [];

  if (!props.accountState.backupOwner || props.accountState.backupOwner === '0x') {
    recs.push({
      id: 'backup-owner',
      type: 'warning',
      title: t('security.recBackupOwnerTitle', 'Set a Backup Owner'),
      description: t('security.recBackupOwnerDesc', 'Without a backup owner, you cannot recover your account if you lose access to your primary key.'),
      docLink: 'recoveryGuide',
    });
  }

  if (!props.accountState.hook || props.accountState.hook === '0x') {
    recs.push({
      id: 'hook-policy',
      type: 'info',
      title: t('security.recHookPolicyTitle', 'Add a Hook Policy'),
      description: t('security.recHookPolicyDesc', 'Hook policies can add whitelist restrictions, daily limits, and other security controls.'),
      docLink: 'hookGuide',
    });
  }

  if (props.accountState.escapeTimelock === 0) {
    recs.push({
      id: 'escape-timelock',
      type: 'warning',
      title: t('security.recEscapeTimelockTitle', 'Configure Escape Timelock'),
      description: t('security.recEscapeTimelockDesc', 'Set a timelock period for backup owner recovery to prevent instant unauthorized access.'),
      docLink: 'recoveryGuide',
    });
  }

  return recs;
});

function formatHash(hash) {
  if (!hash) return t('security.notSet', 'Not Set');
  const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
  if (clean.length <= 10) return `0x${clean}`;
  return `0x${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>
