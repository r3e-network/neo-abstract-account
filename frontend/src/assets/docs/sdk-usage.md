# Abstract Account SDK Integration

The JavaScript SDK exposes the current Abstract Account client surface used by the live validation suite. It covers deterministic address derivation, account-creation payloads, and EIP-712 typed-data generation backed by the contract's `computeArgsHash` method.

## Installation

```bash
npm install @cityofzion/neon-js ethers
```

## 1. Initialize the Client

Use a Neo N3 RPC endpoint and the verified hardened testnet deployment hash unless you explicitly override it with another instance.

```javascript
const { AbstractAccountClient } = require('./sdk/js/src');

const rpcUrl = 'https://testnet1.neo.coz.io:443';
const masterHash = '0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423';

const aaClient = new AbstractAccountClient(rpcUrl, masterHash);
```

## 2. Derive the Deterministic Proxy Address

```javascript
const evmPubKey = '04d09c...';
const proxyAddress = aaClient.deriveAddressFromEVM(evmPubKey);
console.log(proxyAddress);
```

The derived address corresponds to the deterministic `verify(accountId)` script for that `accountId`.

## 3. Build an Account-Creation Payload

`createAccountPayload` returns the invocation payload for `createAccountWithAddress`, including the computed deterministic address binding.

```javascript
const payload = aaClient.createAccountPayload(
  evmPubKey,
  ['NQh...ownerAddress'],
  1,
  [],
  0,
);

console.log(payload.scriptHash); // AA master contract
console.log(payload.operation);  // createAccountWithAddress
console.log(payload.args);
```

## 4. Generate an EIP-712 Payload

The SDK asks the contract to compute the canonical `argsHash`, then returns the typed-data object expected by MetaMask or Ethers.

```javascript
const typedData = await aaClient.createEIP712Payload({
  chainId: 894710606,
  accountIdHex: evmPubKey,
  targetContract: masterHash,
  method: 'setWhitelistModeByAddress',
  args: [
    { type: 'Hash160', value: '0x1234567890abcdef1234567890abcdef12345678' },
    { type: 'Boolean', value: true },
  ],
  nonce: 0,
  deadline: Math.floor(Date.now() / 1000) + 3600,
});

const signature = await signer.signTypedData(
  typedData.domain,
  typedData.types,
  typedData.message,
);
```

## 5. Execution Model Reminder

The typed-data signature authorizes an Abstract Account wrapper call. On hardened deployments, external interactions must flow through AA entrypoints such as `execute`, `executeByAddress`, `executeMetaTx`, or `executeMetaTxByAddress`; raw direct proxy-signed external spends are intentionally rejected.
