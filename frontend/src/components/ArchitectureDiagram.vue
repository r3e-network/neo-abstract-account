<template>
  <div class="relative">
    <!-- Controls bar -->
    <div class="flex items-center justify-between mb-3 px-1">
      <div class="flex items-center gap-2">
        <button
          @click="togglePlayback"
          class="btn-ghost btn-sm gap-1.5"
          :class="isPlaying ? 'text-aa-orange border border-aa-orange/30 bg-aa-orange/5' : ''"
        >
          <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!isPlaying" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path v-if="!isPlaying" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path v-if="isPlaying" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ isPlaying ? t('arch.pause', 'Pause') : t('arch.playFlow', 'Play Flow') }}
        </button>
        <button v-if="activeStep >= 0" @click="resetPlayback" class="btn-ghost btn-sm">
          {{ t('arch.reset', 'Reset') }}
        </button>
      </div>
      <div v-if="activeStep >= 0" class="flex items-center gap-1.5 text-xs text-aa-muted font-mono">
        <span class="w-1.5 h-1.5 rounded-full bg-aa-orange animate-pulse"></span>
        {{ t('arch.step', 'Step') }} {{ activeStep + 1 }} / {{ flowSteps.length }}
      </div>
    </div>

    <div role="img" :aria-label="t('arch.diagramLabel', 'Neo Abstract Account architecture diagram')" class="h-[400px] sm:h-[500px] lg:h-[600px] w-full rounded-lg border border-aa-border bg-aa-dark overflow-hidden shadow-inner">
      <VueFlow
        :nodes="displayNodes"
        :edges="displayEdges"
        :fit-view-on-init="true"
        :nodes-draggable="false"
        :pan-on-drag="true"
        class="vue-flow-custom-dark"
        @node-click="onNodeClick"
      >
        <Background pattern-color="#1e293b" :gap="24" />
        <Controls class="dark-controls" />
      </VueFlow>
    </div>

    <!-- Detail panel -->
    <transition name="detail-slide">
      <div v-if="selectedNode" class="mt-3 rounded-xl border border-aa-border bg-aa-panel/80 backdrop-blur-xl p-5 relative overflow-hidden">
        <div class="absolute inset-0 bg-subtle-glass pointer-events-none"></div>
        <div class="relative z-10">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold" :style="{ backgroundColor: selectedNode.accentBg, borderColor: selectedNode.accent, color: selectedNode.accent }">
                {{ selectedNode.step }}
              </div>
              <div>
                <h4 class="text-sm font-bold text-white">{{ selectedNode.title }}</h4>
                <p class="text-xs text-aa-muted">{{ selectedNode.subtitle }}</p>
              </div>
            </div>
            <button :aria-label="t('arch.closeDetail', 'Close detail panel')" @click="selectedNode = null" class="text-aa-muted hover:text-aa-text transition-colors duration-200 p-1">
              <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p class="text-sm text-aa-text leading-relaxed">{{ selectedNode.description }}</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useI18n } from '@/i18n'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const { t } = useI18n()

const baseStyle = {
  borderRadius: '8px',
  padding: '16px',
  fontSize: '14px',
  textAlign: 'center',
  width: '220px',
  borderWidth: '2px',
  borderStyle: 'solid',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  whiteSpace: 'pre-wrap',
  lineHeight: '1.4',
  cursor: 'pointer',
  transition: 'box-shadow 0.2s, border-color 0.2s'
}

function getNodeDetails() {
  return {
    '1': {
      title: t('arch.node1Title', 'User / dApp'),
      subtitle: t('arch.node1Subtitle', 'Transaction initiator'),
      description: t('arch.node1Desc', 'The user or decentralized application constructs a MetaTransaction — a signed intent describing the desired operation. This signature is sent off-chain to a relayer, keeping the user\'s private key usage minimal.'),
      accent: '#94a3b8', accentBg: 'rgba(148,163,184,0.1)', step: 1
    },
    '2': {
      title: t('arch.node2Title', 'Relayer'),
      subtitle: t('arch.node2Subtitle', 'Gas sponsor'),
      description: t('arch.node2Desc', 'The relayer receives the signed MetaTransaction, wraps it in an actual Neo N3 transaction, and pays the GAS fee. This enables gasless UX for end users — they never need to hold GAS themselves.'),
      accent: '#94a3b8', accentBg: 'rgba(148,163,184,0.1)', step: 2
    },
    '3': {
      title: t('arch.node3Title', 'Neo N3 VM'),
      subtitle: t('arch.node3Subtitle', 'Verification trigger'),
      description: t('arch.node3Desc', 'The Neo N3 virtual machine executes the verification script attached to the deterministic proxy. This is where the AA contract\'s custom logic runs — checking signatures, nonces, and plugin-based rules.'),
      accent: '#10b981', accentBg: 'rgba(16,185,129,0.1)', step: 3
    },
    '4': {
      title: t('arch.node4Title', 'Deterministic Proxy'),
      subtitle: t('arch.node4Subtitle', 'Verification script'),
      description: t('arch.node4Desc', 'A lightweight proxy contract deployed at a deterministic address. It delegates verification to the Master Entry Contract, allowing the AA to be created and verified in a single step.'),
      accent: '#14b8a6', accentBg: 'rgba(20,184,166,0.1)', step: 4
    },
    '5': {
      title: t('arch.node5Title', 'Master Entry Contract'),
      subtitle: t('arch.node5Subtitle', 'Gateway contract'),
      description: t('arch.node5Desc', 'The core gateway contract that manages AA lifecycle — creation, configuration, and invocation routing. It dispatches to verifiers, hooks, and the target contract based on the operation type.'),
      accent: '#22c55e', accentBg: 'rgba(34,197,94,0.1)', step: 5
    },
    '6': {
      title: t('arch.node6Title', 'Custom Verifier'),
      subtitle: t('arch.node6Subtitle', 'Plugin-based auth'),
      description: t('arch.node6Desc', 'Pluggable verification modules that extend AA authentication. Examples: ECDSA signature verifier, multi-sig verifier, social login verifier, or time-locked spending limits.'),
      accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.1)', step: 6
    },
    '7': {
      title: t('arch.node7Title', 'Role Multi-Sig'),
      subtitle: t('arch.node7Subtitle', 'Admin / Manager roles'),
      description: t('arch.node7Desc', 'Role-based multi-signature governance for AA accounts. Different roles (Admin, Manager, Operator) can have distinct signing thresholds and permission scopes.'),
      accent: '#3b82f6', accentBg: 'rgba(59,130,246,0.1)', step: 7
    },
    '8': {
      title: t('arch.node8Title', 'Social Recovery'),
      subtitle: t('arch.node8Subtitle', 'Oracle-based backup'),
      description: t('arch.node8Desc', 'A recovery mechanism using trusted oracles. If the primary key is lost, a threshold of designated guardians can authorize a key rotation after a configurable timeout period.'),
      accent: '#ef4444', accentBg: 'rgba(239,68,68,0.1)', step: 8
    },
    '9': {
      title: t('arch.node9Title', 'Target Smart Contract'),
      subtitle: t('arch.node9Subtitle', 'Execution destination'),
      description: t('arch.node9Desc', 'The final destination contract that executes the actual operation — token transfer, contract invocation, NFT mint, or any arbitrary Neo N3 smart contract method call.'),
      accent: '#64748b', accentBg: 'rgba(100,116,139,0.1)', step: 9
    }
  }
}

const flowSteps = [
  ['1'], ['2'], ['3'], ['4'], ['5'], ['6', '7', '8'], ['9']
]

const rawNodes = computed(() => [
  {
    id: '1', type: 'input', label: t('arch.node1Label', 'User / dApp\n(MetaTx)'),
    position: { x: 100, y: 50 },
    style: { ...baseStyle, backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9', fontWeight: '600' }
  },
  {
    id: '2', label: t('arch.node2Label', 'Relayer\n(Pays GAS)'),
    position: { x: 450, y: 50 },
    style: { ...baseStyle, backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9', fontWeight: '600' }
  },
  {
    id: '3', label: t('arch.node3Label', 'Neo N3 VM\n(Verification Trigger)'),
    position: { x: 275, y: 180 },
    style: { ...baseStyle, backgroundColor: '#064e3b', borderColor: '#10b981', color: '#6ee7b7', fontWeight: 'bold' }
  },
  {
    id: '4', label: t('arch.node4Label', 'Deterministic Proxy\n(Verification Script)'),
    position: { x: 275, y: 310 },
    style: { ...baseStyle, backgroundColor: '#134e4a', borderColor: '#14b8a6', color: '#5eead4', fontWeight: 'bold' }
  },
  {
    id: '5', label: t('arch.node5Label', 'Master Entry Contract\n(Gateway)'),
    position: { x: 275, y: 440 },
    style: { ...baseStyle, backgroundColor: '#14532d', borderColor: '#22c55e', color: '#86efac', fontWeight: 'bold' }
  },
  {
    id: '6', label: t('arch.node6Label', 'Custom Verifier'),
    position: { x: 25, y: 570 },
    style: { ...baseStyle, backgroundColor: '#713f12', borderColor: '#f59e0b', color: '#fcd34d', fontWeight: '600' }
  },
  {
    id: '7', label: t('arch.node7Label', 'Role Multi-Sig\n(Admin/Manager)'),
    position: { x: 275, y: 570 },
    style: { ...baseStyle, backgroundColor: '#1e3a5f', borderColor: '#3b82f6', color: '#93c5fd', fontWeight: '600' }
  },
  {
    id: '8', label: t('arch.node8Label', 'Social Recovery\n(Oracles & Timeout)'),
    position: { x: 525, y: 570 },
    style: { ...baseStyle, backgroundColor: '#7f1d1d', borderColor: '#ef4444', color: '#fca5a5', fontWeight: '600' }
  },
  {
    id: '9', type: 'output', label: t('arch.node9Label', 'Target Smart Contract\n(Execution)'),
    position: { x: 275, y: 700 },
    style: { ...baseStyle, backgroundColor: '#1e293b', borderColor: '#64748b', color: '#f1f5f9', fontWeight: 'bold' }
  }
])

const rawEdges = computed(() => [
  { id: 'e1-2', source: '1', target: '2', animated: true, label: t('arch.edgeSignRelay', 'Sign & Relay') },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e1-3', source: '1', target: '3', type: 'step', style: { strokeDasharray: '5,5', stroke: '#475569' }, label: t('arch.edgeDirectInvocation', 'Direct Invocation') },
  { id: 'e3-4', source: '3', target: '4', animated: true },
  { id: 'e4-5', source: '4', target: '5', animated: true, label: t('arch.edgeForwardContext', 'Forward Context') },
  { id: 'e5-6', source: '5', target: '6', type: 'smoothstep' },
  { id: 'e5-7', source: '5', target: '7', type: 'smoothstep' },
  { id: 'e5-8', source: '5', target: '8', type: 'smoothstep' },
  { id: 'e6-9', source: '6', target: '9', type: 'smoothstep', animated: true },
  { id: 'e7-9', source: '7', target: '9', type: 'smoothstep', animated: true },
  { id: 'e8-9', source: '8', target: '9', type: 'smoothstep', animated: true }
])

const selectedNode = ref(null)
const activeStep = ref(-1)
const isPlaying = ref(false)
let playbackTimer = null

const displayNodes = computed(() => {
  if (activeStep.value < 0) return rawNodes.value
  const details = getNodeDetails()
  const highlighted = new Set()
  for (let i = 0; i <= activeStep.value && i < flowSteps.length; i++) {
    flowSteps[i].forEach(id => highlighted.add(id))
  }
  return rawNodes.value.map(n => ({
    ...n,
    style: {
      ...n.style,
      opacity: highlighted.has(n.id) ? 1 : 0.3,
      boxShadow: highlighted.has(n.id) && n.id === flowSteps[activeStep.value]?.[0]
        ? `0 0 20px ${details[n.id]?.accent || '#fff'}40, ${baseStyle.boxShadow}`
        : n.style.boxShadow
    }
  }))
})

const displayEdges = computed(() => {
  if (activeStep.value < 0) return rawEdges.value
  const activeNodeIds = new Set()
  for (let i = 0; i <= activeStep.value && i < flowSteps.length; i++) {
    flowSteps[i].forEach(id => activeNodeIds.add(id))
  }
  return rawEdges.value.map(e => ({
    ...e,
    style: {
      ...e.style,
      opacity: activeNodeIds.has(e.source) && activeNodeIds.has(e.target) ? 1 : 0.15
    },
    animated: activeNodeIds.has(e.source) && activeNodeIds.has(e.target) ? true : false
  }))
})

function onNodeClick({ node }) {
  const detail = getNodeDetails()[node.id]
  if (detail) {
    selectedNode.value = { ...detail }
  }
}

function togglePlayback() {
  if (isPlaying.value) {
    isPlaying.value = false
    clearInterval(playbackTimer)
    return
  }
  isPlaying.value = true
  if (activeStep.value < 0 || activeStep.value >= flowSteps.length - 1) {
    activeStep.value = 0
  }
  playbackTimer = setInterval(() => {
    if (activeStep.value < flowSteps.length - 1) {
      activeStep.value++
    } else {
      isPlaying.value = false
      clearInterval(playbackTimer)
    }
  }, 1500)
}

function resetPlayback() {
  isPlaying.value = false
  clearInterval(playbackTimer)
  activeStep.value = -1
  selectedNode.value = null
}

onUnmounted(() => {
  if (playbackTimer) clearInterval(playbackTimer)
})
</script>

<style>
.vue-flow-custom-dark .vue-flow__edge-path {
  stroke: #64748b;
  stroke-width: 2.5;
}
.vue-flow-custom-dark .vue-flow__edge-text {
  font-size: 12px;
  fill: #94a3b8;
  font-weight: 600;
}
.vue-flow-custom-dark .vue-flow__edge-textbg {
  fill: rgba(15, 23, 42, 0.9);
  rx: 6px;
  ry: 6px;
}
.dark-controls .vue-flow__controls-button {
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
  color: #94a3b8;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
}
.dark-controls .vue-flow__controls-button:hover {
  background-color: #334155;
}
.dark-controls .vue-flow__controls-button svg {
  fill: #94a3b8;
}
</style>

<style scoped>
.detail-slide-enter-active,
.detail-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.detail-slide-enter-from,
.detail-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
