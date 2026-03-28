import { Signature, SigningKey, TypedDataEncoder, keccak256, toUtf8Bytes } from 'ethers';
import { EC } from '../../config/errorCodes.js';
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
    const err = new Error(EC.rpcRequestFailed);
    err.rpcDetail = payload.error.message || null;
    throw err;
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

export function decodeHash160Stack(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.type === 'Hash160' && item.value) return sanitizeHex(item.value);
  if (item.type === 'ByteString' && item.value) return sanitizeHex(decodeBase64ToHex(item.value));
  return '';
}

export function decodeValidationPreviewStack(item) {
  const values = item?.type === 'Array' && Array.isArray(item.value) ? item.value : [];
  return {
    deadlineValid: values?.[0]?.value === true || values?.[0]?.value === 1 || values?.[0]?.value === '1',
    nonceAcceptable: values?.[1]?.value === true || values?.[1]?.value === 1 || values?.[1]?.value === '1',
    hasVerifier: values?.[2]?.value === true || values?.[2]?.value === 1 || values?.[2]?.value === '1',
    verifier: decodeHash160Stack(values?.[3]),
    hook: decodeHash160Stack(values?.[4]),
  };
}

export function buildV3UserOperationTypedData({
  chainId,
  verifyingContract,
  accountIdHash,
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
      UserOperation: [
        { name: 'accountId', type: 'bytes20' },
        { name: 'targetContract', type: 'address' },
        { name: 'method', type: 'string' },
        { name: 'argsHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    message: {
      accountId: `0x${sanitizeHex(accountIdHash)}`,
      targetContract: `0x${sanitizeHex(targetContract)}`,
      method: String(method || ''),
      argsHash: `0x${sanitizeHex(argsHashHex)}`,
      nonce: String(nonce),
      deadline: String(deadline),
    },
  };
}

export function buildMetaTransactionTypedData({
  chainId,
  verifyingContract,
  accountAddressScriptHash,
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
        { name: 'accountAddress', type: 'address' },
        { name: 'targetContract', type: 'address' },
        { name: 'methodHash', type: 'bytes32' },
        { name: 'argsHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    message: {
      accountAddress: `0x${sanitizeHex(accountAddressScriptHash)}`,
      targetContract: `0x${sanitizeHex(targetContract)}`,
      methodHash: keccak256(toUtf8Bytes(String(method || ''))),
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
    const err = new Error(EC.metaTxArgsHashFailed);
    err.rpcDetail = result.exception;
    throw err;
  }

  const decoded = decodeByteStringStackHex(result?.stack?.[0]);
  if (!decoded) {
    throw new Error(EC.metaTxArgsHashFailed);
  }
  return decoded;
}

export async function fetchV3Nonce({
  rpcUrl,
  aaContractHash,
  accountIdHash,
  channel = 0n,
  fetchImpl,
} = {}) {
  const result = await invokeRead({
    rpcUrl,
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'getNonce',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountIdHash)}` },
      { type: 'Integer', value: String(channel) },
    ],
    fetchImpl,
  });

  if (result?.state === 'FAULT') {
    const err = new Error(EC.metaTxNonceFailed);
    err.rpcDetail = result.exception;
    throw err;
  }

  return decodeIntegerStack(result?.stack?.[0]);
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
    operation: 'getNonceForAccount',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountAddressScriptHash)}` },
      { type: 'String', value: String(evmSignerAddress || '') },
    ],
    fetchImpl,
  });

  if (result?.state === 'FAULT') {
    const err = new Error(EC.metaTxNonceFailed);
    err.rpcDetail = result.exception;
    throw err;
  }

  return decodeIntegerStack(result?.stack?.[0]);
}

export async function fetchV3Verifier({
  rpcUrl,
  aaContractHash,
  accountIdHash,
  fetchImpl,
} = {}) {
  const result = await invokeRead({
    rpcUrl,
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'getVerifier',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountIdHash)}` },
    ],
    fetchImpl,
  });

  if (result?.state === 'FAULT') {
    const err = new Error(EC.metaTxVerifierFailed);
    err.rpcDetail = result.exception;
    throw err;
  }

  return decodeHash160Stack(result?.stack?.[0]);
}

export async function fetchV3ValidationPreview({
  rpcUrl,
  aaContractHash,
  accountIdHash,
  targetContract,
  method,
  args = [],
  nonce = 0n,
  deadline = 0,
  fetchImpl,
} = {}) {
  const result = await invokeRead({
    rpcUrl,
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'previewUserOpValidation',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountIdHash)}` },
      {
        type: 'Struct',
        value: [
          { type: 'Hash160', value: `0x${sanitizeHex(targetContract)}` },
          { type: 'String', value: String(method || '') },
          { type: 'Array', value: args },
          { type: 'Integer', value: String(nonce) },
          { type: 'Integer', value: String(deadline) },
          { type: 'ByteArray', value: '0x' },
        ],
      },
    ],
    fetchImpl,
  });

  if (result?.state === 'FAULT') {
    const err = new Error(EC.metaTxVerifierFailed);
    err.rpcDetail = result.exception;
    throw err;
  }

  return decodeValidationPreviewStack(result?.stack?.[0]);
}

export async function assertV3AccountExists({
  rpcUrl,
  aaContractHash,
  accountIdHash,
  fetchImpl,
} = {}) {
  const result = await invokeRead({
    rpcUrl,
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'getBackupOwner',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountIdHash)}` },
    ],
    fetchImpl,
  });

  if (result?.state === 'FAULT') {
    const err = new Error(EC.metaTxBackupOwnerFailed);
    err.rpcDetail = result.exception;
    throw err;
  }

  return decodeHash160Stack(result?.stack?.[0]);
}

export function buildExecuteUserOpInvocation({
  aaContractHash,
  accountIdHash,
  targetContract,
  method,
  methodArgs = [],
  nonce,
  deadline,
  signatureHex = '',
} = {}) {
  const normalizedContractHash = sanitizeHex(aaContractHash);
  const normalizedAccountIdHash = sanitizeHex(accountIdHash);
  const normalizedTargetContract = sanitizeHex(targetContract);
  const normalizedMethod = String(method || '').trim();
  if (!normalizedContractHash || !normalizedAccountIdHash || !normalizedTargetContract || !normalizedMethod) {
    return null;
  }
  return {
    scriptHash: normalizedContractHash,
    operation: 'executeUserOp',
    args: [
      { type: 'Hash160', value: `0x${normalizedAccountIdHash}` },
      {
        type: 'Struct',
        value: [
          { type: 'Hash160', value: `0x${normalizedTargetContract}` },
          { type: 'String', value: normalizedMethod },
          { type: 'Array', value: methodArgs },
          { type: 'Integer', value: String(nonce) },
          { type: 'Integer', value: String(deadline) },
          { type: 'ByteArray', value: `0x${sanitizeHex(signatureHex)}` },
        ],
      },
    ],
  };
}

export function buildExecuteUnifiedByAddressInvocation({
  aaContractHash,
  accountAddressScriptHash,
  evmPublicKeyHex = '',
  targetContract,
  method,
  methodArgs = [],
  argsHashHex = '',
  nonce = 0n,
  deadline = 0n,
  signatureHex = '',
} = {}) {
  return {
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'executeUnifiedByAddress',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountAddressScriptHash)}` },
      { type: 'Hash160', value: `0x${sanitizeHex(targetContract)}` },
      { type: 'String', value: String(method || '') },
      { type: 'Array', value: methodArgs },
      { type: 'Array', value: sanitizeHex(evmPublicKeyHex) ? [{ type: 'ByteArray', value: `0x${sanitizeHex(evmPublicKeyHex)}` }] : [] },
      { type: 'ByteArray', value: `0x${sanitizeHex(argsHashHex)}` },
      { type: 'Integer', value: String(nonce) },
      { type: 'Integer', value: String(deadline) },
      { type: 'Array', value: sanitizeHex(signatureHex) ? [{ type: 'ByteArray', value: `0x${sanitizeHex(signatureHex)}` }] : [] },
    ],
  };
}

export function toCompactEcdsaSignature(signature) {
  const parsed = Signature.from(signature);
  return `${sanitizeHex(parsed.r)}${sanitizeHex(parsed.s)}`;
}

export function recoverPublicKeyFromTypedDataSignature({ typedData, signature } = {}) {
  const digest = TypedDataEncoder.hash(typedData.domain, typedData.types, typedData.message);
  return SigningKey.recoverPublicKey(digest, signature);
}
