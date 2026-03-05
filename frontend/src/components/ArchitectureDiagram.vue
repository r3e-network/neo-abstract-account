<template>
  <div class="h-[500px] w-full rounded-2xl border border-slate-200 shadow-inner bg-slate-50 overflow-hidden">
    <VueFlow :nodes="nodes" :edges="edges" :fit-view-on-init="true" class="vue-flow-custom">
      <Background pattern-color="#cbd5e1" :gap="20" />
      <Controls />
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

const nodes = ref([
  {
    id: '1',
    type: 'input',
    label: 'User / dApp\n(MetaTx)',
    position: { x: 50, y: 50 },
    style: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: 'bold', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '2',
    label: 'Relayer\n(Pays GAS)',
    position: { x: 250, y: 50 },
    style: { backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#334155', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '3',
    label: 'Neo N3 VM\n(Verification Trigger)',
    position: { x: 250, y: 150 },
    style: { backgroundColor: '#e2e8f0', borderColor: '#64748b', color: '#1e293b', fontWeight: 'bold', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '4',
    label: 'Deterministic Proxy Address\n(Verification Script)',
    position: { x: 250, y: 250 },
    style: { backgroundColor: '#14b8a6', borderColor: '#0f766e', color: '#ffffff', fontWeight: 'bold', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '5',
    label: 'Master Entry Contract\n(Gateway)',
    position: { x: 250, y: 350 },
    style: { backgroundColor: '#059669', borderColor: '#047857', color: '#ffffff', fontWeight: 'bold', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '6',
    label: 'Custom Verifier',
    position: { x: 50, y: 450 },
    style: { backgroundColor: '#fef3c7', borderColor: '#d97706', color: '#92400e', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '7',
    label: 'Role Multi-Sig\n(Admin/Manager)',
    position: { x: 250, y: 450 },
    style: { backgroundColor: '#eff6ff', borderColor: '#3b82f6', color: '#1e40af', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '8',
    label: 'Dome Recovery\n(Oracles & Timeout)',
    position: { x: 450, y: 450 },
    style: { backgroundColor: '#fef2f2', borderColor: '#ef4444', color: '#991b1b', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '9',
    type: 'output',
    label: 'Target Smart Contract\n(Execution)',
    position: { x: 250, y: 550 },
    style: { backgroundColor: '#f8fafc', borderColor: '#475569', color: '#0f172a', fontWeight: 'bold', borderRadius: '8px', padding: '10px' }
  }
])

const edges = ref([
  { id: 'e1-2', source: '1', target: '2', animated: true, label: 'Sign & Relay' },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e1-3', source: '1', target: '3', type: 'step', style: { strokeDasharray: '5,5' }, label: 'Direct Invocation' },
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
.vue-flow-custom .vue-flow__edge-path {
  stroke: #94a3b8;
  stroke-width: 2;
}
.vue-flow-custom .vue-flow__edge-text {
  font-size: 10px;
  fill: #64748b;
  font-weight: 600;
}
.vue-flow-custom .vue-flow__edge-textbg {
  fill: rgba(255,255,255,0.8);
}
</style>