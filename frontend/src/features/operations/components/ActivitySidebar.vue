<template>
  <aside class="rounded-lg border border-ata-border bg-ata-panel/60 p-6 shadow-2xl backdrop-blur-xl">
    <div class="mb-5 flex items-center justify-between">
      <h2 class="text-lg font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-ata-green animate-pulse"></span>
        {{ t('operations.activitySidebarTitle', 'Draft Activity') }}
      </h2>
      <span class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
        :class="shareStatus === 'draft' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-ata-green/20 text-ata-green border border-ata-green/30'"
      >
        {{ shareStatus || 'local' }}
      </span>
    </div>
    <dl class="space-y-4 text-sm text-slate-400">
      <div class="border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Draft ID</dt>
        <dd class="break-all font-mono text-xs text-slate-400 mt-1">{{ draftId || 'Not persisted yet' }}</dd>
      </div>
      <div class="border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Share URL</dt>
        <dd class="break-all font-mono text-xs text-slate-400 mt-1">{{ shareUrl || sharePath || 'Not generated yet' }}</dd>
      </div>
      <div class="border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Collaborator URL</dt>
        <dd class="break-all font-mono text-xs text-slate-400 mt-1">{{ collaborationUrl || 'Read-only viewers should use the Share URL.' }}</dd>
      </div>
      <div class="border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Operator URL</dt>
        <dd class="break-all font-mono text-xs text-slate-400 mt-1">{{ operatorUrl || 'Operator link hidden in signer and read-only views.' }}</dd>
      </div>
      <div class="flex justify-between items-center border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Access Mode</dt>
        <dd class="font-semibold text-white bg-ata-dark px-2 py-0.5 rounded text-xs">{{ accessModeLabel }}</dd>
      </div>
      <div class="flex justify-between items-center border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Signature Progress</dt>
        <dd class="font-semibold text-white"><span class="text-ata-green">{{ signatureCount }}</span> / {{ requiredSignerCount }}</dd>
      </div>
      <div class="flex justify-between items-center border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Pending Signers</dt>
        <dd class="font-semibold text-white">{{ pendingSignerCount }}</dd>
      </div>
      <div class="border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300 flex justify-between">Relay Readiness <span class="font-semibold" :class="relayLevelClass">{{ relayReadinessLabel }}</span></dt>
        <dd>
          <span class="block text-xs text-slate-400 mt-1">{{ relayReadinessDetail }}</span>
        </dd>
      </div>
      <div class="flex justify-between items-center border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Broadcast Mode</dt>
        <dd class="font-semibold text-white">{{ broadcastMode }}</dd>
      </div>
      <div class="border-b border-ata-border pb-3">
        <dt class="font-bold text-slate-300">Last Broadcast</dt>
        <dd class="break-all font-mono text-xs text-slate-400 mt-1">{{ lastTxid || 'Not broadcast yet' }}</dd>
      </div>
      <div class="pt-2">
        <dt class="font-bold text-slate-300 flex items-center gap-2 mb-3">
          <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {{ t('operations.recentActivityTitle', 'Recent Activity') }}
        </dt>
        <dd class="mt-2">
          <ActivityTimeline :items="activityItems" :action-context="actionContext" :preference-key="timelinePreferenceKey" @activity-action="$emit('activity-action', $event)" />
        </dd>
      </div>
    </dl>
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
  if (props.relayReadinessLevel === 'ready') return 'text-ata-green';
  if (props.relayReadinessLevel === 'warning') return 'text-amber-400';
  return 'text-rose-400';
});
</script>
