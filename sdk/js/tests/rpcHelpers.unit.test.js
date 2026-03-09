const test = require('node:test');
const assert = require('node:assert/strict');

const { getNetworkMagic, invokeRead, simulateInvoke } = require('./rpc');

test('invokeRead builds the script, invokes it, and returns the HALT result', async () => {
  const calls = [];
  const rpcClient = {
    async invokeScript(script, signers) {
      calls.push({ script, signers });
      return { state: 'HALT', stack: [{ type: 'Integer', value: '1' }] };
    },
  };
  const sc = {
    createScript(input) {
      calls.push({ created: input });
      return 'deadbeef';
    },
  };
  const u = {
    HexString: {
      fromHex(value) {
        calls.push({ hex: value });
        return `hex:${value}`;
      },
    },
  };

  const result = await invokeRead({
    rpcClient,
    sc,
    u,
    scriptHash: 'aa11',
    operation: 'getNonce',
    args: ['arg1'],
    signers: [{ account: '0x01' }],
  });

  assert.equal(result.state, 'HALT');
  assert.deepEqual(calls, [
    { created: { scriptHash: 'aa11', operation: 'getNonce', args: ['arg1'] } },
    { hex: 'deadbeef' },
    { script: 'hex:deadbeef', signers: [{ account: '0x01' }] },
  ]);
});

test('invokeRead throws a descriptive error on FAULT', async () => {
  const rpcClient = {
    async invokeScript() {
      return { state: 'FAULT', exception: 'boom' };
    },
  };
  const sc = { createScript: () => 'bead' };
  const u = { HexString: { fromHex: (value) => value } };

  await assert.rejects(
    () => invokeRead({ rpcClient, sc, u, scriptHash: 'aa', operation: 'testOp' }),
    /testOp fault: boom/
  );
});

test('simulateInvoke returns the raw invokeScript result', async () => {
  const rpcClient = {
    async invokeScript() {
      return { state: 'FAULT', exception: 'expected raw result' };
    },
  };
  const sc = { createScript: () => 'cafe' };
  const u = { HexString: { fromHex: (value) => value } };

  const result = await simulateInvoke({ rpcClient, sc, u, scriptHash: 'aa', operation: 'simOp' });
  assert.deepEqual(result, { state: 'FAULT', exception: 'expected raw result' });
});

test('getNetworkMagic prefers getVersion when available', async () => {
  const rpcClient = {
    async getVersion() {
      return { protocol: { network: 5195086 } };
    },
  };

  assert.equal(await getNetworkMagic({ rpcClient }), 5195086);
});

test('getNetworkMagic falls back to getversion query and uses the provided error message', async () => {
  const calls = [];
  const rpcClient = {
    async execute(query) {
      calls.push(query.input);
      return { protocol: {} };
    },
  };
  const rpc = {
    Query: class Query {
      constructor(input) {
        this.input = input;
      }
    },
  };

  await assert.rejects(
    () => getNetworkMagic({ rpcClient, rpc, errorMessage: 'custom missing magic' }),
    /custom missing magic/
  );
  assert.deepEqual(calls, [{ method: 'getversion' }]);
});


test('invokeRead retries transient network errors before succeeding', async () => {
  let attempts = 0;
  const rpcClient = {
    async invokeScript() {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('socket disconnected');
        error.code = 'ECONNRESET';
        throw error;
      }
      return { state: 'HALT', stack: [{ type: 'Integer', value: '1' }] };
    },
  };
  const sc = { createScript: () => 'bead' };
  const u = { HexString: { fromHex: (value) => value } };

  const result = await invokeRead({ rpcClient, sc, u, scriptHash: 'aa', operation: 'retryOp' });
  assert.equal(result.state, 'HALT');
  assert.equal(attempts, 3);
});

test('getNetworkMagic retries transient getVersion failures', async () => {
  let attempts = 0;
  const rpcClient = {
    async getVersion() {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('tls reset');
        error.code = 'ECONNRESET';
        throw error;
      }
      return { protocol: { network: 894710606 } };
    },
  };

  assert.equal(await getNetworkMagic({ rpcClient }), 894710606);
  assert.equal(attempts, 3);
});
