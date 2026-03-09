import { ethers } from 'ethers';
import { sanitizeHex } from '../../utils/hex.js';
import { cloneImmutable } from './helpers.js';
import { buildDraftCollaborationUrl, buildDraftShareUrl } from './shareLinks.js';

function buildPayloadDigest(draftRecord = {}) {
  return ethers.id(JSON.stringify({
    account: draftRecord.account || {},
    transactionBody: draftRecord.transaction_body || {},
    signerRequirements: draftRecord.signer_requirements || [],
    broadcastMode: draftRecord.broadcast_mode || 'client',
  }));
}

function buildVerifyingContract(draftRecord = {}) {
  const seed = ethers.keccak256(ethers.toUtf8Bytes(
    draftRecord.share_slug || draftRecord.draft_id || 'neo-abstract-account-workspace'
  ));
  return ethers.getAddress(`0x${seed.slice(-40)}`);
}

function toHash160Param(value) {
  return {
    type: 'Hash160',
    value: `0x${sanitizeHex(value || '')}`,
  };
}

function toArrayParam(args = []) {
  return {
    type: 'Array',
    value: cloneImmutable(args),
  };
}

function buildExecuteByAddressInvocation({ aaContractHash = '', account = {}, operationBody = null, signerAddress = '' } = {}) {
  const contractHash = sanitizeHex(aaContractHash || '');
  const accountAddressScriptHash = sanitizeHex(account.accountAddressScriptHash || '');
  const targetContract = sanitizeHex(operationBody?.targetContract || '');
  const method = String(operationBody?.method || '').trim();
  const args = Array.isArray(operationBody?.args) ? cloneImmutable(operationBody.args) : [];

  if (!contractHash || !accountAddressScriptHash || !targetContract || !method) {
    return null;
  }

  return {
    scriptHash: contractHash,
    operation: 'executeByAddress',
    args: [
      toHash160Param(accountAddressScriptHash),
      toHash160Param(targetContract),
      { type: 'String', value: method },
      toArrayParam(args),
    ],
    signers: signerAddress ? [{ account: signerAddress, scopes: 1 }] : [],
  };
}

function selectMetaInvocation(transactionBody = {}, signatures = []) {
  if (transactionBody?.metaInvocation) {
    return cloneImmutable(transactionBody.metaInvocation);
  }
  if (Array.isArray(transactionBody?.metaInvocations) && transactionBody.metaInvocations.length > 0) {
    return cloneImmutable(transactionBody.metaInvocations[0]);
  }
  if (Array.isArray(transactionBody?.meta_invocations) && transactionBody.meta_invocations.length > 0) {
    return cloneImmutable(transactionBody.meta_invocations[0]);
  }

  const entry = Array.isArray(signatures)
    ? signatures.find((item) => item?.metadata?.metaInvocation)
    : null;
  return entry?.metadata?.metaInvocation ? cloneImmutable(entry.metadata.metaInvocation) : null;
}

export function buildRelayPayloadOptions({ runtime = null, transactionBody = {}, signatures = [] } = {}) {
  const options = [];
  const allowRawRelay = runtime == null ? true : Boolean(runtime?.relayRawEnabled);
  const rawTransaction = sanitizeHex(
    transactionBody?.rawTransaction || transactionBody?.raw_transaction || transactionBody?.txHex || ''
  );
  const metaInvocation = selectMetaInvocation(transactionBody, signatures);

  if (rawTransaction && allowRawRelay) options.push('raw');
  if (metaInvocation) options.push('meta');
  if (options.length > 1) {
    return ['best', ...options];
  }
  return options;
}

export function resolveRelayPayloadMode({ relayPayloadMode = 'best', availableModes = [] } = {}) {
  if (!Array.isArray(availableModes) || availableModes.length === 0) {
    return 'none';
  }

  if (relayPayloadMode && relayPayloadMode !== 'best' && availableModes.includes(relayPayloadMode)) {
    return relayPayloadMode;
  }

  if (availableModes.includes('raw')) return 'raw';
  if (availableModes.includes('meta')) return 'meta';
  return availableModes[0];
}

export function buildStagedTransactionBody({
  aaContractHash = '',
  account = {},
  operationBody = null,
  signerAddress = '',
  rawTransaction = '',
  notes = '',
  createdAt = new Date().toISOString(),
} = {}) {
  const clientInvocation = buildExecuteByAddressInvocation({
    aaContractHash,
    account,
    operationBody,
    signerAddress,
  });

  return cloneImmutable({
    version: 1,
    network: 'neo-n3-testnet',
    accountIdHex: account.accountIdHex || '',
    accountAddressScriptHash: account.accountAddressScriptHash || '',
    kind: operationBody?.kind || 'invoke',
    clientInvocation,
    rawTransaction: sanitizeHex(rawTransaction || ''),
    notes: String(notes || '').trim(),
    createdAt,
  });
}

export function buildDraftApprovalTypedData({ draftRecord, chainId = 894710606 } = {}) {
  const payloadDigest = buildPayloadDigest(draftRecord);

  return {
    domain: {
      name: 'Neo Abstract Account Workspace',
      version: '1',
      chainId,
      verifyingContract: buildVerifyingContract(draftRecord),
    },
    types: {
      DraftApproval: [
        { name: 'draftId', type: 'string' },
        { name: 'shareSlug', type: 'string' },
        { name: 'accountIdHex', type: 'string' },
        { name: 'payloadDigest', type: 'bytes32' },
        { name: 'broadcastMode', type: 'string' },
      ],
    },
    message: {
      draftId: draftRecord?.draft_id || 'local-draft',
      shareSlug: draftRecord?.share_slug || 'local-share',
      accountIdHex: draftRecord?.account?.accountIdHex || '',
      payloadDigest,
      broadcastMode: draftRecord?.broadcast_mode || 'client',
    },
  };
}

export function buildClientBroadcastRequest({ signerAddress = '', transactionBody = {} } = {}) {
  const invocation = cloneImmutable(transactionBody?.clientInvocation || {});
  if (!invocation.scriptHash || !invocation.operation) {
    throw new Error('Transaction body does not include a client invocation payload.');
  }

  if (!Array.isArray(invocation.signers) || invocation.signers.length === 0) {
    if (!signerAddress) {
      throw new Error('A connected Neo wallet signer is required for client broadcast.');
    }
    invocation.signers = [{ account: signerAddress, scopes: 1 }];
  }

  return invocation;
}

export function buildRelayBroadcastRequest({ relayEndpoint = '', relayPayloadMode = 'best', relayRawEnabled = true, transactionBody = {}, signatures = [] } = {}) {
  if (!relayEndpoint) {
    throw new Error('Relay endpoint is not configured.');
  }

  const rawTransaction = sanitizeHex(
    transactionBody?.rawTransaction || transactionBody?.raw_transaction || transactionBody?.txHex || ''
  );
  const metaInvocation = selectMetaInvocation(transactionBody, signatures);
  if (rawTransaction && !relayRawEnabled && !metaInvocation) {
    throw new Error('Raw relay forwarding is not enabled for this deployment.');
  }
  const availableModes = buildRelayPayloadOptions({ runtime: { relayRawEnabled }, transactionBody, signatures });
  const resolvedMode = resolveRelayPayloadMode({ relayPayloadMode, availableModes });

  if (resolvedMode === 'raw' && rawTransaction) {
    if (!relayRawEnabled) {
      throw new Error('Raw relay forwarding is not enabled for this deployment.');
    }
    return {
      relayEndpoint,
      rawTransaction,
    };
  }

  if (resolvedMode === 'meta' && metaInvocation) {
    return {
      relayEndpoint,
      metaInvocation,
    };
  }

  throw new Error('Transaction body does not include a signed raw transaction or relay-ready meta invocation.');
}

export async function executeBroadcast({
  mode = 'client',
  signerAddress = '',
  relayPayloadMode = 'best',
  relayRawEnabled = true,
  transactionBody = {},
  signatures = [],
  walletService,
  relayEndpoint = '',
} = {}) {
  if (!walletService) {
    throw new Error('Wallet service is required to broadcast transactions.');
  }

  if (mode === 'relay') {
    return walletService.relayTransaction(
      buildRelayBroadcastRequest({ relayEndpoint, relayPayloadMode, relayRawEnabled, transactionBody, signatures })
    );
  }

  return walletService.invoke(
    buildClientBroadcastRequest({ signerAddress, transactionBody })
  );
}

export function buildDraftExportBundle({ draftRecord = {}, origin = '' } = {}) {
  const bundle = cloneImmutable(draftRecord);
  const metaInvocations = Array.isArray(bundle?.signatures)
    ? bundle.signatures
        .map((item) => item?.metadata?.metaInvocation)
        .filter(Boolean)
    : [];

  return {
    ...bundle,
    meta_invocations: metaInvocations,
    share_url: origin && draftRecord?.share_slug
      ? buildDraftShareUrl(origin, draftRecord.share_slug)
      : '',
    collaboration_url: origin && draftRecord?.share_slug && draftRecord?.collaboration_slug
      ? buildDraftCollaborationUrl(origin, draftRecord.share_slug, draftRecord.collaboration_slug)
      : '',
    operator_url: origin && draftRecord?.share_slug && draftRecord?.operator_slug
      ? buildDraftCollaborationUrl(origin, draftRecord.share_slug, draftRecord.operator_slug)
      : '',
  };
}
