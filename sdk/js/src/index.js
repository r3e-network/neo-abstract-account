const { rpc, sc, u, wallet } = require('./neonCompat');
const {
  buildMetaTransactionTypedData,
  buildV3UserOperationTypedData,
  decodeByteStringStackHex,
  sanitizeHex,
} = require('./metaTx');

/**
 * Neo N3 Abstract Account SDK
 */
class AbstractAccountClient {
  constructor(rpcUrl, masterContractHash) {
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

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

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
        sc.ContractParam.hash160(normalizeAddress(hookContractHash)),
        sc.ContractParam.hash160(normalizeAddress(backupOwnerAddress)),
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

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

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

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

    const resolvedAccountHash = accountScriptHash
      ? normalizeAddress(accountScriptHash)
      : normalizeAddress(accountAddress);

    return {
      scriptHash: this.masterContractHash,
      operation: 'updateHook',
      args: [
        sc.ContractParam.hash160(resolvedAccountHash),
        sc.ContractParam.hash160(normalizeAddress(hookContractHash)),
      ],
    };
  }

  createSetMetadataUriPayload(options) {
    const {
      accountScriptHash = '',
      accountAddress = '',
      metadataUri = '',
    } = options || {};

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

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

  async getAccountsByAdmin(address) {
    throw new Error('Removed in V3: role-based admin discovery no longer exists.');
  }

  async getAccountsByManager(address) {
    throw new Error('Removed in V3: role-based manager discovery no longer exists.');
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

  async getAccountAddressesByAdmin(address) {
    throw new Error('Removed in V3: role-based admin discovery no longer exists.');
  }

  async getAccountAddressesByManager(address) {
    throw new Error('Removed in V3: role-based manager discovery no longer exists.');
  }

  async getAccountState(accountHashOrAddress) {
    const normalizeAddress = (addr) => {
      if (addr.startsWith('N') && addr.length === 34) return wallet.getScriptHashFromAddress(addr);
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };
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

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

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

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

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

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

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

    const normalizeAddress = (addr) => {
      if (!addr) return '00'.repeat(20);
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

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
    const normalizeAddress = (addr) => {
      if (addr.startsWith('N') && addr.length === 34) return wallet.getScriptHashFromAddress(addr);
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };
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
    const normalizeAddress = (addr) => {
      if (addr.startsWith('N') && addr.length === 34) return wallet.getScriptHashFromAddress(addr);
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };
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
    const normalizeAddress = (addr) => {
      if (addr.startsWith('N') && addr.length === 34) return wallet.getScriptHashFromAddress(addr);
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };
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
    const normalizeAddress = (addr) => {
      if (addr.startsWith('N') && addr.length === 34) return wallet.getScriptHashFromAddress(addr);
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };
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
  sanitizeHex,
};
