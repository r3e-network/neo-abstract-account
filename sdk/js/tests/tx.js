function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  if (Array.isArray(witnesses) && witnesses.length > 0) {
    basePayload.witnesses = witnesses;
  }

  let transaction = new txModule.Transaction(basePayload);
  transaction.sign(account, magic);

  const networkFee = await rpcClient.calculateNetworkFee(transaction);
  transaction = new txModule.Transaction({
    ...basePayload,
    networkFee,
  });
  transaction.sign(account, magic);

  const txid = await rpcClient.sendRawTransaction(transaction);
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
