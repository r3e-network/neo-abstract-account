import { buildRelayPayloadOptions } from './execution.js';

function compactText(value, head = 8, tail = 8) {
  const text = String(value || '').trim();
  if (!text) return 'Not available';
  if (text.length <= head + tail - 1) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

function formatSignerLabel(kind = 'neo', signerId = '') {
  return `${String(kind || 'neo').toUpperCase()} · ${String(signerId || 'Unknown signer').trim() || 'Unknown signer'}`;
}

function formatCreatedDate(value = '') {
  const text = String(value || '').trim();
  if (!text) return 'Unknown date';
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

function resolveInvocationLabel(draft = {}) {
  const transactionBody = draft?.transaction_body || {};
  const operation = transactionBody?.v3Invocation?.operation
    || transactionBody?.clientInvocation?.operation
    || transactionBody?.metaInvocation?.operation
    || transactionBody?.metaInvocations?.[0]?.operation
    || transactionBody?.meta_invocations?.[0]?.operation
    || draft?.signatures?.find((item) => item?.metadata?.metaInvocation)?.metadata?.metaInvocation?.operation
    || '';

  return operation === 'executeUserOp' ? 'UserOperation Invocation' : 'Relay Invocation';
}

function buildPayloadSummary(draft = {}, runtime = null) {
  const availableModes = buildRelayPayloadOptions({
    runtime,
    transactionBody: draft?.transaction_body || {},
    signatures: draft?.signatures || [],
  });
  const invocationLabel = resolveInvocationLabel(draft);

  if (availableModes.includes('raw') && availableModes.includes('meta')) {
    return `Raw Tx + ${invocationLabel}`;
  }
  if (availableModes.includes('raw')) {
    return 'Raw Tx';
  }
  if (availableModes.includes('meta')) {
    return invocationLabel;
  }
  return 'Client Invocation Only';
}

export function buildOperationSnapshotItems({ draft = {}, relayReadiness = {} } = {}) {
  const operationBody = draft?.operation_body || {};
  const transactionBody = draft?.transaction_body || {};
  const clientInvocation = transactionBody?.clientInvocation || {};
  const targetContract = operationBody?.targetContract || clientInvocation?.scriptHash || 'Not available';
  const method = operationBody?.method || clientInvocation?.operation || 'Not staged';
  const args = Array.isArray(operationBody?.args)
    ? operationBody.args
    : Array.isArray(clientInvocation?.args)
      ? clientInvocation.args
      : [];

  return [
    {
      label: 'Target Contract',
      value: targetContract,
    },
    {
      label: 'Method',
      value: method,
    },
    {
      label: 'Arguments',
      value: `${args.length} argument(s)`,
    },
    {
      label: 'Relay State',
      value: relayReadiness?.label || 'Relay Blocked',
      note: relayReadiness?.detail || '',
    },
    {
      label: 'Payloads',
      value: buildPayloadSummary(draft, relayReadiness?.runtime || null),
      note: hasMetaInvocation(draft) ? 'Collected typed-data approvals can be relayed directly when relay invocation mode is enabled.' : '',
    },
  ];
}

export function buildSignerChecklistItems({ signerRequirements = [], signatures = [] } = {}) {
  const requirements = Array.isArray(signerRequirements) ? signerRequirements : [];
  const collected = Array.isArray(signatures) ? signatures : [];

  const requiredItems = requirements.map((item) => {
    const match = collected.find((signature) => signature?.kind === item?.kind && signature?.signerId === item?.id);
    return {
      key: `required:${item?.kind || 'neo'}:${item?.id || 'unknown'}`,
      label: formatSignerLabel(item?.kind, item?.id),
      kind: String(item?.kind || 'neo'),
      status: match ? 'Collected' : 'Pending',
      detail: match ? 'Signature attached to this draft.' : 'Awaiting signature for this required signer.',
      signaturePreview: match ? compactText(match.signatureHex) : '',
    };
  });

  const additionalItems = collected
    .filter((item) => !requirements.some((requirement) => requirement?.kind === item?.kind && requirement?.id === item?.signerId))
    .map((item) => ({
      key: `additional:${item?.kind || 'neo'}:${item?.signerId || 'unknown'}`,
      label: formatSignerLabel(item?.kind, item?.signerId),
      kind: String(item?.kind || 'neo'),
      status: 'Collected',
      detail: 'Additional collected signer outside the required roster.',
      signaturePreview: compactText(item?.signatureHex),
    }));

  return [...requiredItems, ...additionalItems];
}

export function buildCollectedSignatureCards(signatures = []) {
  const items = Array.isArray(signatures) ? signatures : [];
  return items.map((item) => {
    const badges = [];
    if (item?.metadata?.typedData) badges.push('Typed Data');
    if (item?.metadata?.metaInvocation) {
      badges.push(item.metadata.metaInvocation.operation === 'executeUserOp' ? 'Relay UserOp' : 'Relay Invocation');
    }
    if (item?.payloadDigest) badges.push('Payload Digest');

    return {
      key: `${item?.kind || 'neo'}:${item?.signerId || 'unknown'}`,
      label: formatSignerLabel(item?.kind, item?.signerId),
      signaturePreview: compactText(item?.signatureHex),
      createdLabel: formatCreatedDate(item?.createdAt),
      badges,
      signatureHex: String(item?.signatureHex || ''),
    };
  });
}
