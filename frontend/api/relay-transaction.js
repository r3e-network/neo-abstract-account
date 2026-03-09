import { createRequire } from 'node:module';
import { DEFAULT_ABSTRACT_ACCOUNT_HASH, resolveAbstractAccountHash, resolveOptionalBoolean } from '../src/config/runtimeConfig.js';
import { convertContractParamFromJson, normalizeRelayPayload, sanitizeMetaInvocationForRelay } from './relayHelpers.js';
import { checkRateLimit, sanitizeError } from './rateLimiter.js';

const RAW_TRANSACTION_PATTERN = /^(0x)?[0-9a-fA-F]+$/;
const MAX_RAW_TRANSACTION_LENGTH = 200000;

function getSdkRequire() {
  return createRequire(new URL('../../sdk/js/package.json', import.meta.url));
}

async function getNetworkMagic(rpcClient, rpc) {
  const version = typeof rpcClient?.getVersion === 'function'
    ? await rpcClient.getVersion()
    : await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
  const magic = version?.protocol?.network;
  if (!magic) {
    throw new Error('Missing network magic');
  }
  return magic;
}

function loadRelayInvocationContext({ rpcUrl, relayWif }) {
  const sdkRequire = getSdkRequire();
  const { rpc, tx, wallet, sc, u } = sdkRequire('@cityofzion/neon-js');
  const rpcClient = new rpc.RPCClient(rpcUrl);
  const account = new wallet.Account(relayWif);
  return { rpc, tx, wallet, sc, u, rpcClient, account };
}

function buildInvocationScript({ invocation, sc, u }) {
  const args = invocation.args.map((param) => convertContractParamFromJson(param, { sc, u }));
  return sc.createScript({
    scriptHash: invocation.scriptHash,
    operation: invocation.operation,
    args,
  });
}

function resolveInvocationSigners({ account, tx }) {
  return [{ account: account.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];
}

async function simulateMetaInvocation({ rpcUrl, relayWif, invocation }) {
  const { rpc, tx, sc, u, rpcClient, account } = loadRelayInvocationContext({ rpcUrl, relayWif });
  const signers = resolveInvocationSigners({ account, tx });
  const script = buildInvocationScript({ invocation, sc, u });

  const simulation = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (simulation?.state === 'FAULT') {
    return {
      simulate: true,
      ok: false,
      code: 'relay_simulation_fault',
      vmState: 'FAULT',
      exception: simulation.exception || 'VM fault',
      operation: invocation.operation,
      gasConsumed: simulation?.gasconsumed || '0',
    };
  }

  return {
    simulate: true,
    ok: true,
    vmState: String(simulation?.state || 'HALT').toUpperCase(),
    gasConsumed: simulation?.gasconsumed || '0',
    operation: invocation.operation,
    stack: simulation?.stack || [],
  };
}

async function relayMetaInvocation({ rpcUrl, relayWif, invocation }) {
  const { rpc, tx, sc, u, rpcClient, account } = loadRelayInvocationContext({ rpcUrl, relayWif });
  const magic = await getNetworkMagic(rpcClient, rpc);
  const signers = resolveInvocationSigners({ account, tx });
  const script = buildInvocationScript({ invocation, sc, u });

  const simulation = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (simulation?.state === 'FAULT') {
    throw new Error(`${invocation.operation} simulation fault: ${simulation.exception || 'VM fault'}`);
  }

  const validUntilBlock = (await rpcClient.getBlockCount()) + 1000;
  const basePayload = {
    signers,
    validUntilBlock,
    script,
    systemFee: simulation?.gasconsumed || '1000000',
  };

  let transaction = new tx.Transaction(basePayload);
  transaction.sign(account, magic);
  const networkFee = await rpcClient.calculateNetworkFee(transaction);

  transaction = new tx.Transaction({
    ...basePayload,
    networkFee,
  });
  transaction.sign(account, magic);

  const txid = await rpcClient.sendRawTransaction(transaction);
  return {
    txid,
    networkFee: networkFee?.toString?.() || String(networkFee),
    systemFee: simulation?.gasconsumed || '0',
    invocation: {
      scriptHash: invocation.scriptHash,
      operation: invocation.operation,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientIp);
  
  if (!rateLimit.allowed) {
    res.setHeader?.('Retry-After', String(rateLimit.retryAfter));
    res.status(429).json({ 
      error: 'rate_limit_exceeded', 
      retryAfter: rateLimit.retryAfter 
    });
    return;
  }

  const rpcUrl = process.env.AA_RELAY_RPC_URL || process.env.VITE_AA_RELAY_RPC_URL || process.env.VITE_NEO_RPC_URL || '';
  if (!rpcUrl) {
    res.status(501).json({ error: 'relay_not_configured' });
    return;
  }

  const normalized = normalizeRelayPayload(req.body || {});
  const simulate = Boolean(req.body?.simulate);
  const allowRawRelayForwarding = resolveOptionalBoolean(
    process.env.AA_RELAY_ALLOW_RAW_FORWARD || process.env.VITE_AA_RELAY_RAW_ENABLED,
    false,
  );
  const allowedAaContractHash = resolveAbstractAccountHash(
    process.env.AA_RELAY_ALLOWED_HASH
      || process.env.VITE_AA_HASH
      || process.env.VITE_ABSTRACT_ACCOUNT_HASH
      || process.env.VITE_AA_HASH_TESTNET
      || DEFAULT_ABSTRACT_ACCOUNT_HASH,
    DEFAULT_ABSTRACT_ACCOUNT_HASH,
  );

  if (normalized.mode === 'raw') {
    if (!allowRawRelayForwarding) {
      res.status(403).json({ error: 'raw_relay_not_enabled' });
      return;
    }

    if (!normalized.rawTransaction) {
      res.status(400).json({ error: 'missing_raw_transaction' });
      return;
    }

    if (!RAW_TRANSACTION_PATTERN.test(normalized.rawTransaction) || normalized.rawTransaction.length > MAX_RAW_TRANSACTION_LENGTH) {
      res.status(400).json({ error: 'invalid_raw_transaction' });
      return;
    }

    if (simulate) {
      res.status(200).json({
        simulate: true,
        ok: false,
        supported: false,
        code: 'simulation_not_supported_for_raw',
        message: 'Simulation is only available for relay-ready meta invocations.',
      });
      return;
    }

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendrawtransaction',
          params: [normalized.rawTransaction],
        }),
      });
      const payload = await response.json();
      if (payload?.error) {
        res.status(502).json({ error: 'relay_rpc_error', details: payload.error });
        return;
      }

      const result = payload?.result;
      const txid = typeof result === 'string'
        ? result
        : result?.hash || result?.txid || null;

      res.status(200).json({ txid, result: result ?? null });
    } catch (error) {
      res.status(502).json({
        error: 'relay_network_error',
        message: sanitizeError(error),
      });
    }
    return;
  }

  if (!req.body?.metaInvocation && !req.body?.meta_invocation) {
    res.status(400).json({ error: 'missing_meta_invocation' });
    return;
  }

  const metaInvocation = req.body?.metaInvocation || req.body?.meta_invocation;
  const sanitizedMetaInvocation = sanitizeMetaInvocationForRelay(metaInvocation, {
    aaContractHash: allowedAaContractHash,
  });
  if (!sanitizedMetaInvocation) {
    res.status(400).json({ error: 'relay_meta_invocation_not_allowed' });
    return;
  }

  const relayWif = process.env.AA_RELAY_WIF || '';
  if (!relayWif) {
    res.status(501).json({ error: 'relay_signer_not_configured' });
    return;
  }

  try {
    if (simulate) {
      const result = await simulateMetaInvocation({
        rpcUrl,
        relayWif,
        invocation: sanitizedMetaInvocation,
      });
      res.status(200).json(result);
      return;
    }

    const result = await relayMetaInvocation({
      rpcUrl,
      relayWif,
      invocation: sanitizedMetaInvocation,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(502).json({
      error: simulate ? 'relay_simulation_error' : 'relay_meta_invocation_failed',
      message: sanitizeError(error),
    });
  }
}
