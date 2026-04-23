const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_TESTNET_RPC_URLS,
  resolveTestnetRpcCandidates,
  resolveTestnetRpcUrl,
  splitRpcList,
} = require('./testnet-rpc');

test('splitRpcList handles comma and whitespace separated RPC candidates', () => {
  assert.deepEqual(
    splitRpcList(' https://a.example,https://b.example\nhttp://c.example\t'),
    ['https://a.example', 'https://b.example', 'http://c.example'],
  );
});

test('resolveTestnetRpcCandidates prefers explicit env values and appends defaults once', () => {
  const candidates = resolveTestnetRpcCandidates({
    TESTNET_RPC_URLS: 'https://preferred-a.example https://preferred-b.example',
    TESTNET_RPC_URL: 'https://preferred-a.example',
    NEO_RPC_URL: 'https://preferred-c.example',
  });

  assert.deepEqual(
    candidates.slice(0, 3),
    ['https://preferred-a.example', 'https://preferred-b.example', 'https://preferred-c.example'],
  );
  assert.deepEqual(candidates.slice(3), DEFAULT_TESTNET_RPC_URLS);
});

test('resolveTestnetRpcUrl returns the first reachable RPC candidate', async () => {
  const fetchImpl = async (url) => {
    if (url === 'https://bad.example') {
      throw new Error('socket hang up');
    }
    return {
      ok: true,
      async json() {
        return { jsonrpc: '2.0', id: 1, result: { protocol: { network: 894710606 } } };
      },
    };
  };

  const rpcUrl = await resolveTestnetRpcUrl({
    env: { TESTNET_RPC_URLS: 'https://bad.example https://good.example' },
    fetchImpl,
  });

  assert.equal(rpcUrl, 'https://good.example');
});

test('resolveTestnetRpcUrl throws when no candidates are reachable', async () => {
  await assert.rejects(
    () => resolveTestnetRpcUrl({
      env: { TESTNET_RPC_URLS: 'https://bad-a.example https://bad-b.example' },
      fetchImpl: async () => { throw new Error('timeout'); },
    }),
    /No reachable Neo N3 testnet RPC endpoint found/,
  );
});
