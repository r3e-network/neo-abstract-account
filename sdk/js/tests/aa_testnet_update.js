const { rpc, tx, wallet, sc, u } = require('@cityofzion/neon-js');
const fs = require('fs');
const path = require('path');

function sanitizeHex(v) {
  return String(v || '').replace(/^0x/i, '').toLowerCase();
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

async function waitForTx(rpcClient, txid, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const appLog = await rpcClient.getApplicationLog(txid);
      if (appLog && Array.isArray(appLog.executions) && appLog.executions.length > 0) {
        return appLog;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Timed out waiting for tx confirmation: ${txid}`);
}

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

  const nefPath = path.resolve(repoRoot, 'contracts/AbstractAccount/bin/sc/UnifiedSmartWalletV2.nef');
  const manifestPath = path.resolve(repoRoot, 'contracts/AbstractAccount/bin/sc/UnifiedSmartWalletV2.manifest.json');
  const nefBase64 = fs.readFileSync(nefPath).toString('base64');
  const localManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Preserve immutable contract name when upgrading an existing deployment.
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
  let transaction = new tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim.gasconsumed || '100000000',
  });

  transaction.sign(account, magic);
  const networkFee = await rpcClient.calculateNetworkFee(transaction);

  transaction = new tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim.gasconsumed || '100000000',
    networkFee,
  });
  transaction.sign(account, magic);

  const txid = await rpcClient.sendRawTransaction(transaction);
  const appLog = await waitForTx(rpcClient, txid);
  const vmState = appLog.executions?.[0]?.vmstate || appLog.executions?.[0]?.vmState || 'UNKNOWN';

  console.log(JSON.stringify({
    rpcUrl,
    aaHash: `0x${aaHash}`,
    updaterAddress: account.address,
    updaterScriptHash: `0x${sanitizeHex(account.scriptHash)}`,
    manifestName: localManifest.name,
    txid,
    systemFee: sim.gasconsumed,
    networkFee: networkFee?.toString?.() || String(networkFee),
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
