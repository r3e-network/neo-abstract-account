const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadMetaModule() {
  const modulePath = path.join(__dirname, 'meta.js');
  assert.equal(fs.existsSync(modulePath), true, 'expected shared meta helper module to exist');
  return require('./meta');
}

test('bindMetaTxHelpers exposes shared meta helper functions', () => {
  const { bindMetaTxHelpers } = loadMetaModule();
  assert.equal(typeof bindMetaTxHelpers, 'function');

  const helpers = bindMetaTxHelpers({
    buildMetaTransactionTypedData: (value) => value,
    invokeRead: async () => ({ stack: [{ value: 'ignored' }] }),
    cpArray: (items) => items,
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    decodeByteStringToHex: () => 'aa',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: { ContractParam: { string: (value) => value, integer: (value) => value } },
  });

  assert.equal(typeof helpers.computeArgsHash, 'function');
  assert.equal(typeof helpers.buildTypedData, 'function');
  assert.equal(typeof helpers.buildArgsHashCandidates, 'function');
  assert.equal(typeof helpers.buildPubKeyCandidates, 'function');
  assert.equal(typeof helpers.buildExecuteMetaTxArgs, 'function');
  assert.equal(typeof helpers.signTypedDataNoRecovery, 'function');
});

test('computeArgsHash calls invokeRead through computeArgsHash and decodes the top stack item', async () => {
  const calls = [];
  const { bindMetaTxHelpers } = loadMetaModule();
  const { computeArgsHash } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: () => {
      throw new Error('not used');
    },
    invokeRead: async (scriptHash, operation, args) => {
      calls.push(['invokeRead', scriptHash, operation, args]);
      return { stack: [{ type: 'ByteString', value: 'stack-item' }] };
    },
    cpArray: (items) => {
      calls.push(['cpArray', items]);
      return `wrapped:${items.length}`;
    },
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    decodeByteStringToHex: (item) => {
      calls.push(['decodeByteStringToHex', item]);
      return 'ab'.repeat(32);
    },
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: { ContractParam: { string: (value) => value, integer: (value) => value } },
  });

  const result = await computeArgsHash('aa55', ['one', 'two']);
  assert.equal(result, 'ab'.repeat(32));
  assert.deepEqual(calls, [
    ['cpArray', ['one', 'two']],
    ['invokeRead', 'aa55', 'computeArgsHash', ['wrapped:2']],
    ['decodeByteStringToHex', { type: 'ByteString', value: 'stack-item' }],
  ]);
});

test('computeArgsHash throws when the decoded hash is empty', async () => {
  const { bindMetaTxHelpers } = loadMetaModule();
  const { computeArgsHash } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: () => {
      throw new Error('not used');
    },
    invokeRead: async () => ({ stack: [{}] }),
    cpArray: (items) => items,
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    decodeByteStringToHex: () => '',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: { ContractParam: { string: (value) => value, integer: (value) => value } },
  });

  await assert.rejects(() => computeArgsHash('aa55', []), /computeArgsHash returned empty stack/);
});

test('buildTypedData delegates to buildMetaTransactionTypedData', () => {
  const calls = [];
  const { bindMetaTxHelpers } = loadMetaModule();
  const { buildTypedData } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: (payload) => {
      calls.push(payload);
      return { payload };
    },
    invokeRead: async () => ({ stack: [] }),
    cpArray: (items) => items,
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    decodeByteStringToHex: () => '',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: { ContractParam: { string: (value) => value, integer: (value) => value } },
  });

  const params = { chainId: 1, verifyingContract: 'aa', accountIdHex: 'bb', targetContract: 'cc', method: 'm', argsHashHex: 'dd', nonce: 2, deadline: 3 };
  assert.deepEqual(buildTypedData(params), { payload: params });
  assert.deepEqual(calls, [params]);
});

test('buildArgsHashCandidates includes the reversed unique candidate', () => {
  const { bindMetaTxHelpers } = loadMetaModule();
  const { buildArgsHashCandidates } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: (payload) => payload,
    invokeRead: async () => ({ stack: [] }),
    cpArray: (items) => items,
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    decodeByteStringToHex: () => '',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: () => 'cd'.repeat(32),
    sc: { ContractParam: { string: (value) => value, integer: (value) => value } },
  });

  assert.deepEqual(buildArgsHashCandidates('ab'.repeat(32)), ['ab'.repeat(32), 'cd'.repeat(32)]);
});

test('buildPubKeyCandidates supports 65-byte and 64-byte uncompressed public keys', () => {
  const { bindMetaTxHelpers } = loadMetaModule();
  const { buildPubKeyCandidates } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: (payload) => payload,
    invokeRead: async () => ({ stack: [] }),
    cpArray: (items) => items,
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    decodeByteStringToHex: () => '',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: { ContractParam: { string: (value) => value, integer: (value) => value } },
  });

  const full = '04' + '11'.repeat(64);
  assert.deepEqual(buildPubKeyCandidates(full), [full, full.slice(2)]);
  assert.deepEqual(buildPubKeyCandidates('22'.repeat(64)), ['22'.repeat(64)]);
  assert.throws(() => buildPubKeyCandidates('33'.repeat(10)), /Unsupported signer public key length: 20/);
});

test('buildExecuteMetaTxArgs assembles address-path meta transaction arguments', () => {
  const calls = [];
  const { bindMetaTxHelpers } = loadMetaModule();
  const { buildExecuteMetaTxArgs } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: (payload) => payload,
    invokeRead: async () => ({ stack: [] }),
    cpArray: (items) => {
      calls.push(['cpArray', items]);
      return { array: items };
    },
    cpHash160: (value) => {
      calls.push(['cpHash160', value]);
      return `hash:${value}`;
    },
    cpByteArray: (value) => {
      calls.push(['cpByteArray', value]);
      return `bytes:${value}`;
    },
    cpByteArrayRaw: (value) => {
      calls.push(['cpByteArrayRaw', value]);
      return `raw:${value}`;
    },
    decodeByteStringToHex: () => '',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: {
      ContractParam: {
        string(value) {
          calls.push(['string', value]);
          return `string:${value}`;
        },
        integer(value) {
          calls.push(['integer', value]);
          return `int:${value}`;
        },
      },
    },
  });

  const args = buildExecuteMetaTxArgs({
    useAddress: true,
    accountAddressHash: 'aa',
    pubKeyHexes: ['pk1'],
    targetContract: 'bb',
    method: 'setWhitelist',
    methodArgs: ['m1'],
    argsHashHex: 'cc',
    nonce: 7,
    deadline: 8,
    signatureHexes: ['sig1'],
  });

  assert.deepEqual(args, [
    'hash:aa',
    { array: ['raw:pk1'] },
    'hash:bb',
    'string:setWhitelist',
    { array: ['m1'] },
    'raw:cc',
    'int:7',
    'int:8',
    { array: ['raw:sig1'] },
  ]);
});

test('buildExecuteMetaTxArgs assembles account-path meta transaction arguments', () => {
  const { bindMetaTxHelpers } = loadMetaModule();
  const { buildExecuteMetaTxArgs } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: (payload) => payload,
    invokeRead: async () => ({ stack: [] }),
    cpArray: (items) => ({ array: items }),
    cpHash160: (value) => `hash:${value}`,
    cpByteArray: (value) => `bytes:${value}`,
    cpByteArrayRaw: (value) => `raw:${value}`,
    decodeByteStringToHex: () => '',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: { ContractParam: { string: (value) => `string:${value}`, integer: (value) => `int:${value}` } },
  });

  const args = buildExecuteMetaTxArgs({
    useAddress: false,
    accountIdHex: 'id1',
    pubKeyHexes: ['pk1'],
    targetContract: 'bb',
    method: 'setWhitelistMode',
    methodArgs: ['m1'],
    argsHashHex: 'cc',
    nonce: 7,
    deadline: 8,
    signatureHexes: ['sig1'],
  });

  assert.deepEqual(args[0], 'bytes:id1');
});

test('signTypedDataNoRecovery strips the recovery byte from the sanitized signature', async () => {
  const { bindMetaTxHelpers } = loadMetaModule();
  const { signTypedDataNoRecovery } = bindMetaTxHelpers({
    buildMetaTransactionTypedData: (payload) => payload,
    invokeRead: async () => ({ stack: [] }),
    cpArray: (items) => items,
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    decodeByteStringToHex: () => '',
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    reverseHex: (value) => value,
    sc: { ContractParam: { string: (value) => value, integer: (value) => value } },
  });

  const result = await signTypedDataNoRecovery({
    async signTypedData(domain, types, message) {
      assert.deepEqual(domain, { a: 1 });
      assert.deepEqual(types, { b: 2 });
      assert.deepEqual(message, { c: 3 });
      return `0x${'ab'.repeat(65)}`;
    },
  }, { domain: { a: 1 }, types: { b: 2 }, message: { c: 3 } });

  assert.equal(result, 'ab'.repeat(64));
});
