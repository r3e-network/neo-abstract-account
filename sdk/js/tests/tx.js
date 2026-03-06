function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

module.exports = {
  waitForTx,
};
