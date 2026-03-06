async function invokeRead({ rpcClient, sc, u, scriptHash, operation, args = [], signers = [] }) {
  const script = sc.createScript({ scriptHash, operation, args });
  const response = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
  if (response?.state === 'FAULT') {
    throw new Error(`${operation} fault: ${response.exception}`);
  }
  return response;
}

async function simulateInvoke({ rpcClient, sc, u, scriptHash, operation, args = [], signers = [] }) {
  const script = sc.createScript({ scriptHash, operation, args });
  return rpcClient.invokeScript(u.HexString.fromHex(script), signers);
}

async function getNetworkMagic({ rpcClient, rpc, errorMessage = 'Missing network magic' }) {
  const version = typeof rpcClient?.getVersion === 'function'
    ? await rpcClient.getVersion()
    : await rpcClient.execute(new rpc.Query({ method: 'getversion' }));
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
  simulateInvoke,
};
