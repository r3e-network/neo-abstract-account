<template>
  <aside class="rounded-lg border border-biconomy-border bg-biconomy-panel/60 p-6 shadow-2xl backdrop-blur-xl">
    <div class="mb-5 flex items-center justify-between">
      <h2 class="text-lg font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-biconomy-orange animate-pulse"></span>
        {{ t('operations.activitySidebarTitle', 'Draft Activity') }}
      </h2>
      <span class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
        :class="shareStatus === 'draft' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-biconomy-orange/20 text-biconomy-orange border border-biconomy-orange/30'"
      >
        {{ shareStatus || 'local' }}
      </span>
    </div>

    <div class="space-y-3 text-sm">
      <details class="group rounded-lg border border-biconomy-border bg-biconomy-dark/30" open>
        <summary class="flex items-center gap-3 px-4 py-3 cursor-pointer list-none font-semibold text-biconomy-text hover:text-white transition-colors">
          <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          Share Links
          <svg class="w-4 h-4 ml-auto text-biconomy-muted group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </summary>
        <div class="px-4 pb-4 space-y-3">
          <div class="rounded bg-slate-800/50 p-3">
            <p class="text-xs font-medium text-biconomy-muted mb-1">Draft ID</p>
            <p class="font-mono text-xs text-white truncate">{{ draftId || 'Not persisted yet' }}</p>
          </div>
          <div class="rounded bg-slate-800/50 p-3">
            <p class="text-xs font-medium text-biconomy-muted mb-1">Share URL (read-only)</p>
            <p class="font-mono text-xs text-white truncate">{{ shareUrl || sharePath || 'Not generated yet' }}</p>
          </div>
          <div class="rounded bg-slate-800/50 p-3">
            <p class="text-xs font-medium text-biconomy-muted mb-1">Collaborator URL (sign)</p>
            <p class="font-mono text-xs text-white truncate">{{ collaborationUrl || 'Use Share URL for viewers' }}</p>
          </div>
          <div class="rounded bg-slate-800/50 p-3">
            <p class="text-xs font-medium text-biconomy-muted mb-1">Operator URL (operate)</p>
            <p class="font-mono text-xs text-white truncate">{{ operatorUrl || 'Hidden for read-only' }}</p>
          </div>
        </div>
      </details>

      <details class="group rounded-lg border border-biconomy-border bg-biconomy-dark/30" open>
        <summary class="flex items-center gap-3 px-4 py-3 cursor-pointer list-none font-semibold text-biconomy-text hover:text-white transition-colors">
          <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          Status
          <svg class="w-4 h-4 ml-auto text-biconomy-muted group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </summary>
        <div class="px-4 pb-4 space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-xs text-biconomy-muted">Access Mode</span>
            <span class="text-xs font-semibold text-white bg-biconomy-dark px-2 py-0.5 rounded">{{ accessModeLabel }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-biconomy-muted">Broadcast</span>
            <span class="text-xs font-semibold text-white">{{ broadcastMode }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-biconomy-muted">Signatures</span>
            <span class="text-xs font-semibold"><span class="text-biconomy-orange">{{ signatureCount }}</span> / {{ requiredSignerCount }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-biconomy-muted">Pending</span>
            <span class="text-xs font-semibold text-white">{{ pendingSignerCount }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-biconomy-muted">Relay</span>
            <span class="text-xs font-semibold" :class="relayLevelClass">{{ relayReadinessLabel }}</span>
          </div>
        </div>
      </details>

      <details class="group rounded-lg border border-biconomy-border bg-biconomy-dark/30" open>
        <summary class="flex items-center gap-3 px-4 py-3 cursor-pointer list-none font-semibold text-biconomy-text hover:text-white transition-colors">
          <svg class="w-4 h-4 text-biconomy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Recent Activity
          <svg class="w-4 h-4 ml-auto text-biconomy-muted group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </summary>
        <div class="px-4 pb-4">
          <ActivityTimeline :items="activityItems" :action-context="actionContext" :preference-key="timelinePreferenceKey" @activity-action="$emit('activity-action', $event)" />
        </div>
      </details>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import ActivityTimeline from '@/features/operations/components/ActivityTimeline.vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();
const props = defineProps({
  draftId: { type: String, default: '' },
  sharePath: { type: String, default: '' },
  shareUrl: { type: String, default: '' },
  collaborationUrl: { type: String, default: '' },
  operatorUrl: { type: String, default: '' },
  canWrite: { type: Boolean, default: false },
  canOperate: { type: Boolean, default: false },
  accessScope: { type: String, default: 'read' },
  shareStatus: { type: String, default: 'draft' },
  broadcastMode: { type: String, default: 'client' },
  signatureCount: { type: Number, default: 0 },
  requiredSignerCount: { type: Number, default: 0 },
  pendingSignerCount: { type: Number, default: 0 },
  relayReadinessLabel: { type: String, default: 'Relay Blocked' },
  relayReadinessDetail: { type: String, default: 'No relay submission path is ready yet.' },
  relayReadinessLevel: { type: String, default: 'blocked' },
  activityItems: { type: Array, default: () => [] },
  actionContext: { type: Object, default: () => ({}) },
  timelinePreferenceKey: { type: String, default: '' },
  lastTxid: { type: String, default: '' },
});
defineEmits(['activity-action']);
const accessModeLabel = computed(() => {
  if (props.canOperate || props.accessScope === 'operate') return 'Operator';
  if (props.canWrite || props.accessScope === 'sign') return 'Collaborator';
  return 'Read-only';
});
const relayLevelClass = computed(() => {
  if (props.relayReadinessLevel === 'ready') return 'text-biconomy-orange';
  if (props.relayReadinessLevel === 'warning') return 'text-amber-400';
  return 'text-rose-400';
});
</script>
