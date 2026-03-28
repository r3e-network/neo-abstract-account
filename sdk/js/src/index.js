const { rpc, sc, u, wallet } = require('@cityofzion/neon-js');
const {
  buildMetaTransactionTypedData,
  buildV3UserOperationTypedData,
  decodeByteStringStackHex,
  sanitizeHex,
} = require('./metaTx');

function normalizeAddress(addressHex) {
  if (!addressHex) {
    throw new Error('Address is required');
  }
  let hex = addressHex;
  if (hex.startsWith('N') && hex.length === 34) {
    return wallet.getScriptHashFromAddress(hex);
  }
  if (hex.startsWith('0x')) hex = hex.slice(2);
  return hex;
}

function decodeByteStringStackText(item) {
  if (!item) return '';
  if (item.type === 'ByteString' && item.value) {
    return Buffer.from(item.value, 'base64').toString('utf8');
  }
  if (item.type === 'String' && item.value) {
    return String(item.value);
  }
  return '';
}

function decodeStackBoolean(item) {
  return item?.value === true
    || item?.value === 1
    || item?.value === '1'
    || item?.value === 'true'
    || item?.value === 'True';
}

function decodeHash160Stack(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.type === 'Hash160' && item.value) return sanitizeHex(item.value);
  if (item.type === 'ByteString' && item.value) return sanitizeHex(Buffer.from(item.value, 'base64').toString('hex'));
  return '';
}

function decodeValidationPreviewStack(item) {
  const values = item?.type === 'Array' && Array.isArray(item.value) ? item.value : [];
  return {
    deadlineValid: decodeStackBoolean(values[0]),
    nonceAcceptable: decodeStackBoolean(values[1]),
    hasVerifier: decodeStackBoolean(values[2]),
    verifier: decodeHash160Stack(values[3]),
    hook: decodeHash160Stack(values[4]),
  };
}

/**
 * Neo N3 Abstract Account SDK
 */
class AbstractAccountClient {
  constructor(rpcUrl, masterContractHash) {
    if (!rpcUrl) throw new Error('rpcUrl is required');
    if (!masterContractHash) throw new Error('masterContractHash is required');
    this.rpcClient = new rpc.RPCClient(rpcUrl);
    this.masterContractHash = sanitizeHex(masterContractHash);
  }

  buildVerifyScript(accountIdHex) {
    const normalizedAccountId = this.deriveAccountIdHash(accountIdHex);
    const byteLength = normalizedAccountId.length / 2;

    return [
      '0c',
      byteLength.toString(16).padStart(2, '0'),
      normalizedAccountId,
      '11c01f0c06766572696679',
      '0c14',
      sanitizeHex(u.reverseHex(this.masterContractHash)),
      '41627d5b52',
    ].join('');
  }

  deriveAccountIdHash(accountIdHexOrSeed) {
    const normalized = sanitizeHex(accountIdHexOrSeed || '');
    if (!normalized) {
      throw new Error('Account seed is required');
    }
    if (/^[0-9a-f]{40}$/i.test(normalized)) {
      return normalized;
    }
    return sanitizeHex(u.hash160(normalized));
  }

  deriveVirtualAccount(accountIdSeedHex) {
    const accountIdHash = this.deriveAccountIdHash(accountIdSeedHex);
    const verifyScript = this.buildVerifyScript(accountIdHash);
    const scriptHash = sanitizeHex(u.hash160(verifyScript));
    const address = wallet.getAddressFromScriptHash(scriptHash);
    return {
      accountIdHash,
      verifyScript,
      scriptHash,
      address,
    };
  }

  /**
   * Derive an Abstract Account Neo address from an EVM public key.
   */
  deriveAddressFromEVM(uncompressedPubKey) {
    let pubKeyHex = uncompressedPubKey;
    if (pubKeyHex.startsWith('0x')) pubKeyHex = pubKeyHex.slice(2);

    const verifyScript = this.buildVerifyScript(pubKeyHex);
    const scriptHash = sanitizeHex(u.hash160(verifyScript));
    return wallet.getAddressFromScriptHash(scriptHash);
  }

  /**
   * Creates the payload required to register a new V3 Abstract Account.
   */
  createAccountPayload(options) {
    const {
      accountIdHex,
      accountScriptHash = '',
      accountAddress = '',
      verifierContractHash,
      verifierParamsHex = '',
      hookContractHash = '',
      backupOwnerAddress,
      escapeTimelock = 30 * 24 * 60 * 60, // 30 days default
    } = options;

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : accountAddress
        ? normalizeAddress(accountAddress)
        : this.deriveVirtualAccount(accountIdHex).accountIdHash;

    return {
      scriptHash: this.masterContractHash,
      operation: 'registerAccount',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
        sc.ContractParam.hash160(normalizeAddress(verifierContractHash)),
        sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(verifierParamsHex), true)),
        sc.ContractParam.hash160(hookContractHash ? normalizeAddress(hookContractHash) : '00'.repeat(20)),
        sc.ContractParam.hash160(backupOwnerAddress ? normalizeAddress(backupOwnerAddress) : '00'.repeat(20)),
        sc.ContractParam.integer(escapeTimelock)
      ],
    };
  }

  createUpdateVerifierPayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
      verifierContractHash,
      verifierParamsHex = '',
    } = options || {};

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'updateVerifier',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
        sc.ContractParam.hash160(normalizeAddress(verifierContractHash)),
        sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(verifierParamsHex), true)),
      ],
    };
  }

  createUpdateHookPayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
      hookContractHash = '',
    } = options || {};

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'updateHook',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
        sc.ContractParam.hash160(hookContractHash ? normalizeAddress(hookContractHash) : '00'.repeat(20)),
      ],
    };
  }

  createSetMetadataUriPayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
      metadataUri = '',
    } = options || {};

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'SetMetadataUri',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
        sc.ContractParam.string(metadataUri),
      ],
    };
  }

  async computeArgsHash(args = []) {
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'computeArgsHash',
      args: [{ type: 'Array', value: args }],
    });

    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') {
      throw new Error(`computeArgsHash fault: ${response.exception || 'VM fault'}`);
    }

    const argsHashHex = decodeByteStringStackHex(response?.stack?.[0]);
    if (!argsHashHex) {
      throw new Error('computeArgsHash returned an empty result');
    }

    return argsHashHex;
  }

  /**
   * Generates the contract-aligned EIP-712 payload for a V3 UserOperation signature.
   * Falls back to the legacy MetaTransaction schema only when no accountId path is provided.
   */
  async createEIP712Payload(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('createEIP712Payload expects an options object');
    }

    const {
      chainId,
      accountAddressScriptHash,
      accountAddressHash,
      accountIdHash,
      accountIdHex,
      verifierHash,
      targetContract,
      method,
      args = [],
      nonce,
      deadline,
    } = options;

    if (nonce == null) throw new Error('nonce is required for EIP-712 payload');
    if (deadline == null) throw new Error('deadline is required for EIP-712 payload');

    const argsHashHex = await this.computeArgsHash(args);
    const resolvedAccountIdHash = accountIdHash
      ? sanitizeHex(accountIdHash)
      : accountIdHex
        ? this.deriveVirtualAccount(accountIdHex).accountIdHash
        : '';

    if (resolvedAccountIdHash) {
      const resolvedVerifierHash = verifierHash
        ? sanitizeHex(verifierHash)
        : await (async () => {
            const script = sc.createScript({
              scriptHash: this.masterContractHash,
              operation: 'getVerifier',
              args: [{ type: 'Hash160', value: resolvedAccountIdHash }],
            });
            const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
            if (response?.state === 'FAULT') {
              throw new Error(`getVerifier fault: ${response.exception || 'VM fault'}`);
            }
            return sanitizeHex(response?.stack?.[0]?.value || '');
          })();

      if (!resolvedVerifierHash) {
        throw new Error('No verifier is configured for this V3 account.');
      }

      return buildV3UserOperationTypedData({
        chainId,
        verifyingContract: resolvedVerifierHash,
        accountIdHash: resolvedAccountIdHash,
        targetContract,
        method,
        argsHashHex,
        nonce,
        deadline,
      });
    }

    const resolvedAccountAddressScriptHash = accountAddressScriptHash
      ? sanitizeHex(accountAddressScriptHash)
      : accountAddressHash
        ? sanitizeHex(accountAddressHash)
        : '';

    if (!resolvedAccountAddressScriptHash) {
      throw new Error('createEIP712Payload requires either an accountId path or a legacy bound address.');
    }

    return buildMetaTransactionTypedData({
      chainId,
      verifyingContract: this.masterContractHash,
      accountAddressScriptHash: resolvedAccountAddressScriptHash,
      targetContract,
      method,
      argsHashHex,
      nonce,
      deadline,
    });
  }

  decodeAddressArray(stackItem) {
    if (!stackItem || stackItem.type !== 'Array' || !Array.isArray(stackItem.value)) return [];
    return stackItem.value.map((item) => {
      let rawHex = '';
      if (item.type === 'Hash160' && item.value) rawHex = sanitizeHex(item.value);
      if (item.type === 'ByteString' && item.value) rawHex = sanitizeHex(Buffer.from(item.value, 'base64').toString('hex'));
      if (!rawHex) return null;
      return wallet.getAddressFromScriptHash(sanitizeHex(u.reverseHex(rawHex)));
    }).filter(Boolean);
  }

  async getAccountImplementationId() {
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'getAccountImplementationId',
      args: [],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`getAccountImplementationId fault: ${response.exception}`);
    return decodeByteStringStackText(response?.stack?.[0]);
  }

  async supportsExecutionMode(mode) {
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'supportsExecutionMode',
      args: [{ type: 'String', value: String(mode || '') }],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`supportsExecutionMode fault: ${response.exception}`);
    return decodeStackBoolean(response?.stack?.[0]);
  }

  async supportsModuleType(moduleType) {
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'supportsModuleType',
      args: [{ type: 'String', value: String(moduleType || '') }],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`supportsModuleType fault: ${response.exception}`);
    return decodeStackBoolean(response?.stack?.[0]);
  }

  async isModuleInstalled(accountHashOrAddress, moduleType, moduleHashOrAddress) {
    const accountId = normalizeAddress(accountHashOrAddress);
    const moduleHash = normalizeAddress(moduleHashOrAddress);
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'isModuleInstalled',
      args: [
        { type: 'Hash160', value: accountId },
        { type: 'String', value: String(moduleType || '') },
        { type: 'Hash160', value: moduleHash },
      ],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`isModuleInstalled fault: ${response.exception}`);
    return decodeStackBoolean(response?.stack?.[0]);
  }

  async getUserOpValidationPreview({
    accountIdHash = '',
    accountAddress = '',
    targetContract,
    method,
    args = [],
    nonce = 0,
    deadline = 0,
  } = {}) {
    const accountId = accountIdHash
      ? normalizeAddress(accountIdHash)
      : normalizeAddress(accountAddress);
    const response = await this.rpcClient.invokeFunction(this.masterContractHash, 'previewUserOpValidation', [
      { type: 'Hash160', value: accountId },
      {
        type: 'Struct',
        value: [
          { type: 'Hash160', value: normalizeAddress(targetContract) },
          { type: 'String', value: String(method || '') },
          { type: 'Array', value: args },
          { type: 'Integer', value: String(nonce) },
          { type: 'Integer', value: String(deadline) },
          { type: 'ByteArray', value: '0x' },
        ],
      },
    ]);
    if (response?.state === 'FAULT') throw new Error(`previewUserOpValidation fault: ${response.exception}`);
    return decodeValidationPreviewStack(response?.stack?.[0]);
  }

  async getAccountsByAdmin() {
    throw new Error('Removed in V3: role-based admin discovery no longer exists.');
  }

  async getAccountsByManager() {
    throw new Error('Removed in V3: role-based manager discovery no longer exists.');
  }

  async getAccountAddressesByAdmin() {
    throw new Error('Removed in V3: role-based admin discovery no longer exists.');
  }

  async getAccountAddressesByManager() {
    throw new Error('Removed in V3: role-based manager discovery no longer exists.');
  }

  async getAccountState(accountHashOrAddress) {
    const accountId = normalizeAddress(accountHashOrAddress);

    const invokeSafe = async (operation) => {
      const script = sc.createScript({
        scriptHash: this.masterContractHash,
        operation,
        args: [{ type: 'Hash160', value: accountId }],
      });
      const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
      if (response?.state === 'FAULT') throw new Error(`${operation} fault: ${response.exception}`);
      return response?.stack?.[0] || null;
    };

    const invokeOptional = async (operation) => {
      try {
        return await invokeSafe(operation);
      } catch (error) {
        if (/method not found/i.test(String(error?.message || ''))) {
          return null;
        }
        throw error;
      }
    };

    const [verifier, hook, backupOwner, escapeTimelock, escapeTriggeredAt, escapeActive, metadataUri] = await Promise.all([
      invokeSafe('getVerifier'),
      invokeSafe('getHook'),
      invokeSafe('getBackupOwner'),
      invokeSafe('getEscapeTimelock'),
      invokeSafe('getEscapeTriggeredAt'),
      invokeSafe('isEscapeActive'),
      invokeOptional('getMetadataUri'),
    ]);

    return {
      accountId,
      verifier: verifier?.value || '',
      hook: hook?.value || '',
      backupOwner: backupOwner?.value || '',
      escapeTimelock: escapeTimelock?.value || '0',
      escapeTriggeredAt: escapeTriggeredAt?.value || '0',
      escapeActive: Boolean(escapeActive?.value),
      metadataUri: metadataUri?.value || '',
    };
  }

  createConfirmHookUpdatePayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
    } = options || {};

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'ConfirmHookUpdate',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
      ],
    };
  }

  createConfirmVerifierUpdatePayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
    } = options || {};

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'ConfirmVerifierUpdate',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
      ],
    };
  }

  createCancelHookUpdatePayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
    } = options || {};

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'CancelHookUpdate',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
      ],
    };
  }

  createCancelVerifierUpdatePayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
    } = options || {};

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'CancelVerifierUpdate',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
      ],
    };
  }

  async getHasPendingVerifierUpdate(accountHashOrAddress) {
    const accountId = normalizeAddress(accountHashOrAddress);

    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'HasPendingVerifierUpdate',
      args: [{ type: 'Hash160', value: accountId }],
    });

    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`HasPendingVerifierUpdate fault: ${response.exception}`);
    return response?.stack?.[0]?.value === true || response?.stack?.[0]?.value === 1;
  }

  async getHasPendingHookUpdate(accountHashOrAddress) {
    const accountId = normalizeAddress(accountHashOrAddress);

    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'HasPendingHookUpdate',
      args: [{ type: 'Hash160', value: accountId }],
    });

    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`HasPendingHookUpdate fault: ${response.exception}`);
    return response?.stack?.[0]?.value === true || response?.stack?.[0]?.value === 1;
  }

  async getPendingVerifierUpdateTime(accountHashOrAddress) {
    const accountId = normalizeAddress(accountHashOrAddress);

    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'GetPendingVerifierUpdateTime',
      args: [{ type: 'Hash160', value: accountId }],
    });

    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`GetPendingVerifierUpdateTime fault: ${response.exception}`);
    return response?.stack?.[0]?.value || 0;
  }

  async getPendingHookUpdateTime(accountHashOrAddress) {
    const accountId = normalizeAddress(accountHashOrAddress);

    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'GetPendingHookUpdateTime',
      args: [{ type: 'Hash160', value: accountId }],
    });

    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`GetPendingHookUpdateTime fault: ${response.exception}`);
    return response?.stack?.[0]?.value || 0;
  }

  async getIsAnyExecutionActive() {
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'IsAnyExecutionActive',
      args: [],
    });

    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`IsAnyExecutionActive fault: ${response.exception}`);
    return response?.stack?.[0]?.value === true || response?.stack?.[0]?.value === 1;
  }

}

module.exports = {
  AbstractAccountClient,
  buildMetaTransactionTypedData,
  buildV3UserOperationTypedData,
  decodeByteStringStackHex,
  sanitizeHex,
};
