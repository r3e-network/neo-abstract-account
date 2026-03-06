async function sendInvocation({
  rpcClient,
  txModule,
  sc,
  u,
  sendTransaction,
  waitForTx,
  assertVmStateHalt,
  account,
  magic,
  scriptHash,
  aaHash,
  operation,
  args = [],
  witnessScope = txModule?.WitnessScope?.CalledByEntry,
  signers,
  witnesses = [],
  waitForConfirmation = false,
  waitOptions,
  assertHalt = false,
  haltLabel = `${operation} tx`,
}) {
  const resolvedScriptHash = scriptHash || aaHash;
  const resolvedSigners = Array.isArray(signers) && signers.length > 0
    ? signers
    : [{ account: account.scriptHash, scopes: witnessScope }];
  const script = sc.createScript({ scriptHash: resolvedScriptHash, operation, args });

  const sim = await rpcClient.invokeScript(u.HexString.fromHex(script), resolvedSigners);
  if (sim?.state === 'FAULT') {
    throw new Error(`${operation} simulation fault: ${sim.exception}`);
  }

  const currentHeight = await rpcClient.getBlockCount();
  const { txid, networkFee } = await sendTransaction({
    rpcClient,
    txModule,
    account,
    magic,
    signers: resolvedSigners,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: sim?.gasconsumed || '1000000',
    witnesses,
  });

  const result = {
    txid,
    systemFee: sim?.gasconsumed,
    networkFee,
  };

  if (!waitForConfirmation) {
    return result;
  }
  if (typeof waitForTx !== 'function') {
    throw new Error('waitForTx is required when waitForConfirmation is true');
  }

  const appLog = await waitForTx(rpcClient, txid, waitOptions || {});
  if (assertHalt) {
    if (typeof assertVmStateHalt !== 'function') {
      throw new Error('assertVmStateHalt is required when assertHalt is true');
    }
    assertVmStateHalt(appLog, haltLabel);
  }

  return {
    ...result,
    appLog,
  };
}

function bindInvocationHelpers(dependencies) {
  return {
    sendInvocation(options) {
      return sendInvocation({
        ...dependencies,
        ...options,
      });
    },
  };
}

module.exports = {
  bindInvocationHelpers,
  sendInvocation,
};
