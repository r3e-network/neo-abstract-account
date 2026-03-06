const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const path = require('path');
const { readContractArtifacts } = require('../src/contractArtifacts');
const { parseEnvFile } = require('./env');
const { waitForTx, sendTransaction } = require('./tx');
const { sanitizeHex } = require('../src/metaTx');

async function main() {
  const wif = process.env.TEST_WIF;
  if (!wif) throw new Error('TEST_WIF is required');

  const rpcUrl = 'https://testnet1.neo.coz.io:443';
  const rpcClient = new rpc.RPCClient(rpcUrl);

  const repoRoot = process.cwd();
  const envValues = parseEnvFile(path.join(repoRoot, '.env'));
  const aaHashRaw = process.env.AA_HASH_TESTNET || envValues.VITE_AA_HASH_TESTNET || '';
  const aaHash = sanitizeHex(aaHashRaw);
  if (!/^[0-9a-f]{40}$/.test(aaHash)) {
    throw new Error(`Invalid testnet AA hash: ${aaHashRaw}`);
  }

  const { nefBase64, manifestString: manifestFileString } = readContractArtifacts({ fromDir: repoRoot });
  const localManifest = JSON.parse(manifestFileString);

  const currentContractState = await rpcClient.execute(new rpc.Query({
    method: 'getcontractstate',
    params: [`0x${aaHash}`],
  }));
  const currentName = currentContractState?.manifest?.name;
  if (typeof currentName === 'string' && currentName.trim()) {
    localManifest.name = currentName.trim();
  }
  const manifestString = JSON.stringify(localManifest);

  const account = new wallet.Account(wif);
  const version = await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
  const magic = version?.protocol?.network;

  const script = sc.createScript({
    scriptHash: aaHash,
    operation: 'update',
    args: [
      sc.ContractParam.byteArray(nefBase64),
      sc.ContractParam.string(manifestString),
    ],
  });

  const signers = [{ account: account.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];
  const sim = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (sim.state === 'FAULT') {
    throw new Error(`Update simulation fault: ${sim.exception}`);
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
    systemFee: sim.gasconsumed || '100000000',
  });
  const appLog = await waitForTx(rpcClient, txid, {
    timeoutMs: 120000,
    pollIntervalMs: 3000,
    errorMessage: `Timed out waiting for tx confirmation: ${txid}`,
  });
  const vmState = appLog.executions?.[0]?.vmstate || appLog.executions?.[0]?.vmState || 'UNKNOWN';

  console.log(JSON.stringify({
    rpcUrl,
    aaHash: `0x${aaHash}`,
    updaterAddress: account.address,
    updaterScriptHash: `0x${sanitizeHex(account.scriptHash)}`,
    manifestName: localManifest.name,
    txid,
    systemFee: sim.gasconsumed,
    networkFee,
    vmState,
  }, null, 2));

  if (String(vmState).toUpperCase() !== 'HALT') {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('[AA testnet update] FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
