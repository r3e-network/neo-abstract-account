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

  /**
   * Derive an Abstract Account Neo address from an EVM public key.
   */
  deriveAddressFromEVM(uncompressedPubKey) {
    let pubKeyHex = uncompressedPubKey;
    if (pubKeyHex.startsWith('0x')) pubKeyHex = pubKeyHex.slice(2);

    const verifyScript = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'verify',
      args: [sc.ContractParam.byteArray(u.HexString.fromHex(pubKeyHex, false))],
    });
    const scriptHash = u.reverseHex(u.hash160(verifyScript));
    return wallet.getAddressFromScriptHash(scriptHash);
  }

  /**
   * Creates the payload required to deploy a new Abstract Account.
   */
  createAccountPayload(accountIdHex, admins, adminThreshold, managers = [], managerThreshold = 0) {
    const normalizeAddress = (addr) => {
      if (addr.startsWith('N') && addr.length === 34) {
        return wallet.getScriptHashFromAddress(addr);
      }
      if (addr.startsWith('0x')) return addr.slice(2);
      return addr;
    };

    const adminsParam = admins.map((addr) => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    const managersParam = managers.map((addr) => ({ type: 'Hash160', value: normalizeAddress(addr) }));

    const verifyScript = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'verify',
      args: [sc.ContractParam.byteArray(u.HexString.fromHex(accountIdHex, false))],
    });
    const computedAddressScriptHash = u.reverseHex(u.hash160(verifyScript));

    return {
      scriptHash: this.masterContractHash,
      operation: 'createAccountWithAddress',
      args: [
        sc.ContractParam.byteArray(accountIdHex),
        sc.ContractParam.hash160(computedAddressScriptHash),
        sc.ContractParam.array(...adminsParam.map((p) => sc.ContractParam.hash160(p.value))),
        sc.ContractParam.integer(adminThreshold),
        sc.ContractParam.array(...managersParam.map((p) => sc.ContractParam.hash160(p.value))),
        sc.ContractParam.integer(managerThreshold),
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
      accountIdHex,
      targetContract,
      method,
      args = [],
      nonce,
      deadline,
    } = options;

    const argsHashHex = await this.computeArgsHash(args);
    return buildMetaTransactionTypedData({
      chainId,
      verifyingContract: this.masterContractHash,
      accountIdHex,
      targetContract,
      method,
      argsHashHex,
      nonce,
      deadline,
    });
  }
}

module.exports = {
  AbstractAccountClient,
  buildMetaTransactionTypedData,
  sanitizeHex,
};
