const { ethers } = require('ethers');
// DEPRECATED: Use buildV3UserOperationTypedData from '../metaTx.js' instead.
// This file is retained only for backward compatibility.
const { buildV3UserOperationTypedData } = require('../metaTx');

/**
 * @deprecated Use buildV3UserOperationTypedData from '../metaTx.js' instead.
 *
 * Builds EIP-712 payload for Web3Auth verifier.
 * Retained for backward compatibility only.
 *
 * @param {Object} options - Payload options
 * @param {string|number} options.chainId - Chain ID
 * @param {string} options.verifierHash - Verifier contract hash
 * @param {string} options.accountId - Account ID hash
 * @param {Object} options.userOp - UserOperation object
 * @param {string} [options.argsHash] - Pre-computed args hash
 * @returns {Object} EIP-712 typed data
 */
function buildEIP712PayloadForWeb3AuthVerifier({ chainId, verifierHash, accountId, userOp, argsHash }) {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('buildEIP712PayloadForWeb3AuthVerifier is deprecated. Use buildV3UserOperationTypedData from metaTx.js instead.');
  }
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

/**
 * @deprecated Construct the UserOp object directly instead.
 *
 * Builds a V3 UserOperation object.
 * Retained for backward compatibility only.
 *
 * @param {Object} options - UserOp options
 * @param {string} options.targetContract - Target contract hash
 * @param {string} options.method - Method name
 * @param {Array} options.args - Method arguments
 * @param {string|number} options.nonce - Nonce value
 * @param {string|number} options.deadline - Deadline timestamp
 * @returns {Object} UserOperation object
 */
function buildV3UserOp({ targetContract, method, args, nonce, deadline }) {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('buildV3UserOp is deprecated. Construct the UserOp object directly.');
  }
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
