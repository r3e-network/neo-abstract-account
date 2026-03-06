const test = require('node:test');
const assert = require('node:assert/strict');

const { assertVmStateHalt, extractVmState, waitForTx } = require('./tx');

test('waitForTx returns the first application log with executions', async () => {
  const calls = [];
  const appLog = { executions: [{ vmstate: 'HALT' }] };
  const rpcClient = {
    async getApplicationLog(txid) {
      calls.push(txid);
      if (calls.length < 3) throw new Error('pending');
      return appLog;
    },
  };

  const result = await waitForTx(rpcClient, '0xabc', {
    timeoutMs: 100,
    pollIntervalMs: 1,
    sleep: async () => {},
  });

  assert.equal(result, appLog);
  assert.deepEqual(calls, ['0xabc', '0xabc', '0xabc']);
});

test('waitForTx throws after the timeout using the provided error message', async () => {
  const rpcClient = {
    async getApplicationLog() {
      throw new Error('still pending');
    },
  };

  await assert.rejects(
    () => waitForTx(rpcClient, '0xdef', {
      timeoutMs: 5,
      pollIntervalMs: 1,
      sleep: async () => {},
      now: (() => {
        let tick = 0;
        return () => ++tick * 10;
      })(),
      errorMessage: 'custom timeout',
    }),
    /custom timeout/
  );
});

test('extractVmState normalizes execution vmstate to uppercase', () => {
  assert.equal(extractVmState({ executions: [{ vmstate: 'HALT' }] }), 'HALT');
  assert.equal(extractVmState({ executions: [{ vmState: 'fault' }] }), 'FAULT');
  assert.equal(extractVmState({ executions: [] }), 'UNKNOWN');
  assert.equal(extractVmState(null), 'UNKNOWN');
});

test('assertVmStateHalt returns HALT and throws a descriptive error otherwise', async () => {
  assert.equal(assertVmStateHalt({ executions: [{ vmstate: 'HALT' }] }, 'deploy tx'), 'HALT');
  assert.throws(
    () => assertVmStateHalt({ executions: [{ vmState: 'FAULT' }] }, 'deploy tx'),
    /deploy tx vmstate FAULT/
  );
});
