#!/usr/bin/env node
/**
 * Phase 2: Deploy TEEVerifier, register accounts on the already-deployed core,
 * and create market listings.
 *
 * Phase 1 deployed:
 *   AA Core:  0x2818ce328d6a7a92ff2c0200fe7cb2c76bee8870
 *   Market:   0x8dbd4cf6fc47afc013e7fd7128d028db2985bddf
 *   Verifier: (NeoNativeVerifier - wrong, needs TEEVerifier)
 */

const fs = require('fs');
const path = require('path');
const { rpc, sc, tx, wallet, experimental, u, CONST } = require('@cityofzion/neon-js');

const { extractDeployedContractHash } = require('../sdk/js/src/deployLog');
const { sanitizeHex } = require('../sdk/js/src/metaTx');

// ── Config ──────────────────────────────────────────────────────────────────

const WIF = 'Kx2BeyUv1dBr99QtjrRsE7xxQqcHHZJmEWXvV8ivyShgWq7BbA4U';
const RPC_URL = 'http://seed1t5.neo.org:20332';
const GAS_HASH = CONST.NATIVE_CONTRACT_HASH.GasToken;

// Already-deployed contracts from phase 1
const CORE_HASH = '0x2818ce328d6a7a92ff2c0200fe7cb2c76bee8870';
const MARKET_HASH = '0x8dbd4cf6fc47afc013e7fd7128d028db2985bddf';

const DEPLOY_TAG = 'market-mneku8bc';
const ZERO_HASH160 = '0000000000000000000000000000000000000000';

// Price tiers (GAS has 8 decimals)
const PRICE_MIRROR = 50_00000000n;
const PRICE_NAMED = 100_00000000n;
const PRICE_PREFIX = 10_00000000n;
const PRICE_ULTRA = 200_00000000n;
const PRICE_COMPOUND = 25_00000000n;

const RESULTS_FILE = path.resolve(__dirname, '..', 'market-deployment-results.json');

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function isRetryableRpcError(error) {
  const msg = error instanceof Error ? error.message : String(error || '');
  return /socket hang up|ECONNRESET|ETIMEDOUT|fetch failed|network error|EAI_AGAIN|ECONNREFUSED|EADDRNOTAVAIL/i.test(msg);
}

async function withRpcRetry(label, fn, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await fn(); } catch (error) {
      lastError = error;
      if (!isRetryableRpcError(error) || attempt >= attempts) throw error;
      console.warn(`  [retry] ${label} ${attempt}/${attempts}: ${error.message?.substring(0, 80)}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

function artifactPaths(baseName) {
  const base = path.resolve(__dirname, '..', 'contracts', 'bin', 'v3');
  return { nef: path.join(base, `${baseName}.nef`), manifest: path.join(base, `${baseName}.manifest.json`) };
}

function loadArtifact(baseName, uniqueSuffix) {
  const paths = artifactPaths(baseName);
  const nef = sc.NEF.fromBuffer(fs.readFileSync(paths.nef));
  const manifestJson = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
  manifestJson.name = `${manifestJson.name}-${uniqueSuffix}`;
  return { nef, manifest: sc.ContractManifest.fromJson(manifestJson) };
}

function normalizeHash(v) { const h = sanitizeHex(v || ''); return h ? `0x${h}` : ''; }
function buildConfig(account, networkMagic) { return { account, networkMagic, rpcAddress: RPC_URL, blocksTillExpiry: 200 }; }
function hash160Param(v) { return sc.ContractParam.hash160(sanitizeHex(v)); }
function integerParam(v) { return sc.ContractParam.integer(typeof v === 'bigint' ? v.toString() : String(v)); }
function stringParam(v) { return sc.ContractParam.string(String(v)); }
function byteArrayParam(hex = '') { return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(hex), true)); }
function makeSigner(sh) { return new tx.Signer({ account: sh, scopes: tx.WitnessScope.CalledByEntry }); }
function makeCustomContractSigner(sh, contracts = []) {
  return new tx.Signer({ account: sh, scopes: tx.WitnessScope.CustomContracts, allowedContracts: contracts.map(sanitizeHex) });
}

async function waitForAppLog(client, txid, label, timeoutMs = 300000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { const a = await client.getApplicationLog(txid); if (a?.executions?.length) return a; } catch (_) {}
    await sleep(3000);
  }
  throw new Error(`${label}: timed out for ${txid}`);
}

function assertVmState(appLog, label, expected = 'HALT') {
  const ex = appLog?.executions?.[0];
  if (!ex) throw new Error(`${label}: missing execution log`);
  const vs = String(ex.vmstate || ex.state || '');
  if (!vs.includes(expected)) throw new Error(`${label}: ${expected} != ${vs} -- ${ex.exception || ''}`.trim());
  return ex;
}

async function deployContract(client, account, networkMagic, baseName, uniqueSuffix) {
  const { nef, manifest } = loadArtifact(baseName, uniqueSuffix);
  const predictedHash = normalizeHash(experimental.getContractHash(account.scriptHash, nef.checksum, manifest.name));
  console.log(`  Deploying ${baseName}...`);
  const txid = await withRpcRetry(`deploy ${baseName}`, () => experimental.deployContract(nef, manifest, buildConfig(account, networkMagic)));
  console.log(`  TX: ${txid}`);
  const appLog = await waitForAppLog(client, txid, `deploy ${baseName}`);
  assertVmState(appLog, `deploy ${baseName}`, 'HALT');
  const hash = normalizeHash(extractDeployedContractHash(appLog) || predictedHash);
  console.log(`  Deployed: ${hash}`);
  return { txid, hash };
}

async function invokePersisted(client, contractHash, account, networkMagic, operation, params = [], signers = undefined) {
  const contract = new experimental.SmartContract(sanitizeHex(contractHash), buildConfig(account, networkMagic));
  const preview = await withRpcRetry(`${operation}.preview`, () => contract.testInvoke(operation, params, signers));
  const sysFee = String(preview?.state || '').includes('FAULT')
    ? u.BigInteger.fromDecimal('1', 8)
    : u.BigInteger.fromDecimal(preview.gasconsumed, 0);
  const txid = await withRpcRetry(`${operation}.invoke`, () =>
    new experimental.SmartContract(sanitizeHex(contractHash), { ...buildConfig(account, networkMagic), systemFeeOverride: sysFee }).invoke(operation, params, signers)
  );
  const appLog = await waitForAppLog(client, txid, operation);
  assertVmState(appLog, operation, 'HALT');
  return { txid, appLog };
}

// ── Price Classification ────────────────────────────────────────────────────

function classifyPrice(pattern) {
  const p = pattern.toUpperCase();
  if (p.startsWith('ULTRA')) return PRICE_ULTRA;
  if (p.startsWith('MIRROR')) return PRICE_MIRROR;
  const namedPatterns = ['TRUMP', 'NVIDIA', 'BITCOIN'];
  for (const name of namedPatterns) { if (p.includes(name)) return PRICE_NAMED; }
  const compoundTokens = ['BTC', 'ETH', 'NGD', 'NNT', 'NEO', 'R3E', 'COZ'];
  let tokenCount = 0;
  for (const tok of compoundTokens) { if (p.includes(tok)) tokenCount++; }
  if (tokenCount >= 2) return PRICE_COMPOUND;
  if (p.includes('NEOVM') || p.includes('NEOFS') || p.includes('CRYPTO')) return PRICE_COMPOUND;
  return PRICE_PREFIX;
}

// ── DB Access ───────────────────────────────────────────────────────────────

function loadAccountsFromDB() {
  const { execSync } = require('child_process');
  const query = "SELECT id, pattern, address, account_id_hash, script_hash, verify_script FROM aa_accounts ORDER BY id";
  const env = { ...process.env, PGPASSWORD: 'npg_jUF8Jf0YdKbw' };
  const result = execSync(
    `psql -h ep-noisy-bar-annbarx2-pooler.c-6.us-east-1.aws.neon.tech -U neondb_owner -d neondb -t -A -F '|' -c "${query}"`,
    { env, encoding: 'utf8', timeout: 30000 }
  );
  return result.trim().split('\n').filter(Boolean).map((line) => {
    const [id, pattern, address, account_id_hash, script_hash, verify_script] = line.split('|');
    return { id: parseInt(id), pattern, address, account_id_hash, script_hash, verify_script };
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const account = new wallet.Account(WIF);
  const client = new rpc.RPCClient(RPC_URL);
  const version = await withRpcRetry('getVersion', () => client.getVersion());
  const networkMagic = Number(version.protocol.network);

  console.log('=== Phase 2: TEEVerifier + Register + List ===');
  console.log(`Deployer: ${account.address}`);
  console.log(`Core: ${CORE_HASH}`);
  console.log(`Market: ${MARKET_HASH}`);
  console.log('');

  // Step 1: Deploy TEEVerifier
  console.log('[1/4] Deploying TEEVerifier...');
  const teeVerifier = await deployContract(client, account, networkMagic, 'TEEVerifier', `${DEPLOY_TAG}-tee`);
  console.log('');

  // Step 2: Authorize the TEEVerifier to accept calls from our AA Core
  console.log('[2/4] Authorizing TEEVerifier for core...');
  await invokePersisted(client, teeVerifier.hash, account, networkMagic, 'setAuthorizedCore', [
    hash160Param(CORE_HASH),
  ]);
  console.log('  TEEVerifier authorized');
  console.log('');

  // Step 3: Register all 55 accounts
  console.log('[3/4] Registering 55 vanity accounts...');
  const accounts = loadAccountsFromDB();
  console.log(`  Loaded ${accounts.length} accounts from DB`);

  let registered = 0;
  let failed = 0;
  for (const acct of accounts) {
    try {
      process.stdout.write(`  #${acct.id} ${acct.pattern}... `);
      await invokePersisted(client, CORE_HASH, account, networkMagic, 'registerAccount', [
        hash160Param(acct.account_id_hash),
        hash160Param(teeVerifier.hash),
        byteArrayParam(sanitizeHex(account.publicKey)),
        hash160Param(ZERO_HASH160),        // no hook
        hash160Param(account.scriptHash),   // backupOwner = our address
        integerParam(604800),               // 7 day escape timelock
      ], [makeSigner(account.scriptHash)]);
      registered++;
      console.log('OK');
    } catch (err) {
      failed++;
      console.log(`FAILED: ${err.message.substring(0, 100)}`);
    }
  }
  console.log(`  Registered: ${registered}, Failed: ${failed}`);
  console.log('');

  // Step 4: Create market listings
  console.log('[4/4] Creating market listings...');
  const listings = [];
  let listOk = 0;
  let listFail = 0;

  for (const acct of accounts) {
    const price = classifyPrice(acct.pattern);
    const title = `${acct.pattern} | ${acct.address}`;
    const truncatedTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;

    try {
      process.stdout.write(`  #${acct.id} ${acct.pattern} (${Number(price) / 1e8} GAS)... `);
      const result = await invokePersisted(client, MARKET_HASH, account, networkMagic, 'createListing', [
        hash160Param(CORE_HASH),
        hash160Param(acct.account_id_hash),
        integerParam(price),
        stringParam(truncatedTitle),
        stringParam(''),
      ], [makeCustomContractSigner(account.scriptHash, [MARKET_HASH, CORE_HASH])]);

      listings.push({
        dbId: acct.id, pattern: acct.pattern, address: acct.address,
        accountIdHash: acct.account_id_hash, priceGas: Number(price) / 1e8, txid: result.txid,
      });
      listOk++;
      console.log('OK');
    } catch (err) {
      listFail++;
      console.log(`FAILED: ${err.message.substring(0, 100)}`);
    }
  }
  console.log(`  Listed: ${listOk}, Failed: ${listFail}`);

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    deployTag: DEPLOY_TAG,
    network: 'testnet',
    networkMagic,
    deployer: { address: account.address, scriptHash: normalizeHash(account.scriptHash) },
    contracts: {
      aaCore: { hash: CORE_HASH },
      market: { hash: MARKET_HASH },
      teeVerifier: teeVerifier,
    },
    totalAccounts: accounts.length,
    registeredCount: registered,
    totalListings: listOk,
    listings,
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log('');
  console.log('=== Complete ===');
  console.log(`AA Core:     ${CORE_HASH}`);
  console.log(`Market:      ${MARKET_HASH}`);
  console.log(`TEEVerifier: ${teeVerifier.hash}`);
  console.log(`Registered:  ${registered}/${accounts.length}`);
  console.log(`Listed:      ${listOk}/${accounts.length}`);
  console.log(`Results:     ${RESULTS_FILE}`);
  console.log('');
  console.log('Frontend .env update:');
  console.log(`  VITE_AA_MARKET_HASH=${MARKET_HASH}`);
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
