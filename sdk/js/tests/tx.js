function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientRpcError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '');
  return code === 'ECONNRESET'
    || code === 'ETIMEDOUT'
    || code === 'ECONNREFUSED'
    || message.includes('tls connection was established')
    || message.includes('socket disconnected')
    || message.includes('socket hang up')
    || message.includes('fetcherror')
    || message.includes('econnreset');
}

async function withTransientRpcRetry(fn, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientRpcError(error)) throw error;
    }
  }
  throw lastError;
}

function extractVmState(appLog) {
  return String(appLog?.executions?.[0]?.vmstate || appLog?.executions?.[0]?.vmState || 'UNKNOWN').toUpperCase();
}

function assertVmStateHalt(appLog, label = 'transaction') {
  const vmState = extractVmState(appLog);
  if (vmState !== 'HALT') {
    throw new Error(`${label} vmstate ${vmState}`);
  }
  return vmState;
}

async function waitForTx(rpcClient, txid, options = {}) {
  const {
    timeoutMs = 180000,
    pollIntervalMs = 2500,
    sleep = defaultSleep,
    now = Date.now,
    errorMessage = `Timed out waiting for tx ${txid}`,
    isReady = (appLog) => !!appLog?.executions?.length,
  } = options;

  const start = now();
  while (now() - start < timeoutMs) {
    try {
      const appLog = await rpcClient.getApplicationLog(txid);
      if (isReady(appLog)) {
        return appLog;
      }
    } catch (_) {}

    await sleep(pollIntervalMs);
  }

  throw new Error(errorMessage);
}

function appendWitnessesInSignerOrder(transaction, txModule, witnesses = []) {
  if (!Array.isArray(witnesses) || witnesses.length === 0) {
    return transaction;
  }

  if (typeof transaction.addWitness === 'function' && typeof txModule?.Witness === 'function') {
    for (const witness of witnesses) {
      transaction.addWitness(new txModule.Witness(witness));
    }
    return transaction;
  }

  transaction.witnesses = [
    ...(Array.isArray(transaction.witnesses) ? transaction.witnesses : []),
    ...witnesses,
  ];
  return transaction;
}

async function sendTransaction({
  rpcClient,
  txModule,
  account,
  magic,
  signers,
  validUntilBlock,
  script,
  systemFee,
  witnesses = [],
}) {
  const basePayload = {
    signers,
    validUntilBlock,
    script,
    systemFee,
  };

  let transaction = new txModule.Transaction(basePayload);
  transaction.sign(account, magic);
  appendWitnessesInSignerOrder(transaction, txModule, witnesses);

  const networkFee = await withTransientRpcRetry(() => rpcClient.calculateNetworkFee(transaction));
  transaction = new txModule.Transaction({
    ...basePayload,
    networkFee,
  });
  transaction.sign(account, magic);
  appendWitnessesInSignerOrder(transaction, txModule, witnesses);

  const txid = await withTransientRpcRetry(() => rpcClient.sendRawTransaction(transaction));
  return {
    txid,
    networkFee: networkFee?.toString?.() || String(networkFee),
  };
}

module.exports = {
  assertVmStateHalt,
  extractVmState,
  waitForTx,
  sendTransaction,
};
