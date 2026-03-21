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

export function evaluateRelayReadiness({ runtime = {}, transactionBody = {}, signatures = [], t } = {}) {
  if (!runtime?.relayEnabled) {
    return {
      level: 'blocked',
      mode: 'none',
      isReady: false,
      label: t ? t('sharedDraft.relayBlocked', 'Relay Blocked') : 'Relay Blocked',
      detail: t ? t('sharedDraft.relayEndpointNotConfigured', 'Relay endpoint is not configured.') : 'Relay endpoint is not configured.',
    };
  }

  if (transactionBody?.rawTransaction || transactionBody?.raw_transaction || transactionBody?.txHex) {
    if (runtime?.relayRawEnabled) {
      return {
        level: 'ready',
        mode: 'raw',
        isReady: true,
        label: t ? t('sharedDraft.relayReady', 'Relay Ready') : 'Relay Ready',
        detail: t ? t('sharedDraft.rawTxReady', 'Signed raw transaction is ready for relay submission.') : 'Signed raw transaction is ready for relay submission.',
      };
    }

    return {
      level: 'warning',
      mode: 'raw',
      isReady: false,
      label: t ? t('sharedDraft.relayPending', 'Relay Pending') : 'Relay Pending',
      detail: t ? t('sharedDraft.rawTxPending', 'Signed raw transaction is collected; enable raw relay forwarding to submit it through the relay.') : 'Signed raw transaction is collected; enable raw relay forwarding to submit it through the relay.',
    };
  }

  const metaInvocation = findMetaInvocation(signatures, transactionBody);
  if (metaInvocation) {
    if (runtime?.relayMetaEnabled) {
      return {
        level: 'ready',
        mode: 'meta',
        isReady: true,
        label: t ? t('sharedDraft.relayReady', 'Relay Ready') : 'Relay Ready',
        detail: t ? t('sharedDraft.metaReady', 'Relay-ready invocation is available for submission.') : 'Relay-ready invocation is available for submission.',
      };
    }

    return {
      level: 'warning',
      mode: 'meta',
      isReady: false,
      label: t ? t('sharedDraft.relayPending', 'Relay Pending') : 'Relay Pending',
      detail: t ? t('sharedDraft.metaPending', 'Relay invocation is collected; enable relay invocation mode to submit it directly.') : 'Relay invocation is collected; enable relay invocation mode to submit it directly.',
    };
  }

  return {
    level: 'blocked',
    mode: 'none',
    isReady: false,
    label: t ? t('sharedDraft.relayBlocked', 'Relay Blocked') : 'Relay Blocked',
    detail: t ? t('sharedDraft.noSignedTransaction', 'No signed raw transaction or relay-ready invocation is available yet.') : 'No signed raw transaction or relay-ready invocation is available yet.',
  };
}
