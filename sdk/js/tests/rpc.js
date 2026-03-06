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

function bindRpcHelpers({ rpcClient, sc, u }) {
  return {
    invokeRead(scriptHash, operation, args = [], signers = []) {
      return invokeRead({ rpcClient, sc, u, scriptHash, operation, args, signers });
    },
    simulate(scriptHash, operation, args = [], signers = []) {
      return simulateInvoke({ rpcClient, sc, u, scriptHash, operation, args, signers });
    },
  };
}

module.exports = {
  bindRpcHelpers,
  invokeRead,
  simulateInvoke,
};
