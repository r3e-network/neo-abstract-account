# Ethereum / EVM Integration

The Neo N3 Abstract Account standard natively supports Ethereum accounts (EVM wallets) like MetaMask, Trust Wallet, and Coinbase Wallet. This allows Ethereum users to seamlessly interact with Neo N3 decentralized applications without needing to download a Neo-specific wallet extension.

## How It Works

EVM wallets sign transactions using the `Secp256k1` elliptic curve and `Keccak256` hashing algorithms. Neo N3 supports these cryptographic primitives natively at the VM level.

The Abstract Account gateway acts as an interpreter. It receives **Meta-Transactions**—payloads structured according to Ethereum's EIP-712 typed data standard—and verifies the EVM signature on-chain using Neo's `CryptoLib`. If the signature is valid and the Ethereum address holds a role (Admin or Manager) on the Abstract Account, the gateway executes the payload on the Neo network.

## 1. Creating the Account with an EVM Key

When creating an Abstract Account for an Ethereum user, the `Account ID` should be derived from their uncompressed EVM Public Key.

```javascript
import { ethers } from 'ethers';

// 1. Get the EVM user's address and public key
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Note: In practice, public keys must be derived from a signature or provided by the wallet connection API.
const evmPublicKeyHex = "04..."; // Uncompressed 65-byte Secp256k1 key

// 2. The Abstract Account ID is this hex string
const accountId = evmPublicKeyHex;

// 3. The EVM Address is added as an Admin
const adminAddress = await signer.getAddress(); // e.g. "0x71C..."
```

## 2. Managing the Account (EIP-712 Signatures)

To execute a transaction on Neo N3 using an Ethereum wallet, the dApp must request the user to sign an EIP-712 typed data structure.

### The EIP-712 Domain

The Neo Master Entry Contract acts as the `verifyingContract`. 

```javascript
const domain = {
  name: 'NeoAbstractAccount',
  version: '1',
  chainId: 888, // Custom chain ID or mapped Neo network magic
  verifyingContract: '0x' + masterContractHashHex // The Neo N3 Master Gateway hash formatted as hex
};
```

### The Transaction Payload

The payload defines the target Neo smart contract, the method to call, and the hash of the arguments.

```javascript
const types = {
  MetaTransaction: [
    { name: 'target', type: 'bytes20' }, // Target Neo N3 Contract Hash
    { name: 'method', type: 'string' },  // e.g., 'transfer'
    { name: 'argsHash', type: 'bytes32' }, // sha256 hash of the serialized Neo VM arguments
    { name: 'nonce', type: 'uint256' }
  ]
};

const message = {
  target: '0x' + targetContractHash,
  method: 'transfer',
  argsHash: computeArgsHash(args),
  nonce: currentNonce
};
```

### Signing with MetaMask

The user signs the payload using `eth_signTypedData_v4`. They will see a clean, human-readable prompt in their MetaMask popup detailing the exact Neo contract and method they are authorizing.

```javascript
const signature = await signer.signTypedData(domain, types, message);
```

## 3. Relaying to Neo N3

Because the Ethereum user does not hold Neo GAS, they cannot broadcast this signature directly to the Neo N3 mempool.

Instead, the dApp (or a decentralized Relayer network) takes the `signature` and wraps it in a standard Neo N3 transaction, paying the GAS fee on the user's behalf.

```javascript
// Relayer Code (Neo N3 Wallet)
const tx = await neoWallet.invoke({
  scriptHash: masterContractHash,
  operation: 'executeMetaTx',
  args: [
    sc.ContractParam.byteArray(accountId), // The EVM PubKey
    sc.ContractParam.hash160(targetContract),
    sc.ContractParam.string(method),
    sc.ContractParam.array(...serializedArgs),
    sc.ContractParam.byteArray(signature) // The EIP-712 signature from MetaMask
  ]
});
```

When the Master Entry Contract receives this invocation, it:
1. Reconstructs the exact EIP-712 payload.
2. Performs an `ecrecover` using `Secp256k1Keccak256` to extract the Ethereum Address.
3. Checks if that Ethereum Address is in the `Admins` or `Managers` list for the given `accountId`.
4. Executes the Neo N3 logic dynamically.