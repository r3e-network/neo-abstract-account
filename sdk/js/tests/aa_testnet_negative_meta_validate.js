const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');
const { buildMetaTransactionTypedData, sanitizeHex } = require('../src/metaTx');
const path = require('path');
const crypto = require('crypto');
const { parseEnvFile } = require('./env');
const { assertVmStateHalt, waitForTx, sendTransaction } = require('./tx');
const { bindRpcHelpers } = require('./rpc');
const { bindParamHelpers } = require('./params');
const { bindAccountHelpers } = require('./account');
const { bindStackHelpers } = require('./stack');
const { bindInvocationHelpers } = require('./invoke');
const { bindMetaTxHelpers } = require('./meta');
const { bindWhitelistArgBuilders } = require('./whitelistArgs');
const { bindMetaSearchHelpers } = require('./metaSearch');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { getNetworkMagic, invokeRead, simulate } = bindRpcHelpers({ rpcClient, rpc, sc, u });
const { cpHash160, cpByteArray, cpByteArrayRaw, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
const { randomAccountIdHex, deriveAaAddressFromId } = bindAccountHelpers({ crypto, sc, u, wallet, sanitizeHex, cpByteArray });
const { decodeByteStringToHex, decodeInteger } = bindStackHelpers({ sanitizeHex, u });
const { sendInvocation } = bindInvocationHelpers({ rpcClient, txModule: tx, sc, u, sendTransaction, waitForTx, assertVmStateHalt, waitForConfirmation: true, assertHalt: true });
const { computeArgsHash, buildTypedData, buildArgsHashCandidates, buildPubKeyCandidates, buildExecuteMetaTxArgs, signTypedDataNoRecovery } = bindMetaTxHelpers({ buildMetaTransactionTypedData, invokeRead, cpArray, cpHash160, cpByteArray, cpByteArrayRaw, decodeByteStringToHex, sanitizeHex, reverseHex: u.reverseHex, sc });
const { buildSetWhitelistByAddressArgs } = bindWhitelistArgBuilders({ cpHash160, cpByteArray, cpByteArrayRaw, cpArray, sc });
const { buildMetaExecutionVariants } = bindMetaSearchHelpers({ invokeRead, cpHash160, cpByteArray, sanitizeHex, decodeInteger, decodeByteStringToHex, buildPubKeyCandidates, buildArgsHashCandidates, buildTypedData, computeArgsHash, signTypedDataNoRecovery, buildExecuteMetaTxArgs });

async function findValidMetaPayload({ owner, magic, aaHash, accountIdHex, accountAddressHash, signerWallet, method, methodArgs }) {
  const { variants } = await buildMetaExecutionVariants({
    aaHash,
    useAddress: true,
    accountIdHex,
    accountAddressHash,
    signerWallet,
    magic,
    method,
    methodArgs,
    deadlineSeconds: 3600,
  });

  const signerScope = [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];
  for (const variant of variants) {
    const res = await simulate(aaHash, 'executeMetaTxByAddress', variant.args, signerScope);
    if (res.state === 'HALT') {
      return variant;
    }
  }

  throw new Error('Unable to find a valid baseline executeMetaTxByAddress payload');
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) {
    throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);
  }

  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF required');

  const owner = new wallet.Account(wif);
  const magic = await getNetworkMagic();

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${sanitizeHex(owner.scriptHash)}`,
    account: null,
    txs: [],
    checks: [],
    simulations: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) {
      throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
    }
  };

  const evmSigner = ethers.Wallet.createRandom();
  const wrongSigner = ethers.Wallet.createRandom();
  const accountIdHex = randomAccountIdHex(16);
  const accountInfo = deriveAaAddressFromId(aaHash, accountIdHex);
  summary.account = {
    accountIdHex,
    accountAddress: accountInfo.address,
    accountAddressScriptHash: `0x${accountInfo.addressScriptHash}`,
    evmSignerAddress: evmSigner.address,
    wrongSignerAddress: wrongSigner.address,
  };

  summary.txs.push({
    step: 'createAccountWithAddress(negative-meta)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'createAccountWithAddress',
      args: [
        cpByteArrayRaw(accountIdHex),
        cpHash160(accountInfo.addressScriptHash),
        cpArray([cpHash160(owner.scriptHash), cpHash160(evmSigner.address)]),
        sc.ContractParam.integer(1),
        cpArray([]),
        sc.ContractParam.integer(0),
      ],
    })),
  });

  const initialNonceRes = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSigner.address)]);
  check('initial nonce == 0', decodeInteger(initialNonceRes.stack?.[0]) === 0, String(initialNonceRes.stack?.[0]?.value || '0'));

  const method = 'setWhitelistByAddress';
  const methodArgs = buildSetWhitelistByAddressArgs(accountInfo.addressScriptHash, aaHash, true);
  const baseline = await findValidMetaPayload({
    owner,
    magic,
    aaHash,
    accountIdHex,
    accountAddressHash: accountInfo.addressScriptHash,
    signerWallet: evmSigner,
    method,
    methodArgs,
  });
  summary.account.signatureAccountIdHex = baseline.accountIdForSignature;
  summary.account.validPubKeyLength = baseline.pubKeyHex.length;
  summary.account.validArgsHashHex = baseline.argsHashHex;

  summary.txs.push({
    step: 'valid meta-tx baseline by address',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'executeMetaTxByAddress',
      args: buildExecuteMetaTxArgs({ useAddress: true,
        accountAddressHash: accountInfo.addressScriptHash,
        pubKeyHexes: [baseline.pubKeyHex],
        targetContract: aaHash,
        method,
        methodArgs,
        argsHashHex: baseline.argsHashHex,
        nonce: baseline.nonce,
        deadline: baseline.deadline,
        signatureHexes: [baseline.signatureHex],
      }),
    })),
  });

  const nonceAfterValid = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSigner.address)]);
  check('nonce after valid meta-tx == 1', decodeInteger(nonceAfterValid.stack?.[0]) === 1, String(nonceAfterValid.stack?.[0]?.value || '0'));

  const signerScope = [{ account: owner.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];
  async function expectFault(name, args, expectedSubstring) {
    const res = await simulate(aaHash, 'executeMetaTxByAddress', args, signerScope);
    summary.simulations.push({ name, state: res.state, exception: res.exception || null });
    check(`${name} faults`, res.state === 'FAULT', res.exception || 'expected FAULT');
    check(`${name} reason matches`, String(res.exception || '').includes(expectedSubstring), res.exception || '');
  }

  await expectFault(
    'replay stale nonce',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [baseline.pubKeyHex],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: baseline.argsHashHex,
      nonce: baseline.nonce,
      deadline: baseline.deadline,
      signatureHexes: [baseline.signatureHex],
    }),
    'Invalid Nonce'
  );

  const currentNonce = 1;
  const futureDeadline = Math.floor(Date.now() / 1000) + 3600;
  const expiredDeadline = Math.floor(Date.now() / 1000) - 60;

  const expiredTypedData = buildTypedData({
    chainId: magic,
    verifyingContract: aaHash,
    accountIdHex: baseline.accountIdForSignature,
    targetContract: aaHash,
    method,
    argsHashHex: baseline.argsHashHex,
    nonce: currentNonce,
    deadline: expiredDeadline,
  });
  const expiredSignature = await signTypedDataNoRecovery(evmSigner, expiredTypedData);

  await expectFault(
    'expired deadline',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [baseline.pubKeyHex],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: baseline.argsHashHex,
      nonce: currentNonce,
      deadline: expiredDeadline,
      signatureHexes: [expiredSignature],
    }),
    'Signature expired'
  );

  const tamperedArgsHashHex = `${baseline.argsHashHex.slice(0, 62)}${baseline.argsHashHex.slice(62) === '00' ? '11' : '00'}`;
  const tamperedTypedData = buildTypedData({
    chainId: magic,
    verifyingContract: aaHash,
    accountIdHex: baseline.accountIdForSignature,
    targetContract: aaHash,
    method,
    argsHashHex: tamperedArgsHashHex,
    nonce: currentNonce,
    deadline: futureDeadline,
  });
  const tamperedArgsHashSignature = await signTypedDataNoRecovery(evmSigner, tamperedTypedData);

  await expectFault(
    'tampered args hash',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [baseline.pubKeyHex],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: tamperedArgsHashHex,
      nonce: currentNonce,
      deadline: futureDeadline,
      signatureHexes: [tamperedArgsHashSignature],
    }),
    'Args hash mismatch'
  );

  const wrongChainTypedData = buildTypedData({
    chainId: magic + 1,
    verifyingContract: aaHash,
    accountIdHex: baseline.accountIdForSignature,
    targetContract: aaHash,
    method,
    argsHashHex: baseline.argsHashHex,
    nonce: currentNonce,
    deadline: futureDeadline,
  });
  const wrongChainSignature = await signTypedDataNoRecovery(evmSigner, wrongChainTypedData);

  await expectFault(
    'wrong chain id signature',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [baseline.pubKeyHex],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: baseline.argsHashHex,
      nonce: currentNonce,
      deadline: futureDeadline,
      signatureHexes: [wrongChainSignature],
    }),
    'Invalid EIP-712 signature'
  );

  const wrongVerifyingTypedData = buildTypedData({
    chainId: magic,
    verifyingContract: `deadbeef${aaHash.slice(8)}`,
    accountIdHex: baseline.accountIdForSignature,
    targetContract: aaHash,
    method,
    argsHashHex: baseline.argsHashHex,
    nonce: currentNonce,
    deadline: futureDeadline,
  });
  const wrongVerifyingSignature = await signTypedDataNoRecovery(evmSigner, wrongVerifyingTypedData);

  await expectFault(
    'wrong verifying contract signature',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [baseline.pubKeyHex],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: baseline.argsHashHex,
      nonce: currentNonce,
      deadline: futureDeadline,
      signatureHexes: [wrongVerifyingSignature],
    }),
    'Invalid EIP-712 signature'
  );

  const wrongPubKeyFull = sanitizeHex(wrongSigner.signingKey.publicKey);
  const wrongPubKey = baseline.pubKeyHex.length === 128 ? wrongPubKeyFull.slice(2) : wrongPubKeyFull;
  const correctTypedData = buildTypedData({
    chainId: magic,
    verifyingContract: aaHash,
    accountIdHex: baseline.accountIdForSignature,
    targetContract: aaHash,
    method,
    argsHashHex: baseline.argsHashHex,
    nonce: currentNonce,
    deadline: futureDeadline,
  });
  const correctSignature = await signTypedDataNoRecovery(evmSigner, correctTypedData);

  await expectFault(
    'mismatched pubkey and signature',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [wrongPubKey],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: baseline.argsHashHex,
      nonce: currentNonce,
      deadline: futureDeadline,
      signatureHexes: [correctSignature],
    }),
    'Invalid EIP-712 signature'
  );

  await expectFault(
    'invalid signature length',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [baseline.pubKeyHex],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: baseline.argsHashHex,
      nonce: currentNonce,
      deadline: futureDeadline,
      signatureHexes: [correctSignature.slice(0, 126)],
    }),
    'Invalid signature length'
  );

  await expectFault(
    'mismatched signer arrays',
    buildExecuteMetaTxArgs({ useAddress: true,
      accountAddressHash: accountInfo.addressScriptHash,
      pubKeyHexes: [baseline.pubKeyHex, wrongPubKey],
      targetContract: aaHash,
      method,
      methodArgs,
      argsHashHex: baseline.argsHashHex,
      nonce: currentNonce,
      deadline: futureDeadline,
      signatureHexes: [correctSignature],
    }),
    'Mismatched pubkeys and signatures'
  );

  const nonceAfterNegatives = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountInfo.addressScriptHash), cpHash160(evmSigner.address)]);
  check('nonce unchanged after negative simulations', decodeInteger(nonceAfterNegatives.stack?.[0]) === 1, String(nonceAfterNegatives.stack?.[0]?.value || '0'));

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[aa_testnet_negative_meta_validate] FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
