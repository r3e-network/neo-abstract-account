<template>
  <aside class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <div class="mb-5 flex items-center justify-between">
      <h2 class="text-lg font-bold text-slate-900">{{ t('operations.activitySidebarTitle', 'Draft Activity') }}</h2>
      <span class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
        :class="shareStatus === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
      >
        {{ shareStatus || 'local' }}
      </span>
    </div>
    <dl class="space-y-4 text-sm text-slate-600">
      <div>
        <dt class="font-medium text-slate-700">Draft ID</dt>
        <dd class="break-all font-mono text-xs">{{ draftId || 'Not persisted yet' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Share URL</dt>
        <dd class="break-all font-mono text-xs">{{ shareUrl || sharePath || 'Not generated yet' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Collaborator URL</dt>
        <dd class="break-all font-mono text-xs">{{ collaborationUrl || 'Read-only viewers should use the Share URL.' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Operator URL</dt>
        <dd class="break-all font-mono text-xs">{{ operatorUrl || 'Operator link hidden in signer and read-only views.' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Access Mode</dt>
        <dd>{{ accessModeLabel }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Signature Progress</dt>
        <dd>{{ signatureCount }} / {{ requiredSignerCount }} collected</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Pending Signers</dt>
        <dd>{{ pendingSignerCount }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Relay Readiness</dt>
        <dd>
          <span class="font-semibold" :class="relayLevelClass">{{ relayReadinessLabel }}</span>
          <span class="block text-xs text-slate-500">{{ relayReadinessDetail }}</span>
        </dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Broadcast Mode</dt>
        <dd>{{ broadcastMode }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">Last Broadcast</dt>
        <dd class="break-all font-mono text-xs">{{ lastTxid || 'Not broadcast yet' }}</dd>
      </div>
      <div>
        <dt class="font-medium text-slate-700">{{ t('operations.recentActivityTitle', 'Recent Activity') }}</dt>
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
  if (props.relayReadinessLevel === 'ready') return 'text-emerald-700';
  if (props.relayReadinessLevel === 'warning') return 'text-amber-700';
  return 'text-rose-700';
});
</script>
