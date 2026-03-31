#!/usr/bin/env node
/**
 * Deploy AAAddressMarket to testnet and list all 55 vanity accounts for sale.
 *
 * Sequence:
 *   1. Deploy new AA Core (with market escrow methods)
 *   2. Deploy AAAddressMarket
 *   3. Deploy NeoNativeVerifier (minimal verifier for account registration)
 *   4. Register all 55 accounts on-chain
 *   5. Create market listings for each account
 *
 * Usage:
 *   node scripts/deploy_market_and_list.js
 *
 * Environment:
 *   WIF is hardcoded for testnet disposable account.
 *   DB connection reads from Neon DB.
 */

const fs = require('fs');
const path = require('path');
const { rpc, sc, tx, wallet, experimental, u, CONST } = require('@cityofzion/neon-js');

const { extractDeployedContractHash } = require('../sdk/js/src/deployLog');
const { sanitizeHex } = require('../sdk/js/src/metaTx');

// ── Config ──────────────────────────────────────────────────────────────────

const WIF = 'Kx2BeyUv1dBr99QtjrRsE7xxQqcHHZJmEWXvV8ivyShgWq7BbA4U';
const RPC_URLS = [
  'http://seed1t5.neo.org:20332',
  'http://seed2t5.neo.org:20332',
  'http://seed3t5.neo.org:20332',
  'http://seed4t5.neo.org:20332',
  'http://seed5t5.neo.org:20332',
];
const NEON_DB_URL = 'postgresql://neondb_owner:npg_jUF8Jf0YdKbw@ep-noisy-bar-annbarx2-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const GAS_HASH = CONST.NATIVE_CONTRACT_HASH.GasToken;
const DEPLOY_TAG = `market-${Date.now().toString(36)}`;
const ZERO_HASH160 = '0000000000000000000000000000000000000000';

// Price tiers (GAS has 8 decimals)
const PRICE_MIRROR = 50_00000000n;      // 50 GAS
const PRICE_NAMED = 100_00000000n;      // 100 GAS
const PRICE_PREFIX = 10_00000000n;       // 10 GAS
const PRICE_ULTRA = 200_00000000n;       // 200 GAS
const PRICE_COMPOUND = 25_00000000n;     // 25 GAS (multi-token patterns like NR3EBTC)

const RESULTS_FILE = path.resolve(__dirname, '..', 'market-deployment-results.json');

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRpcError(error) {
  const msg = error instanceof Error ? error.message : String(error || '');
  return /socket hang up|ECONNRESET|ETIMEDOUT|fetch failed|network error|EAI_AGAIN|ECONNREFUSED|EADDRNOTAVAIL/i.test(msg);
}

async function withRpcRetry(label, fn, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableRpcError(error) || attempt >= attempts) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`  [rpc-retry] ${label} attempt ${attempt}/${attempts}: ${msg}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

function artifactPaths(baseName) {
  const base = path.resolve(__dirname, '..', 'contracts', 'bin', 'v3');
  return {
    nef: path.join(base, `${baseName}.nef`),
    manifest: path.join(base, `${baseName}.manifest.json`),
  };
}

function loadArtifact(baseName, uniqueSuffix) {
  const paths = artifactPaths(baseName);
  const nef = sc.NEF.fromBuffer(fs.readFileSync(paths.nef));
  const manifestJson = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
  manifestJson.name = `${manifestJson.name}-${uniqueSuffix}`;
  const manifest = sc.ContractManifest.fromJson(manifestJson);
  return { nef, manifest };
}

function normalizeHash(value) {
  const hex = sanitizeHex(value || '');
  return hex ? `0x${hex}` : '';
}

function buildConfig(account, networkMagic) {
  return { account, networkMagic, rpcAddress: RPC_URLS[0], blocksTillExpiry: 200 };
}

function hash160Param(value) { return sc.ContractParam.hash160(sanitizeHex(value)); }
function integerParam(value) { return sc.ContractParam.integer(typeof value === 'bigint' ? value.toString() : String(value)); }
function stringParam(value) { return sc.ContractParam.string(String(value)); }
function byteArrayParam(hexValue = '') { return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hexValue), true)); }

function makeSigner(scriptHash) {
  return new tx.Signer({ account: scriptHash, scopes: tx.WitnessScope.CalledByEntry });
}

function makeCustomContractSigner(scriptHash, allowedContracts = []) {
  return new tx.Signer({
    account: scriptHash,
    scopes: tx.WitnessScope.CustomContracts,
    allowedContracts: allowedContracts.map((v) => sanitizeHex(v)),
  });
}

async function waitForAppLog(client, txid, label, timeoutMs = 300000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const appLog = await client.getApplicationLog(txid);
      if (appLog?.executions?.length) return appLog;
    } catch (_) {}
    await sleep(3000);
  }
  throw new Error(`${label}: timed out waiting for application log for ${txid}`);
}

function assertVmState(appLog, label, expected = 'HALT') {
  const execution = appLog?.executions?.[0];
  if (!execution) throw new Error(`${label}: missing execution log`);
  const vmState = String(execution.vmstate || execution.state || '');
  if (!vmState.includes(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${vmState} -- ${execution.exception || ''}`.trim());
  }
  return execution;
}

// ── Contract Operations ─────────────────────────────────────────────────────

async function deployContract(client, account, networkMagic, baseName, uniqueSuffix) {
  const { nef, manifest } = loadArtifact(baseName, uniqueSuffix);
  const predictedHash = normalizeHash(experimental.getContractHash(account.scriptHash, nef.checksum, manifest.name));
  console.log(`  Deploying ${baseName} (suffix: ${uniqueSuffix})...`);
  console.log(`  Predicted hash: ${predictedHash}`);
  const txid = await withRpcRetry(`deploy ${baseName}`, () =>
    experimental.deployContract(nef, manifest, buildConfig(account, networkMagic))
  );
  console.log(`  TX: ${txid}`);
  const appLog = await waitForAppLog(client, txid, `deploy ${baseName}`);
  assertVmState(appLog, `deploy ${baseName}`, 'HALT');
  const hash = normalizeHash(extractDeployedContractHash(appLog) || predictedHash);
  console.log(`  Deployed: ${hash}`);
  return { txid, hash, manifestName: manifest.name };
}

async function invokePersisted(client, contractHash, account, networkMagic, operation, params = [], signers = undefined) {
  const contract = new experimental.SmartContract(sanitizeHex(contractHash), buildConfig(account, networkMagic));
  const preview = await withRpcRetry(`${operation}.preview`, () =>
    contract.testInvoke(operation, params, signers)
  );
  const systemFeeOverride = String(preview?.state || '').includes('FAULT')
    ? u.BigInteger.fromDecimal('1', 8)
    : u.BigInteger.fromDecimal(preview.gasconsumed, 0);
  const txid = await withRpcRetry(
    `${operation}.invoke`,
    () => new experimental.SmartContract(
      sanitizeHex(contractHash),
      { ...buildConfig(account, networkMagic), systemFeeOverride }
    ).invoke(operation, params, signers),
  );
  const appLog = await waitForAppLog(client, txid, operation);
  assertVmState(appLog, operation, 'HALT');
  return { txid, appLog };
}

async function invokeMultiPersisted(client, account, networkMagic, calls = [], signers = undefined) {
  const builder = new sc.ScriptBuilder();
  for (const call of calls) {
    builder.emitAppCall(sanitizeHex(call.scriptHash), call.operation, call.args || []);
  }
  const scriptHex = builder.build();
  const transaction = new tx.Transaction();
  transaction.script = u.HexString.fromHex(scriptHex);
  await experimental.txHelpers.setBlockExpiry(transaction, buildConfig(account, networkMagic), 200);
  transaction.signers = signers && signers.length > 0 ? signers : [makeSigner(account.scriptHash)];
  const preview = await withRpcRetry('invokeScript', () =>
    client.invokeScript(scriptHex, transaction.signers)
  ).catch(() => null);
  if (preview && !String(preview?.state || '').includes('FAULT')) {
    transaction.systemFee = u.BigInteger.fromDecimal(preview.gasconsumed, 0);
  } else {
    transaction.systemFee = u.BigInteger.fromDecimal('1', 8);
  }
  await experimental.txHelpers.addFees(transaction, buildConfig(account, networkMagic));
  transaction.sign(account, networkMagic);
  const txid = await withRpcRetry('sendRawTransaction', () => client.sendRawTransaction(transaction));
  const appLog = await waitForAppLog(client, txid, 'invokeMulti');
  assertVmState(appLog, 'invokeMulti', 'HALT');
  return { txid, appLog };
}

// ── Price Classification ────────────────────────────────────────────────────

function classifyPrice(pattern) {
  const p = pattern.toUpperCase();
  if (p.startsWith('ULTRA')) return PRICE_ULTRA;
  if (p.startsWith('MIRROR')) return PRICE_MIRROR;

  // Named patterns (contain recognizable brand names)
  const namedPatterns = ['TRUMP', 'NVIDIA', 'BITCOIN'];
  for (const name of namedPatterns) {
    if (p.includes(name)) return PRICE_NAMED;
  }

  // Compound token patterns like NR3EBTC, NNeoBTC, NNeoETH, NNeoNGD, NNeoNNT, NR3ENGD, etc.
  const compoundTokens = ['BTC', 'ETH', 'NGD', 'NNT', 'NEO', 'R3E', 'COZ'];
  let tokenCount = 0;
  for (const tok of compoundTokens) {
    if (p.includes(tok)) tokenCount++;
  }
  if (tokenCount >= 2) return PRICE_COMPOUND;

  // Named ecosystem patterns
  if (p.includes('NEOVM') || p.includes('NEOFS') || p.includes('CRYPTO')) return PRICE_COMPOUND;

  // Simple prefix patterns
  return PRICE_PREFIX;
}

// ── DB Access ───────────────────────────────────────────────────────────────

async function loadAccountsFromDB() {
  // Use psql via child_process since pg module may not be installed in this project
  const { execSync } = require('child_process');
  const query = "SELECT id, pattern, address, account_id_hash, script_hash, verify_script FROM aa_accounts ORDER BY id";
  const env = { ...process.env, PGPASSWORD: 'npg_jUF8Jf0YdKbw' };
  const result = execSync(
    `psql -h ep-noisy-bar-annbarx2-pooler.c-6.us-east-1.aws.neon.tech -U neondb_owner -d neondb -t -A -F '|' -c "${query}"`,
    { env, encoding: 'utf8', timeout: 30000 }
  );
  const rows = result.trim().split('\n').filter(Boolean).map((line) => {
    const [id, pattern, address, account_id_hash, script_hash, verify_script] = line.split('|');
    return { id: parseInt(id), pattern, address, account_id_hash, script_hash, verify_script };
  });
  return rows;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const account = new wallet.Account(WIF);
  const client = new rpc.RPCClient(RPC_URLS[0]);
  const version = await withRpcRetry('getVersion', () => client.getVersion());
  const networkMagic = Number(version.protocol.network);

  console.log('=== AA Address Market Deployment ===');
  console.log(`Deployer: ${account.address} (${normalizeHash(account.scriptHash)})`);
  console.log(`RPC: ${RPC_URLS[0]}`);
  console.log(`Network Magic: ${networkMagic}`);
  console.log(`Deploy Tag: ${DEPLOY_TAG}`);
  console.log('');

  // Step 1: Deploy contracts
  console.log('[1/5] Deploying AA Core (with market escrow)...');
  const core = await deployContract(client, account, networkMagic, 'UnifiedSmartWalletV3', `${DEPLOY_TAG}-core`);
  console.log(`  AA Core deployed: ${core.hash}`);
  console.log('');

  console.log('[2/5] Deploying AAAddressMarket...');
  const market = await deployContract(client, account, networkMagic, 'AAAddressMarket', `${DEPLOY_TAG}-market`);
  console.log(`  Market deployed: ${market.hash}`);
  console.log('');

  console.log('[3/5] Deploying NeoNativeVerifier...');
  const verifier = await deployContract(client, account, networkMagic, 'NeoNativeVerifier', `${DEPLOY_TAG}-verifier`);
  console.log(`  Verifier deployed: ${verifier.hash}`);
  console.log('');

  // Step 2: Load accounts from DB
  console.log('[4/5] Registering 55 vanity accounts on-chain...');
  const accounts = await loadAccountsFromDB();
  console.log(`  Loaded ${accounts.length} accounts from Neon DB`);

  // Register accounts in batches (multi-invoke to avoid nonce conflicts)
  const BATCH_SIZE = 5;
  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE);
    const batchLabel = `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(accounts.length / BATCH_SIZE)}`;
    console.log(`  ${batchLabel}: registering accounts ${batch[0].id}-${batch[batch.length - 1].id}...`);

    const calls = batch.map((acct) => ({
      scriptHash: core.hash,
      operation: 'registerAccount',
      args: [
        hash160Param(acct.account_id_hash),
        hash160Param(verifier.hash),
        byteArrayParam(sanitizeHex(account.publicKey)),
        hash160Param(ZERO_HASH160),
        hash160Param(account.scriptHash),
        integerParam(604800),
      ],
    }));

    try {
      const result = await invokeMultiPersisted(client, account, networkMagic, calls, [
        makeSigner(account.scriptHash),
      ]);
      console.log(`  ${batchLabel}: OK (tx: ${result.txid})`);
    } catch (err) {
      console.error(`  ${batchLabel}: FAILED - ${err.message}`);
      // Try one-by-one fallback for this batch
      for (const acct of batch) {
        try {
          console.log(`    Retrying account ${acct.id} individually...`);
          await invokePersisted(client, core.hash, account, networkMagic, 'registerAccount', [
            hash160Param(acct.account_id_hash),
            hash160Param(verifier.hash),
            byteArrayParam(sanitizeHex(account.publicKey)),
            hash160Param(ZERO_HASH160),
            hash160Param(account.scriptHash),
            integerParam(604800),
          ], [makeSigner(account.scriptHash)]);
          console.log(`    Account ${acct.id}: OK`);
        } catch (retryErr) {
          console.error(`    Account ${acct.id}: FAILED - ${retryErr.message}`);
        }
      }
    }
  }
  console.log('');

  // Step 3: Create market listings
  console.log('[5/5] Creating market listings for all accounts...');
  const listings = [];

  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE);
    const batchLabel = `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(accounts.length / BATCH_SIZE)}`;
    console.log(`  ${batchLabel}: listing accounts ${batch[0].id}-${batch[batch.length - 1].id}...`);

    // Listings must be done one-by-one because createListing allocates sequential IDs
    // and the market escrow call needs CalledByEntry witness scope from the seller
    // through the market contract into the core. Use CustomContracts scope.
    for (const acct of batch) {
      const price = classifyPrice(acct.pattern);
      const title = `${acct.pattern} | ${acct.address}`;
      const truncatedTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;

      try {
        const result = await invokePersisted(client, market.hash, account, networkMagic, 'createListing', [
          hash160Param(core.hash),
          hash160Param(acct.account_id_hash),
          integerParam(price),
          stringParam(truncatedTitle),
          stringParam(''),
        ], [makeCustomContractSigner(account.scriptHash, [market.hash, core.hash])]);

        const priceGas = Number(price) / 1e8;
        listings.push({
          dbId: acct.id,
          pattern: acct.pattern,
          address: acct.address,
          accountIdHash: acct.account_id_hash,
          priceGas,
          txid: result.txid,
        });
        console.log(`    #${acct.id} ${acct.pattern} (${priceGas} GAS): OK`);
      } catch (err) {
        console.error(`    #${acct.id} ${acct.pattern}: FAILED - ${err.message}`);
      }
    }
  }

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    deployTag: DEPLOY_TAG,
    network: 'testnet',
    networkMagic,
    deployer: { address: account.address, scriptHash: normalizeHash(account.scriptHash) },
    contracts: {
      aaCore: core,
      market: market,
      verifier: verifier,
    },
    totalAccounts: accounts.length,
    totalListings: listings.length,
    listings,
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log('');
  console.log('=== Deployment Complete ===');
  console.log(`AA Core: ${core.hash}`);
  console.log(`Market:  ${market.hash}`);
  console.log(`Verifier: ${verifier.hash}`);
  console.log(`Listings: ${listings.length}/${accounts.length}`);
  console.log(`Results saved to: ${RESULTS_FILE}`);
  console.log('');
  console.log('Update frontend/.env:');
  console.log(`  VITE_AA_MARKET_HASH=${market.hash}`);
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
