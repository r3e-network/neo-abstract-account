const { ethers } = require('ethers');
// DEPRECATED: Use buildV3UserOperationTypedData from '../metaTx.js' instead.
// This file is retained only for backward compatibility.
const { buildV3UserOperationTypedData } = require('../metaTx');

function buildEIP712PayloadForWeb3AuthVerifier({ chainId, verifierHash, accountId, userOp, argsHash }) {
  console.warn('buildEIP712PayloadForWeb3AuthVerifier is deprecated. Use buildV3UserOperationTypedData from metaTx.js instead.');
  const resolvedArgsHash = argsHash || ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(userOp.Args || [])));
  return buildV3UserOperationTypedData({
    chainId,
    verifyingContract: verifierHash,
    accountIdHash: accountId,
    targetContract: userOp.TargetContract,
    method: userOp.Method,
    argsHashHex: resolvedArgsHash,
    nonce: userOp.Nonce,
    deadline: userOp.Deadline,
  });
}

function buildV3UserOp({ targetContract, method, args, nonce, deadline }) {
  console.warn('buildV3UserOp is deprecated. Construct the UserOp object directly.');
  return {
    TargetContract: targetContract,
    Method: method,
    Args: args,
    Nonce: nonce,
    Deadline: deadline,
    Signature: '',
  };
}

module.exports = { buildEIP712PayloadForWeb3AuthVerifier, buildV3UserOp };
