const { tx, wallet, rpc, sc, u } = require('@cityofzion/neon-js');
const fs = require('fs');
const { resolveContractArtifactPaths } = require('../src/contractArtifacts');
const { extractDeployedContractHash } = require('../src/deployLog');

const wif = process.env.TEST_WIF;
if (!wif) throw new Error('TEST_WIF required');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const account = new wallet.Account(wif);

async function main() {
  const client = new rpc.RPCClient(rpcUrl);
  const version = await client.getVersion();
  const magic = version.protocol.network;

  const { nefPath, manifestPath } = resolveContractArtifactPaths({ fromDir: __dirname });
  const nefBytes = fs.readFileSync(nefPath);
  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  const nef = sc.NEF.fromBuffer(nefBytes);

  const managementContractHash = 'fffdc93764dbaddd97c48f252a53ea4643faa3fd';

  const sb = new sc.ScriptBuilder();
  sb.emitAppCall(managementContractHash, 'deploy', [
    sc.ContractParam.byteArray(u.HexString.fromHex(nef.serialize(), true)),
    sc.ContractParam.string(manifestRaw),
    sc.ContractParam.any(null),
  ]);
  const script = sb.build();

  const currentHeight = await client.getBlockCount();

  const transaction = new tx.Transaction({
    signers: [{ account: account.scriptHash, scopes: tx.WitnessScope.Global }],
    validUntilBlock: currentHeight + 1000,
    script: u.HexString.fromHex(script),
    systemFee: 5000000000,
    networkFee: 100000000,
  });

  const signed = transaction.sign(account, magic);
  const txid = await client.sendRawTransaction(signed);

  console.log(`Deployed Abstract Account Master: ${txid}`);

  let log;
  for (let i = 0; i < 30; i += 1) {
    try {
      log = await client.getApplicationLog(txid);
      if (log) break;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const vmState = String(log?.executions?.[0]?.vmstate || log?.executions?.[0]?.vmState || 'UNKNOWN').toUpperCase();
  if (vmState !== 'HALT') {
    console.log('FAILED or pending', log?.executions?.[0]?.exception);
    return;
  }

  console.log('SUCCESS. Deployment confirmed on-chain.');
  const deployedHash = extractDeployedContractHash(log);
  if (deployedHash) {
    console.log('Deployed Hash (Hex):', deployedHash);
    return;
  }

  console.log('WARNING. Deployment succeeded, but contract hash could not be extracted from the application log.');
}

main().catch(console.error);
