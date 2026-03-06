const { rpc, sc, u, tx, wallet } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');
const { buildMetaTransactionTypedData, sanitizeHex } = require('../src/metaTx');
const { bindRpcHelpers } = require('./rpc');
const { bindParamHelpers } = require('./params');
const { bindMetaTxHelpers } = require('./meta');
const { decodeByteStringToHex } = require('./stack');

const aaHash = sanitizeHex(
  process.env.AA_HASH_TESTNET
  || process.env.VITE_AA_HASH_TESTNET
  || '711c1899a3b7fa0e055ae0d17c9acfcd1bef6423'
);

async function main() {
  const rpcUrl = 'https://testnet1.neo.coz.io:443';
  const rpcClient = new rpc.RPCClient(rpcUrl);
  const { getNetworkMagic, invokeRead } = bindRpcHelpers({ rpcClient, rpc, sc, u });
  const { cpHash160, cpByteArray, cpByteArrayRaw, cpArray } = bindParamHelpers({ sc, u, sanitizeHex });
  const { computeArgsHash, buildTypedData, buildExecuteMetaTxArgs, signTypedDataNoRecovery } = bindMetaTxHelpers({ buildMetaTransactionTypedData, invokeRead, cpArray, cpHash160, cpByteArray, cpByteArrayRaw, decodeByteStringToHex, sanitizeHex, reverseHex: u.reverseHex, sc });

  console.log('Checking ExecuteMetaTx with valid EVM public key...');

  const evmWallet = ethers.Wallet.createRandom();
  const uncompressedPubKey = sanitizeHex(evmWallet.signingKey.publicKey);
  const accountId = uncompressedPubKey;
  const deployerWif = process.env.TEST_WIF;
  if (!deployerWif) {
    throw new Error('Missing TEST_WIF');
  }
  const deployerAccount = new wallet.Account(deployerWif);

  const targetContract = aaHash;
  const method = 'getNonceForAccount';
  const nonce = 0;
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const argsParam = [
    sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)),
    sc.ContractParam.hash160(deployerAccount.scriptHash),
  ];

  const argsHash = await computeArgsHash(aaHash, argsParam);

  const chainId = await getNetworkMagic('Unable to resolve network magic');

  const { domain, types, message } = buildTypedData({
    chainId,
    verifyingContract: aaHash,
    accountIdHex: accountId,
    targetContract,
    method,
    argsHashHex: argsHash,
    nonce,
    deadline,
  });

  const pureSignature = await signTypedDataNoRecovery(evmWallet, { domain, types, message });

  const sb = new sc.ScriptBuilder();
  sb.emitAppCall(aaHash, 'createAccount', [
    sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)),
    {
      type: 'Array',
      value: [
        sc.ContractParam.hash160(deployerAccount.scriptHash),
        sc.ContractParam.hash160(evmWallet.address.slice(2)),
      ],
    },
    sc.ContractParam.integer(1),
    { type: 'Array', value: [] },
    sc.ContractParam.integer(0),
  ]);

  sb.emitAppCall(aaHash, 'executeMetaTx', buildExecuteMetaTxArgs({
    useAddress: false,
    accountIdHex: accountId,
    accountParam: sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)),
    pubKeyHexes: [uncompressedPubKey],
    targetContract,
    method,
    methodArgs: argsParam,
    argsHashHex: argsHash,
    nonce,
    deadline,
    signatureHexes: [pureSignature],
  }));

  const execRes = await rpcClient.invokeScript(
    u.HexString.fromHex(sb.build()),
    [{ account: deployerAccount.scriptHash, scopes: tx.WitnessScope.Global }]
  );
  console.log(JSON.stringify(execRes, null, 2));

  if (execRes.state !== 'HALT') {
    process.exit(1);
  }
}

main().catch(console.error);
