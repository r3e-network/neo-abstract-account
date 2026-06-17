import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TX_STATUS,
  extractVmState,
  extractVmException,
  fetchApplicationLog,
  waitForTransactionConfirmation,
} from '../src/features/studio/txConfirmation.js';

const RPC_URL = 'https://rpc.example/neo';
const TXID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

function jsonResponse(payload, { ok = true } = {}) {
  return {
    ok,
    async json() {
      return payload;
    },
  };
}

function haltLog() {
  return { executions: [{ vmstate: 'HALT', exception: null }] };
}

function faultLog(exception = 'ASSERT failed') {
  return { executions: [{ vmstate: 'FAULT', exception }] };
}

test('extractVmState reads the first execution state across response shapes', () => {
  assert.equal(extractVmState(haltLog()), 'HALT');
  assert.equal(extractVmState(faultLog()), 'FAULT');
  assert.equal(extractVmState({ vmstate: 'halt' }), 'HALT'); // legacy flat shape, normalized
  assert.equal(extractVmState(null), '');
  assert.equal(extractVmState({}), '');
});

test('extractVmException surfaces the fault reason', () => {
  assert.equal(extractVmException(faultLog('insufficient gas')), 'insufficient gas');
  assert.equal(extractVmException(haltLog()), '');
});

test('fetchApplicationLog returns null when the node has not indexed the tx yet', async () => {
  const fetchImpl = async () => jsonResponse({ jsonrpc: '2.0', id: 1, error: { code: -100, message: 'Unknown transaction' } });
  const result = await fetchApplicationLog(RPC_URL, TXID, { fetchImpl });
  assert.equal(result, null);
});

test('fetchApplicationLog prefixes the txid and returns the result payload', async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push(JSON.parse(options.body));
    return jsonResponse({ jsonrpc: '2.0', id: 1, result: haltLog() });
  };
  const result = await fetchApplicationLog(RPC_URL, TXID, { fetchImpl });
  assert.equal(extractVmState(result), 'HALT');
  assert.equal(seen[0].method, 'getapplicationlog');
  assert.equal(seen[0].params[0], `0x${TXID}`, 'txid must be 0x-prefixed for the RPC');
});

test('fetchApplicationLog treats a network error as "not available yet"', async () => {
  const fetchImpl = async () => { throw new Error('Failed to fetch'); };
  const result = await fetchApplicationLog(RPC_URL, TXID, { fetchImpl });
  assert.equal(result, null);
});

test('waitForTransactionConfirmation resolves confirmed on HALT', async () => {
  const fetchImpl = async () => jsonResponse({ result: haltLog() });
  const outcome = await waitForTransactionConfirmation(RPC_URL, TXID, {
    fetchImpl,
    sleep: async () => {},
    initialDelayMs: 1,
  });
  assert.equal(outcome.status, TX_STATUS.CONFIRMED);
  assert.equal(outcome.vmState, 'HALT');
});

test('waitForTransactionConfirmation resolves failed on FAULT and carries the exception', async () => {
  const fetchImpl = async () => jsonResponse({ result: faultLog('no auth') });
  const outcome = await waitForTransactionConfirmation(RPC_URL, TXID, {
    fetchImpl,
    sleep: async () => {},
    initialDelayMs: 1,
  });
  assert.equal(outcome.status, TX_STATUS.FAILED);
  assert.equal(outcome.exception, 'no auth');
});

test('waitForTransactionConfirmation keeps polling until the log appears', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    // Not indexed for the first two polls, then HALT.
    if (calls < 3) return jsonResponse({ error: { message: 'Unknown transaction' } });
    return jsonResponse({ result: haltLog() });
  };
  const outcome = await waitForTransactionConfirmation(RPC_URL, TXID, {
    fetchImpl,
    sleep: async () => {},
    initialDelayMs: 1,
  });
  assert.equal(outcome.status, TX_STATUS.CONFIRMED);
  assert.equal(calls, 3);
});

test('waitForTransactionConfirmation degrades to pending when the budget is exhausted', async () => {
  // Simulate a clock that jumps past the timeout after the first poll so a
  // never-confirming tx never reports a false success.
  let virtualNow = 0;
  const fetchImpl = async () => jsonResponse({ error: { message: 'Unknown transaction' } });
  const outcome = await waitForTransactionConfirmation(RPC_URL, TXID, {
    fetchImpl,
    sleep: async (ms) => { virtualNow += ms; },
    now: () => virtualNow,
    initialDelayMs: 50,
    timeoutMs: 40,
  });
  assert.equal(outcome.status, TX_STATUS.PENDING);
});

test('waitForTransactionConfirmation returns pending for an empty txid without polling', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return jsonResponse({ result: haltLog() }); };
  const outcome = await waitForTransactionConfirmation(RPC_URL, '', { fetchImpl, sleep: async () => {} });
  assert.equal(outcome.status, TX_STATUS.PENDING);
  assert.equal(calls, 0);
});
