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

async function invokeRead({ rpcClient, sc, u, scriptHash, operation, args = [], signers = [] }) {
  const script = sc.createScript({ scriptHash, operation, args });
  const response = await withTransientRpcRetry(() => rpcClient.invokeScript(u.HexString.fromHex(script), signers));
  if (response?.state === 'FAULT') {
    throw new Error(`${operation} fault: ${response.exception}`);
  }
  return response;
}

async function simulateInvoke({ rpcClient, sc, u, scriptHash, operation, args = [], signers = [] }) {
  const script = sc.createScript({ scriptHash, operation, args });
  return withTransientRpcRetry(() => rpcClient.invokeScript(u.HexString.fromHex(script), signers));
}

async function getNetworkMagic({ rpcClient, rpc, errorMessage = 'Missing network magic' }) {
  const version = typeof rpcClient?.getVersion === 'function'
    ? await withTransientRpcRetry(() => rpcClient.getVersion())
    : await withTransientRpcRetry(() => rpcClient.execute(new rpc.Query({ method: 'getversion' })));
  const magic = version?.protocol?.network;
  if (!magic) {
    throw new Error(errorMessage);
  }
  return magic;
}

function bindRpcHelpers({ rpcClient, sc, u, rpc }) {
  return {
    invokeRead(scriptHash, operation, args = [], signers = []) {
      return invokeRead({ rpcClient, sc, u, scriptHash, operation, args, signers });
    },
    simulate(scriptHash, operation, args = [], signers = []) {
      return simulateInvoke({ rpcClient, sc, u, scriptHash, operation, args, signers });
    },
    getNetworkMagic(errorMessage = 'Missing network magic') {
      return getNetworkMagic({ rpcClient, rpc, errorMessage });
    },
  };
}

module.exports = {
  bindRpcHelpers,
  getNetworkMagic,
  invokeRead,
  isTransientRpcError,
  simulateInvoke,
  withTransientRpcRetry,
};
