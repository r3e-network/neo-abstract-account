const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadInvokeModule() {
  const modulePath = path.join(__dirname, 'invoke.js');
  assert.equal(fs.existsSync(modulePath), true, 'expected shared invocation helper module to exist');
  return require('./invoke');
}

test('bindInvocationHelpers exposes shared invocation functions', () => {
  const { bindInvocationHelpers, sendInvocation } = loadInvokeModule();
  assert.equal(typeof bindInvocationHelpers, 'function');
  assert.equal(typeof sendInvocation, 'function');
});

test('sendInvocation simulates and sends using default signer behavior', async () => {
  const calls = [];
  const rpcClient = {
    async invokeScript(script, signers) {
      calls.push(['invokeScript', script, signers]);
      return { state: 'HALT', gasconsumed: '99' };
    },
    async getBlockCount() {
      calls.push(['getBlockCount']);
      return 17;
    },
  };

  const { bindInvocationHelpers } = loadInvokeModule();
  const { sendInvocation } = bindInvocationHelpers({
    rpcClient,
    txModule: { WitnessScope: { CalledByEntry: 'CBE' } },
    sc: {
      createScript(input) {
        calls.push(['createScript', input]);
        return 'deadbeef';
      },
    },
    u: {
      HexString: {
        fromHex(value) {
          calls.push(['fromHex', value]);
          return `hex:${value}`;
        },
      },
    },
    sendTransaction: async (payload) => {
      calls.push(['sendTransaction', payload]);
      return { txid: '0xabc', networkFee: '7' };
    },
    waitForTx: async () => {
      throw new Error('waitForTx should not be used by default');
    },
    assertVmStateHalt: () => {
      throw new Error('assertVmStateHalt should not be used by default');
    },
  });

  const result = await sendInvocation({
    account: { scriptHash: '0x1234' },
    magic: 123,
    scriptHash: 'aa55',
    operation: 'createAccountWithAddress',
    args: ['first'],
  });

  assert.deepEqual(result, {
    txid: '0xabc',
    systemFee: '99',
    networkFee: '7',
  });
  assert.deepEqual(calls, [
    ['createScript', { scriptHash: 'aa55', operation: 'createAccountWithAddress', args: ['first'] }],
    ['fromHex', 'deadbeef'],
    ['invokeScript', 'hex:deadbeef', [{ account: '0x1234', scopes: 'CBE' }]],
    ['getBlockCount'],
    ['sendTransaction', {
      rpcClient,
      txModule: { WitnessScope: { CalledByEntry: 'CBE' } },
      account: { scriptHash: '0x1234' },
      magic: 123,
      signers: [{ account: '0x1234', scopes: 'CBE' }],
      validUntilBlock: 1017,
      script: 'deadbeef',
      systemFee: '99',
      witnesses: [],
    }],
  ]);
});

test('sendInvocation can wait for confirmation, assert HALT, and pass through custom signers', async () => {
  const calls = [];
  const rpcClient = {
    async invokeScript(script, signers) {
      calls.push(['invokeScript', script, signers]);
      return { state: 'HALT', gasconsumed: '55' };
    },
    async getBlockCount() {
      calls.push(['getBlockCount']);
      return 9;
    },
  };
  const appLog = { executions: [{ vmstate: 'HALT' }] };
  const signers = [{ account: '0xsigner', scopes: 'custom' }];
  const witnesses = [{ verificationScript: 'verify' }];

  const { sendInvocation } = loadInvokeModule();
  const result = await sendInvocation({
    rpcClient,
    txModule: { WitnessScope: { CalledByEntry: 'unused' } },
    sc: {
      createScript(input) {
        calls.push(['createScript', input]);
        return 'cafebabe';
      },
    },
    u: {
      HexString: {
        fromHex(value) {
          calls.push(['fromHex', value]);
          return `hex:${value}`;
        },
      },
    },
    sendTransaction: async (payload) => {
      calls.push(['sendTransaction', payload]);
      return { txid: '0xdef', networkFee: '8' };
    },
    waitForTx: async (client, txid, options) => {
      calls.push(['waitForTx', client, txid, options]);
      return appLog;
    },
    assertVmStateHalt: (log, label) => {
      calls.push(['assertVmStateHalt', log, label]);
      return 'HALT';
    },
    account: { scriptHash: '0xacct' },
    magic: 456,
    scriptHash: 'bb66',
    operation: 'executeByAddress',
    args: ['payload'],
    signers,
    witnesses,
    waitForConfirmation: true,
    waitOptions: { timeoutMs: 5000 },
    assertHalt: true,
    haltLabel: 'executeByAddress tx',
  });

  assert.deepEqual(result, {
    txid: '0xdef',
    systemFee: '55',
    networkFee: '8',
    appLog,
  });
  assert.deepEqual(calls, [
    ['createScript', { scriptHash: 'bb66', operation: 'executeByAddress', args: ['payload'] }],
    ['fromHex', 'cafebabe'],
    ['invokeScript', 'hex:cafebabe', signers],
    ['getBlockCount'],
    ['sendTransaction', {
      rpcClient,
      txModule: { WitnessScope: { CalledByEntry: 'unused' } },
      account: { scriptHash: '0xacct' },
      magic: 456,
      signers,
      validUntilBlock: 1009,
      script: 'cafebabe',
      systemFee: '55',
      witnesses,
    }],
    ['waitForTx', rpcClient, '0xdef', { timeoutMs: 5000 }],
    ['assertVmStateHalt', appLog, 'executeByAddress tx'],
  ]);
});

test('sendInvocation throws when simulation faults', async () => {
  const { bindInvocationHelpers } = loadInvokeModule();
  const { sendInvocation } = bindInvocationHelpers({
    rpcClient: {
      async invokeScript() {
        return { state: 'FAULT', exception: 'nope' };
      },
      async getBlockCount() {
        throw new Error('not reached');
      },
    },
    txModule: { WitnessScope: { CalledByEntry: 'CBE' } },
    sc: { createScript() { return 'bead'; } },
    u: { HexString: { fromHex(value) { return value; } } },
    sendTransaction: async () => {
      throw new Error('not reached');
    },
    waitForTx: async () => {
      throw new Error('not reached');
    },
    assertVmStateHalt: () => {
      throw new Error('not reached');
    },
  });

  await assert.rejects(
    () => sendInvocation({
      account: { scriptHash: '0x1234' },
      magic: 1,
      scriptHash: 'aa55',
      operation: 'deploy',
      args: [],
    }),
    /deploy simulation fault: nope/
  );
});
