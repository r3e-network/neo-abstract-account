const { rpc, tx, sc, u, wallet } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');

/**
 * Neo N3 Abstract Account SDK
 */
class AbstractAccountClient {
  constructor(rpcUrl, masterContractHash) {
    this.rpcClient = new rpc.RPCClient(rpcUrl);
    this.masterContractHash = masterContractHash;
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
      args: [ sc.ContractParam.byteArray(u.HexString.fromHex(pubKeyHex, false)) ]
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

    const adminsParam = admins.map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    const managersParam = managers.map(addr => ({ type: 'Hash160', value: normalizeAddress(addr) }));
    
    // Address bounding check
    const verifyScript = sc.createScript({
      scriptHash: this.masterContractHash,
      operation: 'verify',
      args: [ sc.ContractParam.byteArray(u.HexString.fromHex(accountIdHex, false)) ]
    });
    const computedAddressScriptHash = u.reverseHex(u.hash160(verifyScript));

    return {
      scriptHash: this.masterContractHash,
      operation: 'createAccountWithAddress',
      args: [
        sc.ContractParam.byteArray(accountIdHex),
        sc.ContractParam.hash160(computedAddressScriptHash),
        sc.ContractParam.array(...adminsParam.map(p => sc.ContractParam.hash160(p.value))),
        sc.ContractParam.integer(adminThreshold),
        sc.ContractParam.array(...managersParam.map(p => sc.ContractParam.hash160(p.value))),
        sc.ContractParam.integer(managerThreshold)
      ]
    };
  }

  /**
   * Generates the EIP-712 payload for a Meta-Transaction signature.
   */
  async createEIP712Payload(chainId, targetContract, method, args, nonce) {
    const domain = {
      name: 'NeoAbstractAccount',
      version: '1',
      chainId: chainId,
      verifyingContract: '0x' + u.reverseHex(this.masterContractHash)
    };

    const types = {
      MetaTransaction: [
        { name: 'target', type: 'bytes20' },
        { name: 'method', type: 'string' },
        { name: 'argsHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' }
      ]
    };

    // Serialize args into Neo VM format to compute the hash
    const script = sc.createScript({ scriptHash: targetContract, operation: method, args });
    const argsHash = '0x' + u.sha256(script); // Simulating args hash. Use true Neo sha256.
    
    const message = {
      target: '0x' + u.reverseHex(targetContract),
      method: method,
      argsHash: argsHash,
      nonce: nonce
    };

    return { domain, types, message };
  }
}

module.exports = { AbstractAccountClient };