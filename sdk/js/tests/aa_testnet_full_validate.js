const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');
const { buildMetaTransactionTypedData, sanitizeHex } = require('../src/metaTx');
const path = require('path');
const crypto = require('crypto');
const { parseEnvFile } = require('./env');
const { waitForTx, sendTransaction } = require('./tx');
const { bindRpcHelpers } = require('./rpc');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const rpcClient = new rpc.RPCClient(rpcUrl);
const { invokeRead, simulate } = bindRpcHelpers({ rpcClient, sc, u });
const GAS_TOKEN_HASH = 'd2a4cff31913016155e38e474a2c06d08be276cf';

function randomAccountIdHex(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function cpHash160(hex) {
  return sc.ContractParam.hash160(sanitizeHex(hex));
}

function cpByteArray(hex) {
  return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hex), false));
}

// Preserve byte order for cryptographic payloads (pubkeys, hashes, signatures).
function cpByteArrayRaw(hex) {
  return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hex), true));
}

function cpArray(items = []) {
  return sc.ContractParam.array(...items);
}

function decodeByteStringToHex(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return Buffer.from(item.value, 'base64').toString('hex').toLowerCase();
}

function decodeInteger(item) {
  if (!item) return 0;
  const v = Number(item.value);
  return Number.isFinite(v) ? v : 0;
}

function normalizeReadByteString(hex) {
  const clean = sanitizeHex(hex);
  if (!clean) return '';
  return sanitizeHex(u.reverseHex(clean));
}

async function sendInvocation({ account, magic, aaHash, operation, args, witnessScope = tx.WitnessScope.CalledByEntry }) {
  const signers = [{ account: account.scriptHash, scopes: witnessScope }];
  const script = sc.createScript({ scriptHash: aaHash, operation, args });

  const sim = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (sim.state === 'FAULT') {
    throw new Error(`${operation} simulation fault: ${sim.exception}`);
  }

  const currentHeight = await rpcClient.getBlockCount();
  const { txid, networkFee } = await sendTransaction({
    rpcClient,
    txModule: tx,
    account,
    magic,
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim.gasconsumed || '1000000',
  });
  const appLog = await waitForTx(rpcClient, txid);

  if (vmState !== 'HALT') {
    throw new Error(`${operation} tx vmstate ${vmState}`);
  }

  return {
    txid,
    systemFee: sim.gasconsumed,
    networkFee,
  };
}

async function computeArgsHash(aaHash, args) {
  const res = await invokeRead(aaHash, 'computeArgsHash', [cpArray(args)]);
  return decodeByteStringToHex(res.stack?.[0]);
}

async function computeArgsHashForMetaExecution({
  aaHash,
  useAddress,
  accountIdHex,
  accountAddressHash,
  method,
  args,
  nonce,
}) {
  return computeArgsHash(aaHash, args);
}

function buildTypedData({ chainId, verifyingContract, accountIdHex, targetContract, method, argsHashHex, nonce, deadline }) {
  return buildMetaTransactionTypedData({
    chainId,
    verifyingContract,
    accountIdHex,
    targetContract,
    method,
    argsHashHex,
    nonce,
    deadline,
  });
}

async function executeMetaTx({
  account,
  magic,
  aaHash,
  useAddress,
  accountIdHex,
  accountAddressHash,
  signerWallet,
  method,
  methodArgs,
  methodArgsBuilder,
  methodArgsAlternativeBuilders = [],
}) {
  const buildMethodArgs = typeof methodArgsBuilder === 'function'
    ? methodArgsBuilder
    : () => (Array.isArray(methodArgs) ? [...methodArgs] : []);
  const allArgsBuilders = [buildMethodArgs, ...methodArgsAlternativeBuilders.filter((fn) => typeof fn === 'function')];
  const signerAddressHex = sanitizeHex(signerWallet.address);
  const nonceRes = await invokeRead(
    aaHash,
    useAddress ? 'getNonceForAddress' : 'getNonceForAccount',
    useAddress
      ? [cpHash160(accountAddressHash), cpHash160(signerAddressHex)]
      : [cpByteArray(accountIdHex), cpHash160(signerAddressHex)]
  );
  const nonce = decodeInteger(nonceRes.stack?.[0]);
  let accountIdForSignature = sanitizeHex(accountIdHex);
  if (accountAddressHash) {
    const idByAddressRes = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountAddressHash)]);
    const resolvedRawId = decodeByteStringToHex(idByAddressRes.stack?.[0]);
    if (resolvedRawId) {
      accountIdForSignature = resolvedRawId;
    }
  }

  const deadline = Math.floor(Date.now() / 1000) + 7200;
  const fullPubKey = sanitizeHex(signerWallet.signingKey.publicKey);
  const pubKeyCandidates = [];
  if (fullPubKey.length === 130) {
    pubKeyCandidates.push(fullPubKey);
    pubKeyCandidates.push(fullPubKey.slice(2)); // x||y (64-byte form)
  } else if (fullPubKey.length === 128) {
    pubKeyCandidates.push(fullPubKey);
  } else {
    throw new Error(`Unsupported signer public key length: ${fullPubKey.length}`);
  }

  const operation = useAddress ? 'executeMetaTxByAddress' : 'executeMetaTx';
  let txResult = null;
  let lastError = null;
  let selectedArgsHash = null;
  let selectedArgsVariant = null;
  const attemptedArgsHashes = [];
  for (let builderIdx = 0; builderIdx < allArgsBuilders.length; builderIdx++) {
    const currentBuilder = allArgsBuilders[builderIdx];
    const argsForHash = currentBuilder();
    const argsHashHex = await computeArgsHashForMetaExecution({
      aaHash,
      useAddress,
      accountIdHex,
      accountAddressHash,
      method,
      args: argsForHash,
      nonce,
    });
    if (!argsHashHex || argsHashHex.length !== 64) {
      throw new Error(`Invalid args hash for ${method}: ${argsHashHex}`);
    }
    const argsHashCandidates = [argsHashHex];
    const reversedArgsHash = sanitizeHex(u.reverseHex(argsHashHex));
    if (reversedArgsHash && reversedArgsHash.length === 64 && reversedArgsHash !== argsHashHex) {
      argsHashCandidates.push(reversedArgsHash);
    }
    attemptedArgsHashes.push(...argsHashCandidates);

    for (const candidateArgsHash of argsHashCandidates) {
      const typedData = buildTypedData({
        chainId: magic,
        verifyingContract: aaHash,
        accountIdHex: accountIdForSignature,
        targetContract: aaHash,
        method,
        argsHashHex: candidateArgsHash,
        nonce,
        deadline,
      });
      const signature = await signerWallet.signTypedData(typedData.domain, typedData.types, typedData.message);
      const sigNoRecovery = sanitizeHex(signature).slice(0, 128);

      for (const candidatePubKey of pubKeyCandidates) {
        try {
          const argsForCall = currentBuilder();
          txResult = await sendInvocation({
            account,
            magic,
            aaHash,
            operation,
            args: [
              useAddress ? cpHash160(accountAddressHash) : cpByteArray(accountIdHex),
              cpArray([cpByteArrayRaw(candidatePubKey)]),
              cpHash160(aaHash),
              sc.ContractParam.string(method),
              cpArray(argsForCall),
              cpByteArrayRaw(candidateArgsHash),
              sc.ContractParam.integer(nonce),
              sc.ContractParam.integer(deadline),
              cpArray([cpByteArrayRaw(sigNoRecovery)]),
            ],
          });
          txResult.pubKeyHex = candidatePubKey;
          selectedArgsHash = candidateArgsHash;
          selectedArgsVariant = builderIdx;
          break;
        } catch (e) {
          lastError = e;
        }
      }
      if (txResult) break;
    }
    if (txResult) break;
  }
  if (!txResult) {
    const attempted = attemptedArgsHashes.join(',');
    const baseMessage = lastError && lastError.message ? lastError.message : `Unable to execute ${operation}`;
    throw new Error(`${baseMessage} (argsHash attempts: ${attempted})`);
  }

  return { ...txResult, argsHashHex: selectedArgsHash, argsVariant: selectedArgsVariant, nonceBefore: nonce, signerAddressHex };
}

function buildSetWhitelistByAddressArgs(accountAddressHash, targetContractHash, allowed) {
  return [
    cpHash160(accountAddressHash),
    cpHash160(targetContractHash),
    sc.ContractParam.boolean(!!allowed),
  ];
}

function buildSetWhitelistByAddressArgsAsByteArray(accountAddressHash, targetContractHash, allowed) {
  return [
    cpByteArrayRaw(accountAddressHash),
    cpByteArrayRaw(targetContractHash),
    sc.ContractParam.boolean(!!allowed),
  ];
}

function buildSetWhitelistByAddressArgsAsByteArrayReversed(accountAddressHash, targetContractHash, allowed) {
  return [
    cpByteArray(accountAddressHash),
    cpByteArray(targetContractHash),
    sc.ContractParam.boolean(!!allowed),
  ];
}

function buildSetWhitelistByAddressArgsAsIntegerFlag(accountAddressHash, targetContractHash, allowed) {
  return [
    cpHash160(accountAddressHash),
    cpHash160(targetContractHash),
    sc.ContractParam.integer(allowed ? 1 : 0),
  ];
}

function buildSetWhitelistByAddressArgsAsByteArrayIntegerFlag(accountAddressHash, targetContractHash, allowed) {
  return [
    cpByteArrayRaw(accountAddressHash),
    cpByteArrayRaw(targetContractHash),
    sc.ContractParam.integer(allowed ? 1 : 0),
  ];
}

function buildSetWhitelistByAddressArgsAsByteArrayReversedIntegerFlag(accountAddressHash, targetContractHash, allowed) {
  return [
    cpByteArray(accountAddressHash),
    cpByteArray(targetContractHash),
    sc.ContractParam.integer(allowed ? 1 : 0),
  ];
}

function buildSetWhitelistModeByAddressArgs(accountAddressHash, enabled) {
  return [
    cpHash160(accountAddressHash),
    sc.ContractParam.boolean(!!enabled),
  ];
}

function buildSetWhitelistModeByAddressArgsAsByteArray(accountAddressHash, enabled) {
  return [
    cpByteArrayRaw(accountAddressHash),
    sc.ContractParam.boolean(!!enabled),
  ];
}

function buildSetWhitelistModeByAddressArgsAsByteArrayReversed(accountAddressHash, enabled) {
  return [
    cpByteArray(accountAddressHash),
    sc.ContractParam.boolean(!!enabled),
  ];
}

function buildSetWhitelistModeByAddressArgsAsIntegerFlag(accountAddressHash, enabled) {
  return [
    cpHash160(accountAddressHash),
    sc.ContractParam.integer(enabled ? 1 : 0),
  ];
}

function buildSetWhitelistModeByAddressArgsAsByteArrayIntegerFlag(accountAddressHash, enabled) {
  return [
    cpByteArrayRaw(accountAddressHash),
    sc.ContractParam.integer(enabled ? 1 : 0),
  ];
}

function buildSetWhitelistModeByAddressArgsAsByteArrayReversedIntegerFlag(accountAddressHash, enabled) {
  return [
    cpByteArray(accountAddressHash),
    sc.ContractParam.integer(enabled ? 1 : 0),
  ];
}

function buildSetWhitelistModeByAccountIdArgs(accountIdHex, enabled) {
  return [
    cpByteArray(accountIdHex),
    sc.ContractParam.boolean(!!enabled),
  ];
}

function buildSetWhitelistModeByAccountIdArgsRaw(accountIdHex, enabled) {
  return [
    cpByteArrayRaw(accountIdHex),
    sc.ContractParam.boolean(!!enabled),
  ];
}

function buildSetWhitelistModeByAccountIdArgsIntegerFlag(accountIdHex, enabled) {
  return [
    cpByteArray(accountIdHex),
    sc.ContractParam.integer(enabled ? 1 : 0),
  ];
}

function deriveAaAddressFromId(aaHash, accountIdHex) {
  const verifyScript = sc.createScript({
    scriptHash: aaHash,
    operation: 'verify',
    args: [cpByteArray(accountIdHex)],
  });
  const addressScriptHash = sanitizeHex(u.reverseHex(u.hash160(verifyScript)));
  const address = wallet.getAddressFromScriptHash(addressScriptHash);
  return { addressScriptHash, address };
}

async function main() {
  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF is required');

  const repoRoot = process.cwd();
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) {
    throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);
  }

  const owner = new wallet.Account(wif);
  const ownerScriptHash = sanitizeHex(owner.scriptHash);
  const version = await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
  const magic = version?.protocol?.network;
  if (!magic) throw new Error('Missing network magic');

  const summary = {
    rpcUrl,
    aaHash: `0x${aaHash}`,
    ownerAddress: owner.address,
    ownerScriptHash: `0x${ownerScriptHash}`,
    txs: [],
    checks: [],
  };

  const check = (name, condition, details = null) => {
    summary.checks.push({ name, pass: !!condition, details });
    if (!condition) {
      throw new Error(`Check failed: ${name}${details ? ` :: ${details}` : ''}`);
    }
  };

  const ownerSigner = [{ account: ownerScriptHash, scopes: tx.WitnessScope.CalledByEntry }];

  // Account A: native admin+manager path
  const accountIdA = randomAccountIdHex(16);
  const accountA = deriveAaAddressFromId(aaHash, accountIdA);
  summary.accountA = { accountIdHex: accountIdA, accountAddress: accountA.address, accountAddressScriptHash: `0x${accountA.addressScriptHash}` };

  summary.txs.push({
    step: 'createAccountWithAddress(A)',
    ...(await sendInvocation({
      account: owner,
      magic,
      aaHash,
      operation: 'createAccountWithAddress',
      args: [
        cpByteArray(accountIdA),
        cpHash160(accountA.addressScriptHash),
        cpArray([cpHash160(ownerScriptHash)]),
        sc.ContractParam.integer(1),
        cpArray([cpHash160(ownerScriptHash)]),
        sc.ContractParam.integer(1),
      ],
    })),
  });

  const adminsAById = await invokeRead(aaHash, 'getAdmins', [cpByteArray(accountIdA)]);
  const adminsAByAddr = await invokeRead(aaHash, 'getAdminsByAddress', [cpHash160(accountA.addressScriptHash)]);
  const adminThresholdAById = await invokeRead(aaHash, 'getAdminThreshold', [cpByteArray(accountIdA)]);
  const adminThresholdAByAddr = await invokeRead(aaHash, 'getAdminThresholdByAddress', [cpHash160(accountA.addressScriptHash)]);
  const managersAById = await invokeRead(aaHash, 'getManagers', [cpByteArray(accountIdA)]);
  const managersAByAddr = await invokeRead(aaHash, 'getManagersByAddress', [cpHash160(accountA.addressScriptHash)]);
  const managerThresholdAById = await invokeRead(aaHash, 'getManagerThreshold', [cpByteArray(accountIdA)]);
  const managerThresholdAByAddr = await invokeRead(aaHash, 'getManagerThresholdByAddress', [cpHash160(accountA.addressScriptHash)]);
  const idByAddressA = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountA.addressScriptHash)]);
  const addressByIdA = await invokeRead(aaHash, 'getAccountAddress', [cpByteArray(accountIdA)]);

  check('A admins by id count == 1', (adminsAById.stack?.[0]?.value || []).length === 1);
  check('A admins by address count == 1', (adminsAByAddr.stack?.[0]?.value || []).length === 1);
  check('A admin threshold by id == 1', String(adminThresholdAById.stack?.[0]?.value) === '1');
  check('A admin threshold by address == 1', String(adminThresholdAByAddr.stack?.[0]?.value) === '1');
  check('A managers by id count == 1', (managersAById.stack?.[0]?.value || []).length === 1);
  check('A managers by address count == 1', (managersAByAddr.stack?.[0]?.value || []).length === 1);
  check('A manager threshold by id == 1', String(managerThresholdAById.stack?.[0]?.value) === '1');
  check('A manager threshold by address == 1', String(managerThresholdAByAddr.stack?.[0]?.value) === '1');

  const idAReadRaw = decodeByteStringToHex(idByAddressA.stack?.[0]);
  const idAReadNormalized = normalizeReadByteString(idAReadRaw);
  const addressAReadRaw = decodeByteStringToHex(addressByIdA.stack?.[0]);
  const addressAReadNormalized = normalizeReadByteString(addressAReadRaw);

  check('A getAccountIdByAddress matches accountId', idAReadNormalized === accountIdA, `raw=${idAReadRaw}`);
  check('A getAccountAddress matches address hash', addressAReadNormalized === accountA.addressScriptHash, `raw=${addressAReadRaw}`);

  const nonceOwnerGlobal = await invokeRead(aaHash, 'getNonce', [cpHash160(ownerScriptHash)]);
  const nonceAByAccount = await invokeRead(aaHash, 'getNonceForAccount', [cpByteArray(accountIdA), cpHash160(ownerScriptHash)]);
  const nonceAByAddress = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountA.addressScriptHash), cpHash160(ownerScriptHash)]);
  check('A nonce for account initially zero', decodeInteger(nonceAByAccount.stack?.[0]) === 0);
  check('A nonce for address initially zero', decodeInteger(nonceAByAddress.stack?.[0]) === 0);
  summary.nonceOwnerGlobal = String(nonceOwnerGlobal.stack?.[0]?.value || '0');

  const argsHashSample = await computeArgsHash(aaHash, [sc.ContractParam.string('aa-validate')]);
  check('computeArgsHash returns 32-byte hash', /^[0-9a-f]{64}$/.test(argsHashSample), argsHashSample);

  summary.txs.push({ step: 'setAdminsByAddress(A)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setAdminsByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpArray([cpHash160(ownerScriptHash)]), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setManagers(A)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setManagers',
    args: [cpByteArray(accountIdA), cpArray([cpHash160(ownerScriptHash)]), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setManagersByAddress(A)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setManagersByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpArray([cpHash160(ownerScriptHash)]), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setWhitelistMode(A,true)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistMode',
    args: [cpByteArray(accountIdA), sc.ContractParam.boolean(true)],
  }))});

  summary.txs.push({ step: 'setWhitelist(A,aaHash,true)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelist',
    args: [cpByteArray(accountIdA), cpHash160(aaHash), sc.ContractParam.boolean(true)],
  }))});

  const simExecuteA = await simulate(aaHash, 'execute', [cpByteArray(accountIdA), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  const simExecuteByAddressA = await simulate(aaHash, 'executeByAddress', [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('execute(accountId) HALT for A', simExecuteA.state === 'HALT', simExecuteA.exception || '');
  check('executeByAddress HALT for A', simExecuteByAddressA.state === 'HALT', simExecuteByAddressA.exception || '');

  summary.txs.push({ step: 'setBlacklistByAddress(A,aaHash,true)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setBlacklistByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.boolean(true)],
  }))});

  const simBlockedA = await simulate(aaHash, 'executeByAddress', [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('blacklist blocks executeByAddress for A', simBlockedA.state === 'FAULT' && String(simBlockedA.exception || '').includes('blacklisted'), simBlockedA.exception || '');

  summary.txs.push({ step: 'setBlacklist(A,aaHash,false)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setBlacklist',
    args: [cpByteArray(accountIdA), cpHash160(aaHash), sc.ContractParam.boolean(false)],
  }))});

  const simUnblockedA = await simulate(aaHash, 'executeByAddress', [cpHash160(accountA.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('unblacklist restores executeByAddress for A', simUnblockedA.state === 'HALT', simUnblockedA.exception || '');

  summary.txs.push({ step: 'setMaxTransferByAddress(A,GAS,1)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setMaxTransferByAddress',
    args: [cpHash160(accountA.addressScriptHash), cpHash160(GAS_TOKEN_HASH), sc.ContractParam.integer(1)],
  }))});

  summary.txs.push({ step: 'setWhitelistModeByAddress(A,false)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistModeByAddress',
    args: [cpHash160(accountA.addressScriptHash), sc.ContractParam.boolean(false)],
  }))});

  // Account B: create without address then bind
  const accountIdB = randomAccountIdHex(16);
  const accountB = deriveAaAddressFromId(aaHash, accountIdB);
  summary.accountB = { accountIdHex: accountIdB, accountAddress: accountB.address, accountAddressScriptHash: `0x${accountB.addressScriptHash}` };

  const rogueAdminHash = randomAccountIdHex(20);
  const simUnauthorizedCreateB = await simulate(aaHash, 'createAccount', [
    cpByteArray(accountIdB),
    cpArray([cpHash160(rogueAdminHash)]),
    sc.ContractParam.integer(1),
    cpArray(),
    sc.ContractParam.integer(0),
  ], ownerSigner);
  check(
    'unauthorized createAccount simulation fails under bootstrap auth',
    simUnauthorizedCreateB.state === 'FAULT' && String(simUnauthorizedCreateB.exception || '').includes('Unauthorized account initialization'),
    simUnauthorizedCreateB.exception || ''
  );

  summary.txs.push({ step: 'createAccount(B)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'createAccount',
    args: [
      cpByteArray(accountIdB),
      cpArray([cpHash160(ownerScriptHash)]),
      sc.ContractParam.integer(1),
      cpArray(),
      sc.ContractParam.integer(0),
    ],
  }))});

  const idBeforeBindB = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountB.addressScriptHash)]);
  const idBeforeBindHexB = decodeByteStringToHex(idBeforeBindB.stack?.[0]);
  check('B accountId not bound before bind', !idBeforeBindHexB, idBeforeBindHexB || 'null');

  summary.txs.push({ step: 'bindAccountAddress(B)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'bindAccountAddress',
    args: [cpByteArray(accountIdB), cpHash160(accountB.addressScriptHash)],
  }))});

  const idAfterBindB = await invokeRead(aaHash, 'getAccountIdByAddress', [cpHash160(accountB.addressScriptHash)]);
  const addrAfterBindB = await invokeRead(aaHash, 'getAccountAddress', [cpByteArray(accountIdB)]);
  check('B getAccountIdByAddress matches', normalizeReadByteString(decodeByteStringToHex(idAfterBindB.stack?.[0])) === accountIdB);
  check('B getAccountAddress matches', normalizeReadByteString(decodeByteStringToHex(addrAfterBindB.stack?.[0])) === accountB.addressScriptHash);

  // Account C: meta-tx validations (address and accountId paths)
  const ethSigner = ethers.Wallet.createRandom();
  const ethSignerHex = sanitizeHex(ethSigner.address);
  const accountIdC = randomAccountIdHex(16);
  const accountC = deriveAaAddressFromId(aaHash, accountIdC);
  summary.accountC = {
    accountIdHex: accountIdC,
    accountAddress: accountC.address,
    accountAddressScriptHash: `0x${accountC.addressScriptHash}`,
    ethSignerAddress: ethSigner.address,
  };

  summary.txs.push({ step: 'createAccountWithAddress(C owner+eth admin)', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'createAccountWithAddress',
    args: [
      cpByteArray(accountIdC),
      cpHash160(accountC.addressScriptHash),
      cpArray([cpHash160(ownerScriptHash), cpHash160(ethSignerHex)]),
      sc.ContractParam.integer(1),
      cpArray(),
      sc.ContractParam.integer(0),
    ],
  }))});

  const meta1 = await executeMetaTx({
    account: owner,
    magic,
    aaHash,
    useAddress: true,
    accountIdHex: accountIdC,
    accountAddressHash: accountC.addressScriptHash,
    signerWallet: ethSigner,
    method: 'setWhitelistByAddress',
    methodArgsBuilder: () => buildSetWhitelistByAddressArgs(accountC.addressScriptHash, aaHash, true),
    methodArgsAlternativeBuilders: [
      () => buildSetWhitelistByAddressArgsAsByteArray(accountC.addressScriptHash, aaHash, true),
      () => buildSetWhitelistByAddressArgsAsByteArrayReversed(accountC.addressScriptHash, aaHash, true),
      () => buildSetWhitelistByAddressArgsAsIntegerFlag(accountC.addressScriptHash, aaHash, true),
      () => buildSetWhitelistByAddressArgsAsByteArrayIntegerFlag(accountC.addressScriptHash, aaHash, true),
      () => buildSetWhitelistByAddressArgsAsByteArrayReversedIntegerFlag(accountC.addressScriptHash, aaHash, true),
      () => [cpArray(buildSetWhitelistByAddressArgs(accountC.addressScriptHash, aaHash, true))],
      () => [cpArray(buildSetWhitelistByAddressArgsAsByteArray(accountC.addressScriptHash, aaHash, true))],
      () => [cpArray(buildSetWhitelistByAddressArgsAsByteArrayReversed(accountC.addressScriptHash, aaHash, true))],
    ],
  });
  summary.txs.push({ step: 'metaTxByAddress setWhitelistByAddress(C,aaHash,true)', ...meta1 });

  const nonceAfterMeta1 = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountC.addressScriptHash), cpHash160(ethSignerHex)]);
  check('C nonce after meta1 == 1', decodeInteger(nonceAfterMeta1.stack?.[0]) === 1);

  const meta2 = await executeMetaTx({
    account: owner,
    magic,
    aaHash,
    useAddress: true,
    accountIdHex: accountIdC,
    accountAddressHash: accountC.addressScriptHash,
    signerWallet: ethSigner,
    method: 'setWhitelistModeByAddress',
    methodArgsBuilder: () => buildSetWhitelistModeByAddressArgs(accountC.addressScriptHash, true),
    methodArgsAlternativeBuilders: [
      () => buildSetWhitelistModeByAddressArgsAsByteArray(accountC.addressScriptHash, true),
      () => buildSetWhitelistModeByAddressArgsAsByteArrayReversed(accountC.addressScriptHash, true),
      () => buildSetWhitelistModeByAddressArgsAsIntegerFlag(accountC.addressScriptHash, true),
      () => buildSetWhitelistModeByAddressArgsAsByteArrayIntegerFlag(accountC.addressScriptHash, true),
      () => buildSetWhitelistModeByAddressArgsAsByteArrayReversedIntegerFlag(accountC.addressScriptHash, true),
      () => [cpArray(buildSetWhitelistModeByAddressArgs(accountC.addressScriptHash, true))],
      () => [cpArray(buildSetWhitelistModeByAddressArgsAsByteArray(accountC.addressScriptHash, true))],
      () => [cpArray(buildSetWhitelistModeByAddressArgsAsByteArrayReversed(accountC.addressScriptHash, true))],
    ],
  });
  summary.txs.push({ step: 'metaTxByAddress setWhitelistModeByAddress(C,true)', ...meta2 });

  const nonceAfterMeta2 = await invokeRead(aaHash, 'getNonceForAddress', [cpHash160(accountC.addressScriptHash), cpHash160(ethSignerHex)]);
  check('C nonce after meta2 == 2', decodeInteger(nonceAfterMeta2.stack?.[0]) === 2);

  const simExecCWhitelisted = await simulate(aaHash, 'executeByAddress', [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('C executeByAddress HALT while whitelisted + whitelist mode on', simExecCWhitelisted.state === 'HALT', simExecCWhitelisted.exception || '');

  summary.txs.push({ step: 'setWhitelistByAddress(C,aaHash,false) native', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistByAddress',
    args: [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.boolean(false)],
  }))});

  const simExecCBlocked = await simulate(aaHash, 'executeByAddress', [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('C executeByAddress FAULT when whitelist mode on and target removed', simExecCBlocked.state === 'FAULT' && String(simExecCBlocked.exception || '').includes('whitelist'), simExecCBlocked.exception || '');

  summary.txs.push({ step: 'setWhitelistByAddress(C,aaHash,true) native', ...(await sendInvocation({
    account: owner,
    magic,
    aaHash,
    operation: 'setWhitelistByAddress',
    args: [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.boolean(true)],
  }))});

  const meta3 = await executeMetaTx({
    account: owner,
    magic,
    aaHash,
    useAddress: false,
    accountIdHex: accountIdC,
    accountAddressHash: accountC.addressScriptHash,
    signerWallet: ethSigner,
    method: 'setWhitelistMode',
    methodArgsBuilder: () => buildSetWhitelistModeByAccountIdArgs(accountIdC, false),
    methodArgsAlternativeBuilders: [
      () => buildSetWhitelistModeByAccountIdArgsRaw(accountIdC, false),
      () => buildSetWhitelistModeByAccountIdArgsIntegerFlag(accountIdC, false),
      () => [cpArray(buildSetWhitelistModeByAccountIdArgs(accountIdC, false))],
      () => [cpArray(buildSetWhitelistModeByAccountIdArgsRaw(accountIdC, false))],
    ],
  });
  summary.txs.push({ step: 'metaTx(accountId) setWhitelistMode(C,false)', ...meta3 });

  const nonceAfterMeta3ByAccount = await invokeRead(aaHash, 'getNonceForAccount', [cpByteArray(accountIdC), cpHash160(ethSignerHex)]);
  check('C nonce after meta3 (accountId path) == 3', decodeInteger(nonceAfterMeta3ByAccount.stack?.[0]) === 3);

  const simExecCAfterModeOff = await simulate(aaHash, 'executeByAddress', [cpHash160(accountC.addressScriptHash), cpHash160(aaHash), sc.ContractParam.string('getNonce'), cpArray([cpHash160(ownerScriptHash)])], ownerSigner);
  check('C executeByAddress HALT after whitelist mode off', simExecCAfterModeOff.state === 'HALT', simExecCAfterModeOff.exception || '');

  summary.result = 'PASS';
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[AA full validation] FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
