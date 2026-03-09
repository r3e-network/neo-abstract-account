import { ethers } from 'ethers';
import { sanitizeHex } from '../../utils/hex.js';

function decodeBase64ToHex(value) {
  if (!value) return '';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('hex').toLowerCase();
  }

  const binary = globalThis.atob ? globalThis.atob(value) : '';
  return Array.from(binary, (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

async function invokeRead({ rpcUrl, scriptHash, operation, args = [], fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'invokefunction',
      params: [scriptHash, operation, args],
    }),
  });

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || 'RPC error');
  }
  return payload.result;
}

export function decodeByteStringStackHex(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return decodeBase64ToHex(item.value);
}

export function decodeIntegerStack(item) {
  if (!item || item.type !== 'Integer' || item.value == null) return 0n;
  return BigInt(item.value);
}

export function buildMetaTransactionTypedData({
  chainId,
  verifyingContract,
  accountIdHex,
  targetContract,
  method,
  argsHashHex,
  nonce,
  deadline,
}) {
  return {
    domain: {
      name: 'Neo N3 Abstract Account',
      version: '1',
      chainId,
      verifyingContract: `0x${sanitizeHex(verifyingContract)}`,
    },
    types: {
      MetaTransaction: [
        { name: 'accountId', type: 'bytes' },
        { name: 'targetContract', type: 'address' },
        { name: 'methodHash', type: 'bytes32' },
        { name: 'argsHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    message: {
      accountId: `0x${sanitizeHex(accountIdHex)}`,
      targetContract: `0x${sanitizeHex(targetContract)}`,
      methodHash: ethers.keccak256(ethers.toUtf8Bytes(String(method))),
      argsHash: `0x${sanitizeHex(argsHashHex)}`,
      nonce: String(nonce),
      deadline: String(deadline),
    },
  };
}

export async function computeArgsHash({ rpcUrl, aaContractHash, args = [], fetchImpl } = {}) {
  const result = await invokeRead({
    rpcUrl,
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'computeArgsHash',
    args: [{ type: 'Array', value: args }],
    fetchImpl,
  });

  if (result?.state === 'FAULT') {
    throw new Error(`computeArgsHash fault: ${result.exception || 'VM fault'}`);
  }

  const decoded = decodeByteStringStackHex(result?.stack?.[0]);
  if (!decoded) {
    throw new Error('computeArgsHash returned an empty result');
  }
  return decoded;
}

export async function fetchNonceForAddress({
  rpcUrl,
  aaContractHash,
  accountAddressScriptHash,
  evmSignerAddress,
  fetchImpl,
} = {}) {
  const result = await invokeRead({
    rpcUrl,
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'getNonceForAddress',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountAddressScriptHash)}` },
      { type: 'Hash160', value: `0x${sanitizeHex(evmSignerAddress)}` },
    ],
    fetchImpl,
  });

  if (result?.state === 'FAULT') {
    throw new Error(`getNonceForAddress fault: ${result.exception || 'VM fault'}`);
  }

  return decodeIntegerStack(result?.stack?.[0]);
}

export function buildExecuteMetaTxByAddressInvocation({
  aaContractHash,
  accountAddressScriptHash,
  evmPublicKeyHex,
  targetContract,
  method,
  methodArgs = [],
  argsHashHex,
  nonce,
  deadline,
  signatureHex,
} = {}) {
  return {
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'executeMetaTxByAddress',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountAddressScriptHash)}` },
      { type: 'Array', value: [{ type: 'ByteArray', value: `0x${sanitizeHex(evmPublicKeyHex)}` }] },
      { type: 'Hash160', value: `0x${sanitizeHex(targetContract)}` },
      { type: 'String', value: String(method || '') },
      { type: 'Array', value: methodArgs },
      { type: 'ByteArray', value: `0x${sanitizeHex(argsHashHex)}` },
      { type: 'Integer', value: String(nonce) },
      { type: 'Integer', value: String(deadline) },
      { type: 'Array', value: [{ type: 'ByteArray', value: `0x${sanitizeHex(signatureHex)}` }] },
    ],
  };
}

export function recoverPublicKeyFromTypedDataSignature({ typedData, signature } = {}) {
  const digest = ethers.TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
  return ethers.SigningKey.recoverPublicKey(digest, signature);
}
