const { ethers } = require('ethers');
const { EC, createError } = require('./errors');

/**
 * Sanitizes a hex string by removing 0x prefix and converting to lowercase.
 *
 * @param {string} value - The hex string to sanitize
 * @returns {string} Sanitized hex string
 */
function sanitizeHex(value) {
  return String(value || '').replace(/^0x/i, '').toLowerCase();
}

/**
 * Decodes a ByteString stack item to hex string.
 *
 * @param {Object} item - Stack item from RPC response
 * @returns {string} Decoded hex string (lowercase)
 */
function decodeByteStringStackHex(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return Buffer.from(item.value, 'base64').toString('hex').toLowerCase();
}

/**
 * Builds the EIP-712 typed data for a meta transaction.
 * Compatible with legacy account binding format.
 *
 * @param {Object} options - Typed data options
 * @param {string|number} options.chainId - Chain ID for EIP-712 domain
 * @param {string} options.verifyingContract - Verifying contract hash (40 hex chars)
 * @param {string} [options.accountAddressScriptHash] - Account script hash (legacy)
 * @param {string} [options.accountAddressHash] - Account address hash (legacy)
 * @param {string} options.targetContract - Target contract hash (40 hex chars)
 * @param {string} options.method - Method name
 * @param {string} options.argsHashHex - Args hash (32 bytes, 64 hex chars)
 * @param {string|number} options.nonce - Nonce value
 * @param {string|number} options.deadline - Deadline timestamp
 * @returns {Object} EIP-712 typed data structure
 * @throws {Error} If nonce/deadline missing or argsHash invalid
 */
function buildMetaTransactionTypedData({
  chainId,
  verifyingContract,
  accountAddressScriptHash,
  accountAddressHash,
  targetContract,
  method,
  argsHashHex,
  nonce,
  deadline,
}) {
  if (nonce == null) throw createError(EC.VALIDATION_NONCE_REQUIRED);
  if (deadline == null) throw createError(EC.VALIDATION_DEADLINE_REQUIRED);
  const sanitized = sanitizeHex(argsHashHex);
  if (sanitized.length !== 64) {
    throw createError(EC.VALIDATION_ARGS_HASH_INVALID, {
      provided: argsHashHex,
      hint: `Expected 64 hex chars, got ${sanitized.length}`,
    });
  }
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
      accountAddress: `0x${sanitizeHex(accountAddressScriptHash || accountAddressHash)}`,
      targetContract: `0x${sanitizeHex(targetContract)}`,
      methodHash: ethers.keccak256(ethers.toUtf8Bytes(String(method))),
      argsHash: `0x${sanitizeHex(argsHashHex)}`,
      nonce: String(nonce),
      deadline: String(deadline),
    },
  };
}

/**
 * Builds the EIP-712 typed data for a V3 UserOperation.
 * Uses accountId-based verification (V3 format).
 *
 * @param {Object} options - Typed data options
 * @param {string|number} options.chainId - Chain ID for EIP-712 domain
 * @param {string} options.verifyingContract - Verifier contract hash (40 hex chars)
 * @param {string} options.accountIdHash - Account ID hash (40 hex chars)
 * @param {string} options.targetContract - Target contract hash (40 hex chars)
 * @param {string} options.method - Method name
 * @param {string} options.argsHashHex - Args hash (32 bytes, 64 hex chars)
 * @param {string|number} options.nonce - Nonce value
 * @param {string|number} options.deadline - Deadline timestamp
 * @returns {Object} EIP-712 typed data structure
 * @throws {Error} If nonce/deadline missing or argsHash invalid
 */
function buildV3UserOperationTypedData({
  chainId,
  verifyingContract,
  accountIdHash,
  targetContract,
  method,
  argsHashHex,
  nonce,
  deadline,
}) {
  if (nonce == null) throw createError(EC.VALIDATION_NONCE_REQUIRED);
  if (deadline == null) throw createError(EC.VALIDATION_DEADLINE_REQUIRED);
  const sanitized = sanitizeHex(argsHashHex);
  if (sanitized.length !== 64) {
    throw createError(EC.VALIDATION_ARGS_HASH_INVALID, {
      provided: argsHashHex,
      hint: `Expected 64 hex chars, got ${sanitized.length}`,
    });
  }
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

/**
 * Converts a Hash160 to 32-byte word with reversed byte order.
 * Matches Web3AuthVerifier.ToBytes20Word in contract.
 *
 * @param {string} hash160 - 20-byte hash (40 hex chars)
 * @returns {Uint8Array} 32-byte word with reversed bytes
 * @private
 */
function toBytes20Word(hash160) {
  const clean = sanitizeHex(hash160);
  if (clean.length !== 40) {
    throw createError(EC.ENCODING_HASH160_INVALID, {
      provided: hash160,
      hint: 'Expected 40 hex chars (20 bytes)',
    });
  }
  const source = Buffer.from(clean, 'hex');
  const result = new Uint8Array(32);
  // Input is already big-endian (neon-js display format). Contract's UInt160
  // is little-endian internally and ToBytes20Word reverses to big-endian.
  // Both sides must produce the same big-endian result, so we just right-pad.
  for (let i = 0; i < 20; i++) {
    result[i] = source[i];
  }
  return result;
}

/**
 * Converts a Hash160 to 32-byte EVM address word with reversed byte order and left padding.
 * Matches Web3AuthVerifier.ToAddressWord in contract.
 *
 * @param {string} hash160 - 20-byte hash (40 hex chars)
 * @returns {Uint8Array} 32-byte word with 12 zero bytes then reversed address
 * @private
 */
function toAddressWord(hash160) {
  const clean = sanitizeHex(hash160);
  if (clean.length !== 40) {
    throw createError(EC.ENCODING_HASH160_INVALID, {
      provided: hash160,
      hint: 'Expected 40 hex chars (20 bytes)',
    });
  }
  const address = Buffer.from(clean, 'hex');
  const result = new Uint8Array(32);
  // Input is already big-endian (neon-js display format). Contract's UInt160
  // is little-endian internally and ToAddressWord reverses to big-endian.
  // Both sides must produce the same big-endian result, so just left-pad.
  for (let i = 0; i < 20; i++) {
    result[12 + i] = address[i];
  }
  return result;
}

/**
 * Converts a number to 32-byte big-endian uint256 word.
 * Matches Web3AuthVerifier.ToUint256Word in contract.
 *
 * @param {number|string|bigint} value - The value to encode
 * @returns {Uint8Array} 32-byte big-endian uint256
 * @private
 */
function toUint256Word(value) {
  const bigintValue = BigInt(value);
  if (bigintValue < 0n) {
    throw createError(EC.ENCODING_UINT256_INVALID, {
      provided: value,
      hint: 'Value must be non-negative',
    });
  }
  const result = new Uint8Array(32);
  // Convert to big-endian: least significant byte at position 31
  let remaining = bigintValue;
  for (let i = 0; i < 32 && remaining > 0n; i++) {
    result[31 - i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return result;
}

/**
 * Type hash for EIP-712 domain.
 * Pre-computed keccak256("EIP712Domain(uint256 chainId,address verifyingContract)")
 */
const EIP712_DOMAIN_TYPE_HASH = new Uint8Array([
  0x8b, 0x73, 0xc3, 0xc6, 0x9b, 0xb8, 0xfe, 0x3d,
  0x51, 0x2e, 0xcc, 0x4c, 0xf7, 0x59, 0xcc, 0x79,
  0x23, 0x9f, 0x7b, 0x17, 0x9b, 0x0f, 0xfa, 0xca,
  0xa9, 0xa7, 0x5d, 0x52, 0x2b, 0x39, 0x40, 0x0f,
]);

/**
 * Pre-computed keccak256 of "Neo N3 Abstract Account" name.
 */
const EIP712_NAME_HASH = new Uint8Array([
  0x2e, 0x3d, 0x38, 0xea, 0x00, 0x55, 0xad, 0x99,
  0xb5, 0x57, 0x2e, 0x06, 0x66, 0x58, 0x43, 0x1f,
  0xf4, 0xc4, 0x0d, 0xba, 0xf3, 0xe1, 0x6e, 0x21,
  0x54, 0x63, 0x9d, 0xc6, 0xe2, 0x63, 0x48, 0x03,
]);

/**
 * Pre-computed keccak256 of "1" version.
 */
const EIP712_VERSION_HASH = new Uint8Array([
  0xc8, 0x9e, 0xfd, 0xaa, 0x54, 0xc0, 0xf2, 0x0c,
  0x7a, 0xdf, 0x61, 0x28, 0x82, 0xdf, 0x09, 0x50,
  0xf5, 0xa9, 0x51, 0x63, 0x7e, 0x03, 0x07, 0xcd,
  0xcb, 0x4c, 0x67, 0x2f, 0x29, 0x8b, 0x8b, 0xc6,
]);

/**
 * Type hash for UserOperation struct.
 * Pre-computed keccak256("UserOperation(bytes20 accountId,address targetContract,string method,bytes32 argsHash,uint256 nonce,uint256 deadline)")
 */
const USER_OPERATION_TYPE_HASH = new Uint8Array([
  0x11, 0x92, 0x53, 0xf9, 0x50, 0x4b, 0x54, 0xcf,
  0xd9, 0x46, 0x60, 0xa8, 0x1a, 0x50, 0xad, 0xef,
  0x30, 0x66, 0x3e, 0xd5, 0xa8, 0xe9, 0x40, 0x6b,
  0x87, 0x1c, 0x96, 0xdf, 0x18, 0xe0, 0xf2, 0xf4,
]);

/**
 * Builds the contract-compatible domain separator hash.
 * Matches Web3AuthVerifier.BuildDomainSeparator in contract.
 *
 * @param {number|string|bigint} network - The network magic/chain ID
 * @param {string} verifyingContract - The verifier contract hash (40 hex chars)
 * @returns {string} 32-byte domain separator hash (hex string)
 */
function buildContractCompatibleDomainSeparator(network, verifyingContract) {
  const encoded = new Uint8Array(
    EIP712_DOMAIN_TYPE_HASH.length +
    EIP712_NAME_HASH.length +
    EIP712_VERSION_HASH.length +
    32 + // uint256 network
    32 // address verifyingContract
  );

  let offset = 0;
  encoded.set(EIP712_DOMAIN_TYPE_HASH, offset);
  offset += EIP712_DOMAIN_TYPE_HASH.length;
  encoded.set(EIP712_NAME_HASH, offset);
  offset += EIP712_NAME_HASH.length;
  encoded.set(EIP712_VERSION_HASH, offset);
  offset += EIP712_VERSION_HASH.length;
  encoded.set(toUint256Word(network), offset);
  offset += 32;
  encoded.set(toAddressWord(verifyingContract), offset);

  return ethers.keccak256(encoded);
}

/**
 * Builds the contract-compatible struct hash for UserOperation.
 * Matches Web3AuthVerifier.BuildMetaTxStructHash in contract.
 *
 * This function replicates the contract's custom encoding:
 * - Uses raw keccak256 of method string (not EIP-712 string encoding)
 * - Reverses bytes for accountId (ToBytes20Word)
 * - Reverses and pads bytes for targetContract (ToAddressWord)
 * - Uses big-endian encoding for nonce/deadline
 *
 * @param {Object} options - Struct hash options
 * @param {string} options.accountIdHash - Account ID hash (40 hex chars)
 * @param {string} options.targetContract - Target contract hash (40 hex chars)
 * @param {string} options.method - Method name
 * @param {string} options.argsHash - Serialized args hash (32 bytes, 64 hex chars)
 * @param {number|string|bigint} options.nonce - Nonce value
 * @param {number|string|bigint} options.deadline - Deadline timestamp
 * @returns {string} 32-byte struct hash (hex string with 0x prefix)
 *
 * @throws {Error} If any parameter is invalid
 *
 * @example
 * ```javascript
 * const structHash = buildContractCompatibleStructHash({
 *   accountIdHash: 'f951...hash',
 *   targetContract: '49c0...hash',
 *   method: 'transfer',
 *   argsHash: '0xabcd...hash',
 *   nonce: 0,
 *   deadline: Math.floor(Date.now() / 1000) + 3600,
 * });
 *
 * // Create EIP-712 signing payload
 * const domainSeparator = buildContractCompatibleDomainSeparator(chainId, verifierHash);
 * const payload = ethers.solidityPackedKeccak256(
 *   ['bytes32', 'bytes32', 'bytes32'],
 *   ['0x1901', domainSeparator, structHash]
 * );
 *
 * // Sign with EVM wallet
 * const signature = await wallet.signMessage(ethers.getBytes(payload));
 * ```
 */
function buildContractCompatibleStructHash({
  accountIdHash,
  targetContract,
  method,
  argsHash,
  nonce,
  deadline,
}) {
  // Validate inputs
  const cleanAccountId = sanitizeHex(accountIdHash);
  const cleanTarget = sanitizeHex(targetContract);
  const cleanArgsHash = sanitizeHex(argsHash);

  if (cleanAccountId.length !== 40) {
    throw createError(EC.ENCODING_HASH160_INVALID, {
      provided: accountIdHash,
      hint: 'accountIdHash must be 40 hex chars (20 bytes)',
    });
  }
  if (cleanTarget.length !== 40) {
    throw createError(EC.ENCODING_HASH160_INVALID, {
      provided: targetContract,
      hint: 'targetContract must be 40 hex chars (20 bytes)',
    });
  }
  if (cleanArgsHash.length !== 64) {
    throw createError(EC.ENCODING_ARGS_HASH_INVALID, {
      provided: argsHash,
      hint: 'argsHash must be 64 hex chars (32 bytes)',
    });
  }

  // Compute method hash using raw keccak256 of method string bytes
  // Contract does: NativeCryptoLib.Keccak256((ByteString)op.Method)
  const methodBytes = ethers.toUtf8Bytes(String(method));
  const methodHash = ethers.keccak256(methodBytes);

  // Build struct payload matching contract's concatenation order:
  // keccak256(UserOperationTypeHash || ToBytes20Word(accountId) ||
  //   ToAddressWord(targetContract) || keccak256(method) ||
  //   keccak256(serializedArgs) || ToUint256Word(nonce) ||
  //   ToUint256Word(deadline))
  const payload = new Uint8Array(
    USER_OPERATION_TYPE_HASH.length +
    32 + // accountId
    32 + // targetContract
    32 + // methodHash
    32 + // argsHash
    32 + // nonce
    32 // deadline
  );

  let offset = 0;
  payload.set(USER_OPERATION_TYPE_HASH, offset);
  offset += USER_OPERATION_TYPE_HASH.length;
  payload.set(toBytes20Word(cleanAccountId), offset);
  offset += 32;
  payload.set(toAddressWord(cleanTarget), offset);
  offset += 32;
  payload.set(ethers.getBytes(methodHash), offset);
  offset += 32;
  payload.set(ethers.getBytes(`0x${cleanArgsHash}`), offset);
  offset += 32;
  payload.set(toUint256Word(nonce), offset);
  offset += 32;
  payload.set(toUint256Word(deadline), offset);

  return ethers.keccak256(payload);
}

/**
 * Creates the complete EIP-712 signing payload for Web3Auth verification.
 * Combines domain separator with struct hash using 0x1901 prefix.
 *
 * @param {Object} options - EIP-712 payload options
 * @param {number|string|bigint} options.chainId - Network chain ID
 * @param {string} options.verifierHash - Verifier contract hash (40 hex chars)
 * @param {string} options.accountIdHash - Account ID hash (40 hex chars)
 * @param {string} options.targetContract - Target contract hash (40 hex chars)
 * @param {string} options.method - Method name
 * @param {string} options.argsHash - Args hash (32 bytes, 64 hex chars)
 * @param {number|string|bigint} options.nonce - Nonce value
 * @param {number|string|bigint} options.deadline - Deadline timestamp
 * @returns {Uint8Array} 66-byte payload (0x1901 + domainSep(32) + structHash(32))
 */
function buildWeb3AuthSigningPayload({
  chainId,
  verifierHash,
  accountIdHash,
  targetContract,
  method,
  argsHash,
  nonce,
  deadline,
}) {
  const domainSeparator = ethers.getBytes(
    buildContractCompatibleDomainSeparator(chainId, verifierHash)
  );
  const structHash = ethers.getBytes(
    buildContractCompatibleStructHash({
      accountIdHash,
      targetContract,
      method,
      argsHash,
      nonce,
      deadline,
    })
  );

  // 0x19 0x01 || domainSeparator || structHash
  const payload = new Uint8Array(2 + domainSeparator.length + structHash.length);
  payload[0] = 0x19;
  payload[1] = 0x01;
  payload.set(domainSeparator, 2);
  payload.set(structHash, 2 + domainSeparator.length);

  return payload;
}

module.exports = {
  sanitizeHex,
  decodeByteStringStackHex,
  buildMetaTransactionTypedData,
  buildV3UserOperationTypedData,
  buildContractCompatibleStructHash,
  buildContractCompatibleDomainSeparator,
  buildWeb3AuthSigningPayload,
  toBytes20Word,
  toAddressWord,
  toUint256Word,
};
