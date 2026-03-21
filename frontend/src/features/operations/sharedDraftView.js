import { buildRelayPayloadOptions } from './execution.js';

const defaultT = (_key, fallback) => fallback;

function compactText(value, t = defaultT, head = 8, tail = 8) {
  const text = String(value || '').trim();
  if (!text) return t('sharedDraft.notAvailable', 'Not available');
  if (text.length <= head + tail - 1) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

function formatSignerLabel(kind = 'neo', signerId = '', t = defaultT) {
  return `${String(kind || 'neo').toUpperCase()} · ${String(signerId || t('sharedDraft.unknownSigner', 'Unknown signer')).trim() || t('sharedDraft.unknownSigner', 'Unknown signer')}`;
}

function formatCreatedDate(value = '', t = defaultT) {
  const text = String(value || '').trim();
  if (!text) return t('sharedDraft.unknownDate', 'Unknown date');
  return text.slice(0, 10);
}

function hasMetaInvocation(draft = {}) {
  if (draft?.transaction_body?.metaInvocation) return true;
  if (Array.isArray(draft?.transaction_body?.metaInvocations) && draft.transaction_body.metaInvocations.length > 0) return true;
  if (Array.isArray(draft?.transaction_body?.meta_invocations) && draft.transaction_body.meta_invocations.length > 0) return true;
  return Array.isArray(draft?.signatures)
    ? draft.signatures.some((item) => item?.metadata?.metaInvocation)
    : false;
}

function resolveInvocationLabel(draft = {}, t = defaultT) {
  const transactionBody = draft?.transaction_body || {};
  const operation = transactionBody?.v3Invocation?.operation
    || transactionBody?.clientInvocation?.operation
    || transactionBody?.metaInvocation?.operation
    || transactionBody?.metaInvocations?.[0]?.operation
    || transactionBody?.meta_invocations?.[0]?.operation
    || draft?.signatures?.find((item) => item?.metadata?.metaInvocation)?.metadata?.metaInvocation?.operation
    || '';

  return operation === 'executeUserOp' ? t('sharedDraft.userOpInvocation', 'UserOperation Invocation') : t('sharedDraft.relayInvocation', 'Relay Invocation');
}

function buildPayloadSummary(draft = {}, runtime = null, t = defaultT) {
  const availableModes = buildRelayPayloadOptions({
    runtime,
    transactionBody: draft?.transaction_body || {},
    signatures: draft?.signatures || [],
  });
  const invocationLabel = resolveInvocationLabel(draft, t);

  if (availableModes.includes('raw') && availableModes.includes('meta')) {
    return `${t('sharedDraft.rawTx', 'Raw Tx')} + ${invocationLabel}`;
  }
  if (availableModes.includes('raw')) {
    return t('sharedDraft.rawTx', 'Raw Tx');
  }
  if (availableModes.includes('meta')) {
    return invocationLabel;
  }
  return t('sharedDraft.clientInvocationOnly', 'Client Invocation Only');
}

export function buildOperationSnapshotItems({ draft = {}, relayReadiness = {}, t = defaultT } = {}) {
  const operationBody = draft?.operation_body || {};
  const transactionBody = draft?.transaction_body || {};
  const clientInvocation = transactionBody?.clientInvocation || {};
  const targetContract = operationBody?.targetContract || clientInvocation?.scriptHash || t('sharedDraft.notAvailable', 'Not available');
  const method = operationBody?.method || clientInvocation?.operation || t('sharedDraft.notStaged', 'Not staged');
  const args = Array.isArray(operationBody?.args)
    ? operationBody.args
    : Array.isArray(clientInvocation?.args)
      ? clientInvocation.args
      : [];

  return [
    {
      label: t('sharedDraft.targetContract', 'Target Contract'),
      value: targetContract,
    },
    {
      label: t('sharedDraft.methodLabel', 'Method'),
      value: method,
    },
    {
      label: t('sharedDraft.argumentsLabel', 'Arguments'),
      value: t('sharedDraft.argumentCount', '{count} argument(s)').replace('{count}', String(args.length)),
    },
    {
      label: t('sharedDraft.relayState', 'Relay State'),
      value: relayReadiness?.label || t('sharedDraft.relayBlocked', 'Relay Blocked'),
      note: relayReadiness?.detail || '',
    },
    {
      label: t('sharedDraft.payloads', 'Payloads'),
      value: buildPayloadSummary(draft, relayReadiness?.runtime || null, t),
      note: hasMetaInvocation(draft) ? t('sharedDraft.typedDataApprovalNote', 'Collected typed-data approvals can be relayed directly when relay invocation mode is enabled.') : '',
    },
  ];
}

export function buildSignerChecklistItems({ signerRequirements = [], signatures = [], t = defaultT } = {}) {
  const requirements = Array.isArray(signerRequirements) ? signerRequirements : [];
  const collected = Array.isArray(signatures) ? signatures : [];

  const requiredItems = requirements.map((item) => {
    const match = collected.find((signature) => signature?.kind === item?.kind && signature?.signerId === item?.id);
    return {
      key: `required:${item?.kind || 'neo'}:${item?.id || 'unknown'}`,
      label: formatSignerLabel(item?.kind, item?.id, t),
      kind: String(item?.kind || 'neo'),
      statusKey: match ? 'collected' : 'pending',
      status: match ? t('sharedDraft.collected', 'Collected') : t('sharedDraft.pending', 'Pending'),
      detail: match ? t('sharedDraft.signatureAttached', 'Signature attached to this draft.') : t('sharedDraft.awaitingSignature', 'Awaiting signature for this required signer.'),
      signaturePreview: match ? compactText(match.signatureHex, t) : '',
    };
  });

  const additionalItems = collected
    .filter((item) => !requirements.some((requirement) => requirement?.kind === item?.kind && requirement?.id === item?.signerId))
    .map((item) => ({
      key: `additional:${item?.kind || 'neo'}:${item?.signerId || 'unknown'}`,
      label: formatSignerLabel(item?.kind, item?.signerId, t),
      kind: String(item?.kind || 'neo'),
      statusKey: 'collected',
      status: t('sharedDraft.collected', 'Collected'),
      detail: t('sharedDraft.additionalSigner', 'Additional collected signer outside the required roster.'),
      signaturePreview: compactText(item?.signatureHex, t),
    }));

  return [...requiredItems, ...additionalItems];
}

export function buildCollectedSignatureCards(signatures = [], t = defaultT) {
  const items = Array.isArray(signatures) ? signatures : [];
  return items.map((item) => {
    const badges = [];
    if (item?.metadata?.typedData) badges.push(t('sharedDraft.typedDataBadge', 'Typed Data'));
    if (item?.metadata?.metaInvocation) {
      badges.push(item.metadata.metaInvocation.operation === 'executeUserOp' ? t('sharedDraft.relayUserOp', 'Relay UserOp') : t('sharedDraft.relayInvocation', 'Relay Invocation'));
    }
    if (item?.payloadDigest) badges.push(t('sharedDraft.payloadDigest', 'Payload Digest'));

    return {
      key: `${item?.kind || 'neo'}:${item?.signerId || 'unknown'}`,
      label: formatSignerLabel(item?.kind, item?.signerId, t),
      signaturePreview: compactText(item?.signatureHex, t),
      createdLabel: formatCreatedDate(item?.createdAt, t),
      badges,
      signatureHex: String(item?.signatureHex || ''),
    };
  });
}
