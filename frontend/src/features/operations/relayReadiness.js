function findMetaInvocation(signatures = [], transactionBody = {}) {
  if (transactionBody?.metaInvocation) return transactionBody.metaInvocation;
  if (Array.isArray(transactionBody?.metaInvocations) && transactionBody.metaInvocations.length > 0) {
    return transactionBody.metaInvocations[0];
  }
  if (Array.isArray(transactionBody?.meta_invocations) && transactionBody.meta_invocations.length > 0) {
    return transactionBody.meta_invocations[0];
  }
  return Array.isArray(signatures)
    ? signatures.find((item) => item?.metadata?.metaInvocation)?.metadata?.metaInvocation || null
    : null;
}

export function evaluateRelayReadiness({ runtime = {}, transactionBody = {}, signatures = [] } = {}) {
  if (!runtime?.relayEnabled) {
    return {
      level: 'blocked',
      mode: 'none',
      isReady: false,
      label: 'Relay Blocked',
      detail: 'Relay endpoint is not configured.',
    };
  }

  if (transactionBody?.rawTransaction || transactionBody?.raw_transaction || transactionBody?.txHex) {
    if (runtime?.relayRawEnabled) {
      return {
        level: 'ready',
        mode: 'raw',
        isReady: true,
        label: 'Relay Ready',
        detail: 'Signed raw transaction is ready for relay submission.',
      };
    }

    return {
      level: 'warning',
      mode: 'raw',
      isReady: false,
      label: 'Relay Pending',
      detail: 'Signed raw transaction is collected; enable raw relay forwarding to submit it through the relay.',
    };
  }

  const metaInvocation = findMetaInvocation(signatures, transactionBody);
  if (metaInvocation) {
    if (runtime?.relayMetaEnabled) {
      return {
        level: 'ready',
        mode: 'meta',
        isReady: true,
        label: 'Relay Ready',
        detail: 'Relay-ready meta invocation is available for submission.',
      };
    }

    return {
      level: 'warning',
      mode: 'meta',
      isReady: false,
      label: 'Relay Pending',
      detail: 'Meta invocation is collected; enable relay meta mode to submit it directly.',
    };
  }

  return {
    level: 'blocked',
    mode: 'none',
    isReady: false,
    label: 'Relay Blocked',
    detail: 'No signed raw transaction or relay-ready meta invocation is available yet.',
  };
}
