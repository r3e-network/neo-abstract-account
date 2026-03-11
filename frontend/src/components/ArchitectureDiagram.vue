<template>
  <div class="h-[600px] w-full rounded-lg border border-ata-border bg-ata-panel overflow-hidden shadow-inner">
    <VueFlow :nodes="nodes" :edges="edges" :fit-view-on-init="true" class="vue-flow-custom-light">
      <Background pattern-color="#CBD5E1" :gap="24" />
      <Controls class="light-controls" />
    </VueFlow>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const baseStyle = {
  borderRadius: '8px',
  padding: '16px',
  fontSize: '14px',
  textAlign: 'center',
  width: '220px',
  borderWidth: '2px',
  borderStyle: 'solid',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  whiteSpace: 'pre-wrap',
  lineHeight: '1.4'
}

const nodes = ref([
  {
    id: '1',
    type: 'input',
    label: 'User / dApp\n(MetaTx)',
    position: { x: 100, y: 50 },
    style: { ...baseStyle, backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontWeight: '600' }
  },
  {
    id: '2',
    label: 'Relayer\n(Pays GAS)',
    position: { x: 450, y: 50 },
    style: { ...baseStyle, backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#334155', fontWeight: '600' }
  },
  {
    id: '3',
    label: 'Neo N3 VM\n(Verification Trigger)',
    position: { x: 275, y: 180 },
    style: { ...baseStyle, backgroundColor: '#ecfdf5', borderColor: '#6ee7b7', color: '#065f46', fontWeight: 'bold' }
  },
  {
    id: '4',
    label: 'Deterministic Proxy\n(Verification Script)',
    position: { x: 275, y: 310 },
    style: { ...baseStyle, backgroundColor: '#f0fdfa', borderColor: '#5eead4', color: '#115e59', fontWeight: 'bold' }
  },
  {
    id: '5',
    label: 'Master Entry Contract\n(Gateway)',
    position: { x: 275, y: 440 },
    style: { ...baseStyle, backgroundColor: '#f0fdfa', borderColor: '#86efac', color: '#14532d', fontWeight: 'bold' }
  },
  {
    id: '6',
    label: 'Custom Verifier',
    position: { x: 25, y: 570 },
    style: { ...baseStyle, backgroundColor: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', fontWeight: '600' }
  },
  {
    id: '7',
    label: 'Role Multi-Sig\n(Admin/Manager)',
    position: { x: 275, y: 570 },
    style: { ...baseStyle, backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#1e3a8a', fontWeight: '600' }
  },
  {
    id: '8',
    label: 'Dome Recovery\n(Oracles & Timeout)',
    position: { x: 525, y: 570 },
    style: { ...baseStyle, backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', fontWeight: '600' }
  },
  {
    id: '9',
    type: 'output',
    label: 'Target Smart Contract\n(Execution)',
    position: { x: 275, y: 700 },
    style: { ...baseStyle, backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: 'bold' }
  }
])

const edges = ref([
  { id: 'e1-2', source: '1', target: '2', animated: true, label: 'Sign & Relay' },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e1-3', source: '1', target: '3', type: 'step', style: { strokeDasharray: '5,5', stroke: '#94a3b8' }, label: 'Direct Invocation' },
  { id: 'e3-4', source: '3', target: '4', animated: true },
  { id: 'e4-5', source: '4', target: '5', animated: true, label: 'Forward Context' },
  { id: 'e5-6', source: '5', target: '6', type: 'smoothstep' },
  { id: 'e5-7', source: '5', target: '7', type: 'smoothstep' },
  { id: 'e5-8', source: '5', target: '8', type: 'smoothstep' },
  { id: 'e6-9', source: '6', target: '9', type: 'smoothstep', animated: true },
  { id: 'e7-9', source: '7', target: '9', type: 'smoothstep', animated: true },
  { id: 'e8-9', source: '8', target: '9', type: 'smoothstep', animated: true }
])
</script>

<style>
.vue-flow-custom-light .vue-flow__edge-path {
  stroke: #94a3b8;
  stroke-width: 2.5;
}
.vue-flow-custom-light .vue-flow__edge-text {
  font-size: 12px;
  fill: #475569;
  font-weight: 600;
}
.vue-flow-custom-light .vue-flow__edge-textbg {
  fill: rgba(255, 255, 255, 0.9);
  rx: 6px;
  ry: 6px;
}
.light-controls .vue-flow__controls-button {
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.light-controls .vue-flow__controls-button:hover {
  background-color: #f8fafc;
}
.light-controls .vue-flow__controls-button svg {
  fill: #475569;
}
</style>