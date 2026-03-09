const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadMetaSearchModule() {
  const modulePath = path.join(__dirname, 'metaSearch.js');
  assert.equal(fs.existsSync(modulePath), true, 'expected shared meta search helper module to exist');
  return require('./metaSearch');
}

test('bindMetaSearchHelpers exposes buildMetaExecutionVariants', () => {
  const { bindMetaSearchHelpers } = loadMetaSearchModule();
  assert.equal(typeof bindMetaSearchHelpers, 'function');

  const helpers = bindMetaSearchHelpers({
    invokeRead: async () => ({ stack: [] }),
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    decodeInteger: () => 0,
    decodeByteStringToHex: () => '',
    buildPubKeyCandidates: () => [],
    buildArgsHashCandidates: () => [],
    buildTypedData: (value) => value,
    computeArgsHash: async () => 'ab'.repeat(32),
    signTypedDataNoRecovery: async () => 'cd'.repeat(64),
    buildExecuteMetaTxArgs: (value) => value,
  });

  assert.equal(typeof helpers.buildMetaExecutionVariants, 'function');
});

test('buildMetaExecutionVariants resolves address-path context and emits variants', async () => {
  const calls = [];
  const { bindMetaSearchHelpers } = loadMetaSearchModule();
  const { buildMetaExecutionVariants } = bindMetaSearchHelpers({
    invokeRead: async (scriptHash, operation, args) => {
      calls.push(['invokeRead', scriptHash, operation, args]);
      if (operation === 'getNonceForAddress') {
        return { stack: [{ value: '5' }] };
      }
      if (operation === 'getAccountIdByAddress') {
        return { stack: [{ value: 'resolved-id' }] };
      }
      throw new Error(`unexpected operation ${operation}`);
    },
    cpHash160: (value) => `hash:${value}`,
    cpByteArray: (value) => `bytes:${value}`,
    cpByteArrayRaw: (value) => `raw:${value}`,
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    decodeInteger: (item) => Number(item?.value || 0),
    decodeByteStringToHex: (item) => item?.value || '',
    buildPubKeyCandidates: (value) => {
      calls.push(['buildPubKeyCandidates', value]);
      return ['pub-a', 'pub-b'];
    },
    buildArgsHashCandidates: (value) => {
      calls.push(['buildArgsHashCandidates', value]);
      return [value, 'ef'.repeat(32)];
    },
    buildTypedData: (value) => {
      calls.push(['buildTypedData', value]);
      return { payload: value };
    },
    computeArgsHash: async (aaHash, args) => {
      calls.push(['computeArgsHash', aaHash, args]);
      return 'ab'.repeat(32);
    },
    signTypedDataNoRecovery: async (signerWallet, typedData) => {
      calls.push(['signTypedDataNoRecovery', signerWallet.address, typedData]);
      return '12'.repeat(64);
    },
    buildExecuteMetaTxArgs: (value) => {
      calls.push(['buildExecuteMetaTxArgs', value]);
      return { args: value };
    },
  });

  const result = await buildMetaExecutionVariants({
    aaHash: 'aa55',
    useAddress: true,
    accountIdHex: '0xABC',
    accountAddressHash: '0xDEF',
    signerWallet: {
      address: '0x1234',
      signingKey: { publicKey: 'PUBKEY' },
    },
    magic: 42,
    method: 'setWhitelistByAddress',
    methodArgs: ['m1'],
    deadlineSeconds: 3600,
    nowSeconds: () => 100,
  });

  assert.deepEqual(result.attemptedArgsHashes, ['ab'.repeat(32), 'ef'.repeat(32)]);
  assert.equal(result.variants.length, 4);
  assert.deepEqual(result.variants[0], {
    args: {
      args: {
        useAddress: true,
        accountIdHex: '0xABC',
        accountAddressHash: '0xDEF',
        pubKeyHexes: ['pub-a'],
        targetContract: 'aa55',
        method: 'setWhitelistByAddress',
        methodArgs: ['m1'],
        argsHashHex: 'ab'.repeat(32),
        nonce: 5,
        deadline: 3700,
        signatureHexes: ['12'.repeat(64)],
      },
    },
    argsHashHex: 'ab'.repeat(32),
    argsVariant: 0,
    pubKeyHex: 'pub-a',
    nonce: 5,
    deadline: 3700,
    signerAddressHex: '1234',
    accountIdForSignature: 'resolved-id',
    signatureHex: '12'.repeat(64),
  });
  assert.deepEqual(calls.slice(0, 4), [
    ['invokeRead', 'aa55', 'getNonceForAddress', ['hash:0xDEF', 'hash:1234']],
    ['invokeRead', 'aa55', 'getAccountIdByAddress', ['hash:0xDEF']],
    ['buildPubKeyCandidates', 'PUBKEY'],
    ['computeArgsHash', 'aa55', ['m1']],
  ]);
});

test('buildMetaExecutionVariants supports account-path alternative builders and reports builder indexes', async () => {
  const { bindMetaSearchHelpers } = loadMetaSearchModule();
  const { buildMetaExecutionVariants } = bindMetaSearchHelpers({
    invokeRead: async (scriptHash, operation) => {
      if (operation === 'getNonceForAccount') {
        return { stack: [{ value: '2' }] };
      }
      throw new Error(`unexpected operation ${operation}`);
    },
    cpHash160: (value) => `hash:${value}`,
    cpByteArray: (value) => `bytes:${value}`,
    cpByteArrayRaw: (value) => `raw:${value}`,
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    decodeInteger: (item) => Number(item?.value || 0),
    decodeByteStringToHex: (item) => item?.value || '',
    buildPubKeyCandidates: () => ['pub-a'],
    buildArgsHashCandidates: (value) => [value],
    buildTypedData: (value) => ({ payload: value }),
    computeArgsHash: async (_aaHash, args) => args[0] === 'primary' ? 'ab'.repeat(32) : 'cd'.repeat(32),
    signTypedDataNoRecovery: async () => '12'.repeat(64),
    buildExecuteMetaTxArgs: (value) => ({ args: value }),
  });

  const result = await buildMetaExecutionVariants({
    aaHash: 'aa55',
    useAddress: false,
    accountIdHex: '0xBEEF',
    signerWallet: {
      address: '0x5678',
      signingKey: { publicKey: 'PUBKEY' },
    },
    magic: 42,
    method: 'setWhitelistMode',
    methodArgsBuilder: () => ['primary'],
    methodArgsAlternativeBuilders: [() => ['secondary']],
    deadlineSeconds: 10,
    nowSeconds: () => 20,
  });

  assert.deepEqual(result.attemptedArgsHashes, ['ab'.repeat(32), 'cd'.repeat(32)]);
  assert.equal(result.variants.length, 2);
  assert.equal(result.variants[0].argsVariant, 0);
  assert.equal(result.variants[1].argsVariant, 1);
  assert.equal(result.variants[0].accountIdForSignature, 'beef');
  assert.equal(result.variants[0].deadline, 30);
});

test('buildMetaExecutionVariants throws when computeArgsHash returns an invalid hash', async () => {
  const { bindMetaSearchHelpers } = loadMetaSearchModule();
  const { buildMetaExecutionVariants } = bindMetaSearchHelpers({
    invokeRead: async () => ({ stack: [{ value: '1' }] }),
    cpHash160: (value) => value,
    cpByteArray: (value) => value,
    cpByteArrayRaw: (value) => value,
    sanitizeHex: (value) => String(value).replace(/^0x/i, '').toLowerCase(),
    decodeInteger: (item) => Number(item?.value || 0),
    decodeByteStringToHex: () => '',
    buildPubKeyCandidates: () => ['pub-a'],
    buildArgsHashCandidates: (value) => [value],
    buildTypedData: (value) => ({ payload: value }),
    computeArgsHash: async () => 'short',
    signTypedDataNoRecovery: async () => '12'.repeat(64),
    buildExecuteMetaTxArgs: (value) => ({ args: value }),
  });

  await assert.rejects(
    () => buildMetaExecutionVariants({
      aaHash: 'aa55',
      useAddress: false,
      accountIdHex: '0xBEEF',
      signerWallet: { address: '0x5678', signingKey: { publicKey: 'PUBKEY' } },
      magic: 42,
      method: 'setWhitelistMode',
      methodArgs: ['primary'],
    }),
    /Invalid args hash for setWhitelistMode: short/
  );
});
