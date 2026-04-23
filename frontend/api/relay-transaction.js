import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { DEFAULT_ABSTRACT_ACCOUNT_HASH, DEFAULT_ABSTRACT_ACCOUNT_HASH_TESTNET, resolveAbstractAccountHash, resolveOptionalBoolean } from '../src/config/runtimeConfig.js';
import { sanitizeHex } from '../src/utils/hex.js';
import { convertContractParamFromJson, normalizeRelayPayload, sanitizeMetaInvocationForRelay } from './relayHelpers.js';
import { attachRequestId, beginDurableRequest, completeDurableRequest, failDurableRequest } from './requestDurability.js';
import { checkRateLimit, sanitizeError } from './rateLimiter.js';
import { resolveMorpheusOracleCvmId, resolveMorpheusPaymasterEndpoint, resolveMorpheusRuntimeToken, resolveNetwork } from './morpheus-base.js';
import { callRemotePaymasterAuthorize, resolvePhalaCliCommand } from './phala-remote.js';

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

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isAuthFailureStatus(status) {
  return Number(status) === 401 || Number(status) === 403;
}

function normalizeHash(value) {
  const hex = sanitizeHex(value || '');
  return hex ? `0x${hex}` : '';
}

function shouldIncludeRawRelayErrors() {
  return resolveOptionalBoolean(
    process.env.AA_RELAY_INCLUDE_RAW_ERRORS
      || process.env.VITE_AA_RELAY_INCLUDE_RAW_ERRORS,
    false,
  );
}

function sha256Hex(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function relayFingerprint({ payload = {}, normalized = {}, simulate = false, paymaster = null } = {}) {
  return {
    mode: normalized.mode || '',
    rawTransaction: normalized.rawTransaction || '',
    metaInvocation: normalized.metaInvocation || null,
    simulate: Boolean(simulate),
    paymaster: paymaster || null,
    relayPayloadMode: payload?.relayPayloadMode || '',
  };
}

function sendJson(res, statusCode, payload, requestId) {
  if (requestId) {
    res.setHeader?.('X-Request-Id', requestId);
  }
  res.status(statusCode).json(attachRequestId(payload, requestId));
}

function resolveRelayEnv(network, key) {
  const upper = network === 'testnet' ? 'TESTNET' : 'MAINNET';
  return trimString(
    process.env[`AA_RELAY_${upper}_${key}`]
      || process.env[`AA_RELAY_${key}`]
      || ''
  );
}

function resolveRelayNetwork({ req = {}, requestPayload = {}, paymaster = null } = {}) {
  const payload = requestPayload && typeof requestPayload === 'object' ? requestPayload : {};
  const paymasterConfig = paymaster && typeof paymaster === 'object' ? paymaster : {};
  return resolveNetwork({
    query: {
      ...(req?.query || {}),
      morpheus_network:
        payload?.morpheus_network
        || paymasterConfig?.morpheus_network
        || paymasterConfig?.network
        || req?.query?.morpheus_network,
    },
    body: {
      ...(req?.body || {}),
      morpheus_network:
        payload?.morpheus_network
        || paymasterConfig?.morpheus_network
        || paymasterConfig?.network
        || req?.body?.morpheus_network,
    },
    headers: req?.headers || {},
  });
}

function resolveAllowedAaContractHash(network) {
  const defaultHash = network === 'testnet'
    ? DEFAULT_ABSTRACT_ACCOUNT_HASH_TESTNET
    : DEFAULT_ABSTRACT_ACCOUNT_HASH;
  const fallbackClientHash = network === 'testnet'
    ? process.env.VITE_AA_HASH_TESTNET || process.env.VITE_ABSTRACT_ACCOUNT_HASH_TESTNET
    : process.env.VITE_AA_HASH || process.env.VITE_ABSTRACT_ACCOUNT_HASH;
  return resolveAbstractAccountHash(
    resolveRelayEnv(network, 'ALLOWED_HASH')
      || fallbackClientHash
      || process.env.VITE_ABSTRACT_ACCOUNT_HASH
      || defaultHash,
    defaultHash,
  );
}

export function resolveRelayExecutionConfig({ req = {}, requestPayload = {}, paymaster = null } = {}) {
  const network = resolveRelayNetwork({ req, requestPayload, paymaster });
  return {
    network,
    rpcUrl: trimString(
      resolveRelayEnv(network, 'RPC_URL')
        || process.env.VITE_AA_RELAY_RPC_URL
        || process.env.VITE_NEO_RPC_URL
        || ''
    ),
    relayWif: trimString(resolveRelayEnv(network, 'WIF') || ''),
    allowedAaContractHash: resolveAllowedAaContractHash(network),
    allowRawRelayForwarding: resolveOptionalBoolean(
      resolveRelayEnv(network, 'ALLOW_RAW_FORWARD')
        || process.env.VITE_AA_RELAY_RAW_ENABLED,
      false,
    ),
  };
}

function resolvePaymasterConfig(network) {
  const endpoint = trimString(resolveMorpheusPaymasterEndpoint(network));
  const apiToken = trimString(
    process.env[`MORPHEUS_PAYMASTER_${network === 'testnet' ? 'TESTNET' : 'MAINNET'}_API_TOKEN`]
      || process.env.MORPHEUS_PAYMASTER_API_TOKEN
      || process.env.AA_PAYMASTER_API_TOKEN
      || resolveMorpheusRuntimeToken(network)
      || ''
  );
  return {
    network,
    endpoint,
    apiToken,
    appId: trimString(resolveMorpheusOracleCvmId(network)),
    remoteWorkerService: trimString(
      process.env.MORPHEUS_REMOTE_WORKER_SERVICE
        || process.env.MORPHEUS_PAYMASTER_REMOTE_WORKER_SERVICE
        || 'testnet-request-worker'
    ),
    phalaCliCommand: resolvePhalaCliCommand(process.env),
    enabled: Boolean(endpoint),
  };
}

function buildPaymasterRequest({ metaInvocation, paymaster = {}, estimatedGasUnits = 0, network }) {
  const firstArg = Array.isArray(metaInvocation?.args) ? metaInvocation.args[0] : null;
  const secondArg = Array.isArray(metaInvocation?.args) ? metaInvocation.args[1] : null;
  const accountId = trimString(
    paymaster.account_id
      || paymaster.accountId
      || firstArg?.value
      || ''
  );
  const downstreamTarget = secondArg?.type === 'Struct'
    ? trimString(secondArg?.value?.[0]?.value || '')
    : '';
  const downstreamMethod = secondArg?.type === 'Struct'
    ? trimString(secondArg?.value?.[1]?.value || '')
    : '';

  return {
    network,
    target_chain: 'neo_n3',
    account_id: accountId,
    dapp_id: trimString(paymaster.dapp_id || paymaster.dappId || ''),
    target_contract: `0x${sanitizeHex(metaInvocation?.scriptHash || '')}`,
    method: trimString(metaInvocation?.operation || ''),
    userop_target_contract: downstreamTarget ? normalizeHash(downstreamTarget) : '',
    userop_method: downstreamMethod,
    estimated_gas_units: Number(paymaster.estimated_gas_units || paymaster.estimatedGasUnits || estimatedGasUnits || 0),
    operation_hash: trimString(paymaster.operation_hash || paymaster.operationHash || `0x${sha256Hex(metaInvocation)}`),
  };
}

async function maybeAuthorizePaymaster({ metaInvocation, paymaster = null, estimatedGasUnits = 0, network = 'mainnet' }) {
  const config = resolvePaymasterConfig(network);
  if (!config.enabled) return null;

  const requestBody = buildPaymasterRequest({
    metaInvocation,
    paymaster: paymaster && typeof paymaster === 'object' ? paymaster : {},
    estimatedGasUnits,
    network: config.network,
  });

  const headers = { 'content-type': 'application/json' };
  if (config.apiToken) {
    headers.authorization = `Bearer ${config.apiToken}`;
    headers['x-phala-token'] = config.apiToken;
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (isAuthFailureStatus(response.status) && config.apiToken && config.appId && config.phalaCliCommand) {
      const remoteResponse = await callRemotePaymasterAuthorize({
        payload: requestBody,
        apiToken: config.apiToken,
        appId: config.appId,
        remoteWorkerService: config.remoteWorkerService,
        cliCommand: config.phalaCliCommand,
      });
      if (Number(remoteResponse?.status) !== 200) {
        throw new Error(remoteResponse?.body?.error || remoteResponse?.body?.message || 'Paymaster authorization failed.');
      }
      return remoteResponse?.body || remoteResponse;
    }
    throw new Error(payload?.error || payload?.message || 'Paymaster authorization failed.');
  }
  return payload;
}

function buildInvocationScript({ invocation, sc, u }) {
  const args = invocation.args.map((param) => convertContractParamFromJson(param, { sc, u }));
  return sc.createScript({
    scriptHash: invocation.scriptHash,
    operation: invocation.operation,
    args,
  });
}

function decodeHash160Stack(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.type === 'Hash160' && item.value) return sanitizeHex(item.value);
  if (item.type === 'ByteString' && item.value) return sanitizeHex(Buffer.from(item.value, 'base64').toString('hex'));
  return '';
}

function decodeValidationPreviewStack(item) {
  const values = item?.type === 'Array' && Array.isArray(item.value) ? item.value : [];
  return {
    deadlineValid: values?.[0]?.value === true || values?.[0]?.value === 1 || values?.[0]?.value === '1',
    nonceAcceptable: values?.[1]?.value === true || values?.[1]?.value === 1 || values?.[1]?.value === '1',
    hasVerifier: values?.[2]?.value === true || values?.[2]?.value === 1 || values?.[2]?.value === '1',
    verifier: decodeHash160Stack(values?.[3]),
    hook: decodeHash160Stack(values?.[4]),
  };
}

async function fetchValidationPreview({ rpcUrl, invocation }) {
  if (invocation?.operation !== 'executeUserOp') return null;
  if (!Array.isArray(invocation?.args) || invocation.args.length < 2) return null;

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'invokefunction',
      params: [
        invocation.scriptHash,
        'previewUserOpValidation',
        [invocation.args[0], invocation.args[1]],
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (payload?.error || payload?.result?.state === 'FAULT') return null;
  return decodeValidationPreviewStack(payload?.result?.stack?.[0]);
}

function resolveInvocationSigners({ account, tx }) {
  return [{ account: account.scriptHash, scopes: tx.WitnessScope.CalledByEntry }];
}

async function simulateMetaInvocation({ rpcUrl, relayWif, invocation }) {
  const { rpc, tx, sc, u, rpcClient, account } = loadRelayInvocationContext({ rpcUrl, relayWif });
  const signers = resolveInvocationSigners({ account, tx });
  const script = buildInvocationScript({ invocation, sc, u });
  const validationPreview = await fetchValidationPreview({ rpcUrl, invocation });

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
      validationPreview,
    };
  }

  return {
    simulate: true,
    ok: true,
    vmState: String(simulation?.state || 'HALT').toUpperCase(),
    gasConsumed: simulation?.gasconsumed || '0',
    operation: invocation.operation,
    stack: simulation?.stack || [],
    validationPreview,
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
  const requestPayload = req.body || {};
  const normalized = normalizeRelayPayload(requestPayload);
  const simulate = Boolean(requestPayload?.simulate);
  const paymasterInput = requestPayload?.paymaster && typeof requestPayload.paymaster === 'object' ? requestPayload.paymaster : null;
  const durable = await beginDurableRequest({
    req,
    routeName: 'relay_transaction',
    payload: requestPayload,
    fingerprint: relayFingerprint({ payload: requestPayload, normalized, simulate, paymaster: paymasterInput }),
  });
  const requestId = durable.context.requestId;

  if (!durable.ok) {
    if (durable.replayed) {
      return sendJson(res, durable.cached.status, durable.cached.body, requestId);
    }
    if (durable.inProgress) {
      return sendJson(res, 409, { error: 'request_in_progress' }, requestId);
    }
  }

  if (req.method !== 'POST') {
    await failDurableRequest(durable.context, { statusCode: 405, error: 'method_not_allowed', phase: 'method' });
    return sendJson(res, 405, { error: 'method_not_allowed' }, requestId);
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const rateLimit = await checkRateLimit(clientIp);
  
  if (!rateLimit.allowed) {
    res.setHeader?.('Retry-After', String(rateLimit.retryAfter));
    await failDurableRequest(durable.context, { statusCode: 429, error: 'rate_limit_exceeded', phase: 'rate_limit' });
    return sendJson(res, 429, { 
      error: 'rate_limit_exceeded', 
      retryAfter: rateLimit.retryAfter 
    }, requestId);
  }

  const relayConfig = resolveRelayExecutionConfig({
    req,
    requestPayload,
    paymaster: paymasterInput,
  });
  const { rpcUrl, relayWif, allowedAaContractHash, allowRawRelayForwarding } = relayConfig;
  if (!rpcUrl) {
    await failDurableRequest(durable.context, { statusCode: 501, error: 'relay_not_configured', phase: 'config' });
    return sendJson(res, 501, { error: 'relay_not_configured' }, requestId);
  }

  if (normalized.mode === 'raw') {
    if (!allowRawRelayForwarding) {
      await failDurableRequest(durable.context, { statusCode: 403, error: 'raw_relay_not_enabled', phase: 'validation' });
      return sendJson(res, 403, { error: 'raw_relay_not_enabled' }, requestId);
    }

    if (!normalized.rawTransaction) {
      await failDurableRequest(durable.context, { statusCode: 400, error: 'missing_raw_transaction', phase: 'validation' });
      return sendJson(res, 400, { error: 'missing_raw_transaction' }, requestId);
    }

    if (!RAW_TRANSACTION_PATTERN.test(normalized.rawTransaction) || normalized.rawTransaction.length > MAX_RAW_TRANSACTION_LENGTH) {
      await failDurableRequest(durable.context, { statusCode: 400, error: 'invalid_raw_transaction', phase: 'validation' });
      return sendJson(res, 400, { error: 'invalid_raw_transaction' }, requestId);
    }

    if (simulate) {
      const body = {
        simulate: true,
        ok: false,
        supported: false,
        code: 'simulation_not_supported_for_raw',
        message: 'Simulation is only available for relay-ready meta invocations.',
      };
      await completeDurableRequest(durable.context, { statusCode: 200, body: attachRequestId(body, requestId) });
      return sendJson(res, 200, body, requestId);
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
        await failDurableRequest(durable.context, { statusCode: 502, error: 'relay_rpc_error', phase: 'raw_relay' });
        return sendJson(res, 502, { error: 'relay_rpc_error', details: payload.error }, requestId);
      }

      const result = payload?.result;
      const txid = typeof result === 'string'
        ? result
        : result?.hash || result?.txid || null;

      const body = { txid, result: result ?? null };
      await completeDurableRequest(durable.context, { statusCode: 200, body: attachRequestId(body, requestId) });
      return sendJson(res, 200, body, requestId);
    } catch (error) {
      const body = {
        error: 'relay_network_error',
        message: sanitizeError(error),
      };
      await failDurableRequest(durable.context, { statusCode: 502, error: body.error, phase: 'raw_relay' });
      return sendJson(res, 502, body, requestId);
    }
  }

  if (!requestPayload?.metaInvocation && !requestPayload?.meta_invocation) {
    await failDurableRequest(durable.context, { statusCode: 400, error: 'missing_meta_invocation', phase: 'validation' });
    return sendJson(res, 400, { error: 'missing_meta_invocation' }, requestId);
  }

  const metaInvocation = requestPayload?.metaInvocation || requestPayload?.meta_invocation;
  const sanitizedMetaInvocation = sanitizeMetaInvocationForRelay(metaInvocation, {
    aaContractHash: allowedAaContractHash,
  });
  if (!sanitizedMetaInvocation) {
    await failDurableRequest(durable.context, { statusCode: 400, error: 'relay_meta_invocation_not_allowed', phase: 'validation' });
    return sendJson(res, 400, { error: 'relay_meta_invocation_not_allowed' }, requestId);
  }

  if (!relayWif) {
    await failDurableRequest(durable.context, { statusCode: 501, error: 'relay_signer_not_configured', phase: 'config' });
    return sendJson(res, 501, { error: 'relay_signer_not_configured' }, requestId);
  }

  let failurePhase = simulate ? 'simulation' : 'preview';
  try {
    if (simulate) {
      const result = await simulateMetaInvocation({
        rpcUrl,
        relayWif,
        invocation: sanitizedMetaInvocation,
      });
      const paymaster = await maybeAuthorizePaymaster({
        metaInvocation: sanitizedMetaInvocation,
        paymaster: paymasterInput,
        estimatedGasUnits: Number(result?.gasConsumed || 0),
        network: relayConfig.network,
      });
      if (paymaster && paymaster.approved === false) {
        const body = {
          ...result,
          ok: false,
          code: 'paymaster_denied',
          exception: paymaster.reason || 'Paymaster denied sponsorship.',
          paymaster,
        };
        await completeDurableRequest(durable.context, { statusCode: 200, body: attachRequestId(body, requestId) });
        return sendJson(res, 200, body, requestId);
      }
      if (paymaster) {
        const body = { ...result, paymaster };
        await completeDurableRequest(durable.context, { statusCode: 200, body: attachRequestId(body, requestId) });
        return sendJson(res, 200, body, requestId);
      }
      await completeDurableRequest(durable.context, { statusCode: 200, body: attachRequestId(result, requestId) });
      return sendJson(res, 200, result, requestId);
    }

    const preview = await simulateMetaInvocation({
      rpcUrl,
      relayWif,
      invocation: sanitizedMetaInvocation,
    });
    if (!preview.ok) {
      await completeDurableRequest(durable.context, { statusCode: 200, body: attachRequestId(preview, requestId) });
      return sendJson(res, 200, preview, requestId);
    }
    failurePhase = 'paymaster';
    const paymaster = await maybeAuthorizePaymaster({
      metaInvocation: sanitizedMetaInvocation,
      paymaster: paymasterInput,
      estimatedGasUnits: Number(preview?.gasConsumed || 0),
      network: relayConfig.network,
    });
    if (paymaster && paymaster.approved === false) {
      const body = {
        error: 'paymaster_denied',
        message: paymaster.reason || 'Paymaster denied sponsorship.',
        paymaster,
      };
      await failDurableRequest(durable.context, { statusCode: 402, error: 'paymaster_denied', phase: 'paymaster' });
      return sendJson(res, 402, body, requestId);
    }

    failurePhase = 'relay';
    const result = await relayMetaInvocation({
      rpcUrl,
      relayWif,
      invocation: sanitizedMetaInvocation,
    });
    failurePhase = 'response';
    const body = paymaster ? { ...result, paymaster } : result;
    await completeDurableRequest(durable.context, { statusCode: 200, body: attachRequestId(body, requestId) });
    return sendJson(res, 200, body, requestId);
  } catch (error) {
    const rawMessage = String(error?.message || error || 'Unknown error');
    const payload = {
      error: simulate
        ? 'relay_simulation_error'
        : failurePhase === 'paymaster'
          ? 'paymaster_authorization_failed'
          : 'relay_meta_invocation_failed',
      message: sanitizeError(error),
      phase: failurePhase,
    };
    if (shouldIncludeRawRelayErrors()) {
      payload.rawMessage = rawMessage;
      payload.stack = typeof error?.stack === 'string' ? error.stack : undefined;
    }
    await failDurableRequest(durable.context, { statusCode: 502, error: payload.error, phase: failurePhase });
    return sendJson(res, 502, payload, requestId);
  }
}
