import test from 'node:test';
import assert from 'node:assert/strict';

import { MORPHEUS_PUBLIC_REGISTRY } from '../src/config/generatedMorpheusRegistry.js';
import { getRuntimeConfig } from '../src/config/runtimeConfig.js';

test('runtime defaults are derived from the generated Morpheus public registry', () => {
  const mainnet = getRuntimeConfig({});
  const testnet = getRuntimeConfig({ VITE_AA_NETWORK: 'testnet' });

  assert.equal(mainnet.abstractAccountHash, MORPHEUS_PUBLIC_REGISTRY.mainnet.contracts.aaCore.replace(/^0x/i, ''));
  assert.equal(mainnet.abstractAccountDomain, MORPHEUS_PUBLIC_REGISTRY.mainnet.domains.aa);
  assert.equal(mainnet.rpcUrl, MORPHEUS_PUBLIC_REGISTRY.mainnet.rpcUrl);
  assert.equal(mainnet.neoDidDomain, MORPHEUS_PUBLIC_REGISTRY.mainnet.domains.neodid);
  assert.equal(mainnet.morpheusApiBaseUrl, MORPHEUS_PUBLIC_REGISTRY.mainnet.morpheus.publicApiUrl);
  assert.equal(mainnet.morpheusOracleCvmId, MORPHEUS_PUBLIC_REGISTRY.mainnet.morpheus.oracleCvmId);

  assert.equal(testnet.abstractAccountHash, MORPHEUS_PUBLIC_REGISTRY.testnet.contracts.aaCore.replace(/^0x/i, ''));
  assert.equal(testnet.rpcUrl, MORPHEUS_PUBLIC_REGISTRY.testnet.rpcUrl);
  assert.equal(testnet.morpheusApiBaseUrl, MORPHEUS_PUBLIC_REGISTRY.testnet.morpheus.publicApiUrl);
  assert.equal(testnet.morpheusDatafeedCvmId, MORPHEUS_PUBLIC_REGISTRY.testnet.morpheus.datafeedCvmId);
});
