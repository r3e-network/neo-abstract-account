const { rpc, sc, u, wallet } = require('@cityofzion/neon-js');
const {
  buildMetaTransactionTypedData,
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
    const normalizedAccountId = sanitizeHex(accountIdHex);
    const byteLength = normalizedAccountId.length / 2;
    if (!Number.isInteger(byteLength) || byteLength < 0 || byteLength > 255) {
      throw new Error(`Invalid accountId hex length: ${normalizedAccountId.length}`);
    }

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

    return {
      scriptHash: this.masterContractHash,
      operation: 'registerAccount',
      args: [
        sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(accountIdHex), true)),
        sc.ContractParam.hash160(normalizeAddress(verifierContractHash)),
        sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(verifierParamsHex), true)),
        sc.ContractParam.hash160(normalizeAddress(hookContractHash)),
        sc.ContractParam.hash160(normalizeAddress(backupOwnerAddress)),
        sc.ContractParam.integer(escapeTimelock)
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
   * Generates the contract-aligned EIP-712 payload for a Meta-Transaction signature.
   */
  async createEIP712Payload(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('createEIP712Payload expects an options object');
    }

    const {
      chainId,
      accountAddressScriptHash,
      accountAddressHash,
      accountIdHex,
      targetContract,
      method,
      args = [],
      nonce,
      deadline,
    } = options;

    const resolvedAccountAddressScriptHash = accountAddressScriptHash
      ? sanitizeHex(accountAddressScriptHash)
      : accountAddressHash
        ? sanitizeHex(accountAddressHash)
        : sanitizeHex(u.hash160(this.buildVerifyScript(accountIdHex)));

    const argsHashHex = await this.computeArgsHash(args);
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
    const normalizedAddress = address.startsWith('N') ? wallet.getScriptHashFromAddress(address) : sanitizeHex(address);
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'getAccountsByAdmin',
      args: [{ type: 'Hash160', value: normalizedAddress }],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`getAccountsByAdmin fault: ${response.exception}`);
    return response?.stack?.[0]?.value || [];
  }

  async getAccountsByManager(address) {
    const normalizedAddress = address.startsWith('N') ? wallet.getScriptHashFromAddress(address) : sanitizeHex(address);
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'getAccountsByManager',
      args: [{ type: 'Hash160', value: normalizedAddress }],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`getAccountsByManager fault: ${response.exception}`);
    return response?.stack?.[0]?.value || [];
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
    const normalizedAddress = address.startsWith('N') ? wallet.getScriptHashFromAddress(address) : sanitizeHex(address);
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'getAccountAddressesByAdmin',
      args: [{ type: 'Hash160', value: normalizedAddress }],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`getAccountAddressesByAdmin fault: ${response.exception}`);
    return this.decodeAddressArray(response?.stack?.[0]);
  }

  async getAccountAddressesByManager(address) {
    const normalizedAddress = address.startsWith('N') ? wallet.getScriptHashFromAddress(address) : sanitizeHex(address);
    const script = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'getAccountAddressesByManager',
      args: [{ type: 'Hash160', value: normalizedAddress }],
    });
    const response = await this.rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (response?.state === 'FAULT') throw new Error(`getAccountAddressesByManager fault: ${response.exception}`);
    return this.decodeAddressArray(response?.stack?.[0]);
  }

  createAccountBatchPayload(accountIds, admins = [], adminThreshold = 1, managers = [], managerThreshold = 0) {
    const normalizeAddress = (addr) => {
      if (addr.startsWith('N') && addr.length === 34) return wallet.getScriptHashFromAddress(addr);
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };
    return {
      scriptHash: this.masterContractHash,
      operation: 'createAccountBatch',
      args: [
        sc.ContractParam.array(...accountIds.map((id) => sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(id), true)))),
        sc.ContractParam.array(...admins.map((addr) => sc.ContractParam.hash160(normalizeAddress(addr)))),
        sc.ContractParam.integer(adminThreshold),
        sc.ContractParam.array(...managers.map((addr) => sc.ContractParam.hash160(normalizeAddress(addr)))),
        sc.ContractParam.integer(managerThreshold),
      ],
    };
  }

}

module.exports = {
  AbstractAccountClient,
  buildMetaTransactionTypedData,
  sanitizeHex,
};
