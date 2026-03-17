<template>
  <section class="bg-biconomy-panel/60 backdrop-blur-xl shadow-[0_0_15px_rgba(0,163,255,0.05)] rounded-lg overflow-hidden border border-biconomy-border p-6 sm:p-8 dark-panel-override">
    <h2 class="text-xl font-bold text-white mb-2 uppercase tracking-widest font-mono">{{ t('studioPanels.permissionsTitle', 'Permissions & Limits') }}</h2>
    <p class="text-sm text-biconomy-muted mb-8">V3 policy lives in hook and verifier plugins. Use the active account plus raw method/args calls below to configure the currently bound plugin contracts.</p>

    <div class="space-y-8">
      <div class="rounded-lg border border-biconomy-border/60 bg-biconomy-panel/60 p-5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 class="text-sm font-bold text-white uppercase tracking-widest font-mono mb-2">Preset Catalog</h4>
            <p class="text-sm text-biconomy-muted">Pick a common verifier or hook preset first, then adjust the typed args only where your account needs a different target, token, or expiry.</p>
          </div>
          <router-link :to="{ path: '/docs', query: { doc: 'pluginGuide' } }" class="btn-secondary whitespace-nowrap">
            Open Hook & Plugin Guide
          </router-link>
        </div>
        <div class="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-biconomy-muted">Verifier Presets</p>
            <div class="grid gap-2">
              <button v-for="preset in verifierPresets" :key="preset.label" type="button" class="rounded-lg border border-biconomy-border bg-biconomy-dark/70 px-4 py-3 text-left transition hover:border-biconomy-orange/50 hover:bg-biconomy-dark" @click="applyVerifierPreset(preset)">
                <p class="text-sm font-semibold text-white">{{ preset.label }}</p>
                <p class="mt-1 text-xs text-biconomy-muted">{{ preset.description }}</p>
              </button>
            </div>
          </div>
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-biconomy-muted">Hook Presets</p>
            <div class="grid gap-2">
              <button v-for="preset in hookPresets" :key="preset.label" type="button" class="rounded-lg border border-biconomy-border bg-biconomy-dark/70 px-4 py-3 text-left transition hover:border-biconomy-orange/50 hover:bg-biconomy-dark" @click="applyHookPreset(preset)">
                <p class="text-sm font-semibold text-white">{{ preset.label }}</p>
                <p class="mt-1 text-xs text-biconomy-muted">{{ preset.description }}</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-biconomy-panel p-5 rounded-lg border border-biconomy-border/60">
        <label class="block text-sm font-semibold text-biconomy-text mb-3">Target Account Seed / AccountId Hash</label>
        <div class="flex flex-col sm:flex-row gap-4">
          <input
            v-model="permissionsForm.accountAddress"
            type="text"
            list="loaded-permissions-accounts"
            class="input-field flex-1 font-mono text-sm py-2.5 px-4 bg-biconomy-dark"
            placeholder="20-byte hash160 or raw seed"
          />
          <datalist id="loaded-permissions-accounts">
            <option v-for="addr in autoLoadedAccounts" :key="addr" :value="addr" />
          </datalist>
        </div>
        <p class="mt-2 text-xs text-biconomy-muted">The account must already have an active verifier and/or hook bound. V3 plugin calls are keyed by accountId hash160.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="border border-biconomy-border rounded-lg p-5 hover:border-biconomy-border transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-white mb-5 uppercase tracking-widest font-mono">Call Active Verifier Plugin</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Method</label>
              <input v-model="permissionsForm.verifierMethod" type="text" class="input-field text-sm font-mono py-2 px-3 bg-biconomy-dark" placeholder="setSessionKey / setConfig / createSubscription ..." />
            </div>
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Args JSON</label>
              <textarea v-model="permissionsForm.verifierArgsJson" class="input-field text-xs font-mono py-2 px-3 bg-biconomy-dark min-h-32" placeholder='[{"type":"Hash160","value":"0x..."},{"type":"ByteArray","value":"0x..."}]'></textarea>
            </div>
            <button type="button" class="btn-primary w-full" :disabled="permissionsBusy.verifierCall || !canManagePermissions" @click="callVerifier">
              {{ permissionsBusy.verifierCall ? 'Calling...' : 'Call Verifier' }}
            </button>
          </div>
        </div>

        <div class="border border-biconomy-border rounded-lg p-5 hover:border-biconomy-border transition-colors flex flex-col">
          <h3 class="text-sm font-bold text-white mb-5 uppercase tracking-widest font-mono">Call Active Hook Plugin</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Method</label>
              <input v-model="permissionsForm.hookMethod" type="text" class="input-field text-sm font-mono py-2 px-3 bg-biconomy-dark" placeholder="setWhitelist / setDailyLimit / requireCredentialForContract ..." />
            </div>
            <div>
              <label class="block text-xs font-semibold text-biconomy-muted mb-1">Args JSON</label>
              <textarea v-model="permissionsForm.hookArgsJson" class="input-field text-xs font-mono py-2 px-3 bg-biconomy-dark min-h-32" placeholder='[{"type":"Hash160","value":"0x..."},{"type":"Boolean","value":true}]'></textarea>
            </div>
            <button type="button" class="btn-secondary w-full" :disabled="permissionsBusy.hookCall || !canManagePermissions" @click="callHook">
              {{ permissionsBusy.hookCall ? 'Calling...' : 'Call Hook' }}
            </button>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-biconomy-border/60 bg-biconomy-panel/60 p-5">
        <h4 class="text-sm font-bold text-white uppercase tracking-widest font-mono mb-3">Common Examples</h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-biconomy-muted font-mono">
          <div>
            <p class="text-biconomy-orange mb-1">WhitelistHook</p>
            <pre class="whitespace-pre-wrap">method: setWhitelist
args: [
  { "type": "Hash160", "value": "0x&lt;account&gt;" },
  { "type": "Hash160", "value": "0x&lt;target&gt;" },
  { "type": "Boolean", "value": true }
]</pre>
          </div>
          <div>
            <p class="text-biconomy-orange mb-1">DailyLimitHook</p>
            <pre class="whitespace-pre-wrap">method: setDailyLimit
args: [
  { "type": "Hash160", "value": "0x&lt;account&gt;" },
  { "type": "Hash160", "value": "0x&lt;token&gt;" },
  { "type": "Integer", "value": "1000000" }
]</pre>
          </div>
          <div>
            <p class="text-biconomy-orange mb-1">SessionKeyVerifier</p>
            <pre class="whitespace-pre-wrap">method: setSessionKey
args: [
  { "type": "Hash160", "value": "0x&lt;account&gt;" },
  { "type": "ByteArray", "value": "0x&lt;pubkey&gt;" },
  { "type": "Hash160", "value": "0x&lt;target&gt;" },
  { "type": "String", "value": "*" },
  { "type": "Integer", "value": "1735689600" }
]</pre>
          </div>
          <div>
            <p class="text-biconomy-orange mb-1">NeoDIDCredentialHook</p>
            <pre class="whitespace-pre-wrap">method: requireCredentialForContract
args: [
  { "type": "Hash160", "value": "0x&lt;account&gt;" },
  { "type": "Hash160", "value": "0x&lt;target&gt;" },
  { "type": "String", "value": "Web3Auth_PrimaryIdentity" }
]</pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from '@/i18n';

const { t } = useI18n();

const studio = inject('studio');
const {
  permissionsForm,
  permissionsBusy,
  canManagePermissions,
  autoLoadedAccounts,
  callVerifier,
  callHook,
} = studio;

const verifierPresets = [
  {
    label: 'SessionKeyVerifier',
    description: 'Temporary delegated signer for one target + method.',
    method: 'setSessionKey',
    args: [
      { type: 'Hash160', value: '0x<accountId>' },
      { type: 'ByteArray', value: '0x<sessionPubKey>' },
      { type: 'Hash160', value: '0x<targetContract>' },
      { type: 'String', value: '*' },
      { type: 'Integer', value: '1735689600' },
    ],
  },
  {
    label: 'SubscriptionVerifier',
    description: 'Recurring approvals for scheduled pull-style flows.',
    method: 'createSubscription',
    args: [
      { type: 'Hash160', value: '0x<accountId>' },
      { type: 'Hash160', value: '0x<targetContract>' },
      { type: 'String', value: 'executeUserOp' },
      { type: 'Integer', value: '86400' },
    ],
  },
  {
    label: 'MultiSigVerifier',
    description: 'Threshold-based approvals for treasury-style accounts.',
    method: 'setSigners',
    args: [
      { type: 'Hash160', value: '0x<accountId>' },
      { type: 'Array', value: [] },
      { type: 'Integer', value: '2' },
    ],
  },
];

const hookPresets = [
  {
    label: 'WhitelistHook',
    description: 'Allow one target contract.',
    method: 'setWhitelist',
    args: [
      { type: 'Hash160', value: '0x<accountId>' },
      { type: 'Hash160', value: '0x<targetContract>' },
      { type: 'Boolean', value: true },
    ],
  },
  {
    label: 'DailyLimitHook',
    description: 'Cap daily token outflow.',
    method: 'setDailyLimit',
    args: [
      { type: 'Hash160', value: '0x<accountId>' },
      { type: 'Hash160', value: '0x<token>' },
      { type: 'Integer', value: '1000000' },
    ],
  },
  {
    label: 'NeoDIDCredentialHook',
    description: 'Require a credential before target access.',
    method: 'requireCredentialForContract',
    args: [
      { type: 'Hash160', value: '0x<accountId>' },
      { type: 'Hash160', value: '0x<targetContract>' },
      { type: 'String', value: 'Web3Auth_PrimaryIdentity' },
    ],
  },
  {
    label: 'MultiHook',
    description: 'Compose multiple policy hooks behind one slot.',
    method: 'setHooks',
    args: [
      { type: 'Hash160', value: '0x<accountId>' },
      { type: 'Array', value: [] },
    ],
  },
];

function applyVerifierPreset(preset) {
  permissionsForm.value.verifierMethod = preset.method;
  permissionsForm.value.verifierArgsJson = JSON.stringify(preset.args, null, 2);
}

function applyHookPreset(preset) {
  permissionsForm.value.hookMethod = preset.method;
  permissionsForm.value.hookArgsJson = JSON.stringify(preset.args, null, 2);
}
</script>
