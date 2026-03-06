# Neo N3 Abstract Account (ERC-4337 equivalent)

This project contains the comprehensive standard, smart contract implementation, frontend tooling, and SDK for creating and utilizing Abstract Accounts on the Neo N3 blockchain.

## Features
- **Deterministic Proxy Verification**: No deployment cost for new users; uses a global master contract.
- **Hardened Policy-Gated Execution**: External interactions must flow through AA entrypoints where method policy, whitelist / blacklist, and transfer-limit controls are enforced.
- **Cross-Chain EVM Compatibility**: Secp256k1 and Keccak256 native validation. Users can interact via MetaMask / EVM wallets using EIP-712 Meta-Transactions.
- **Multi-Signature Access Control**: Isolated thresholds for Admins and Managers for modular security.

## Quickstart

### Prerequisites
- `.NET SDK 10`
- `Node.js 22+`

### Install

```bash
cd frontend && npm ci
cd ../sdk/js && npm ci
```

### Test

```bash
dotnet test neo-abstract-account.sln -c Release --nologo
cd frontend && npm test
cd sdk/js && npm test
```

### Build

```bash
cd frontend && npm run build
```

## Verified Testnet Status

Verified on **Neo N3 testnet** on **March 6, 2026** against hardened contract **`0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423`** (deployment tx **`0x635e75cc321fcb7b0906f6a9c39f9d1b227848e7e56d9648496d7d4df706a984`**) using:
- `sdk/js/tests/aa_testnet_integration_check.js`
- `sdk/js/tests/test-evm-meta-tx.js`
- `sdk/js/tests/aa_testnet_full_validate.js`
- `sdk/js/tests/aa_testnet_negative_meta_validate.js`
- `sdk/js/tests/aa_testnet_max_transfer_validate.js`
- `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`

Additional live authorization simulation confirmed `update` still HALTs for the deployer and FAULTs with `Not Deployer` for a non-deployer signer on the hardened deployment.

### Security Checklist
- [x] Unauthorized bootstrap account creation is rejected.
- [x] Blacklisted targets are blocked from execution.
- [x] Whitelist-only mode blocks non-whitelisted targets.
- [x] Whitelist-only mode still allows explicitly whitelisted targets.
- [x] Meta-transaction replay with a stale nonce is rejected.
- [x] Expired meta-transaction signatures are rejected.
- [x] Tampered `argsHash` values are rejected.
- [x] Wrong EIP-712 chain ID signatures are rejected.
- [x] Wrong EIP-712 verifying-contract signatures are rejected.
- [x] Mismatched pubkey/signature pairs are rejected.
- [x] Invalid signature lengths are rejected.
- [x] Mismatched signer-array lengths are rejected.
- [x] Negative meta-transaction simulations leave nonce state unchanged.
- [x] Upgrade authorization is restricted to the deployer account.
- [x] Direct proxy-signed external spends are rejected on the hardened deployment.
- [ ] Threshold `> 1` multisig execution is live-tested.
- [ ] Custom verifier flows are live-tested.
- [ ] Dome/oracle activation flows are live-tested.
- [ ] Concurrency/load behavior is stress-tested.

### Functionality Checklist
- [x] Create account with deterministic address binding.
- [x] Create account without address and bind it later.
- [x] Read admins by account ID and by address.
- [x] Read managers by account ID and by address.
- [x] Read admin and manager thresholds by ID and by address.
- [x] Resolve account ID from address and address from account ID.
- [x] Read nonce values for account and address paths.
- [x] Compute a 32-byte `argsHash` through the contract.
- [x] Execute calls through `execute` by account ID.
- [x] Execute calls through `executeByAddress` by bound address.
- [x] Execute EVM meta-transactions by address.
- [x] Execute EVM meta-transactions by account ID.
- [x] Execute mixed Neo-relayer + EVM-signer flows.
- [x] Set admins and managers through native admin operations.
- [x] Set whitelist, blacklist, and whitelist-mode controls.
- [x] Set max-transfer policy values.
- [x] Prove live max-transfer enforcement on an actual GAS token transfer through `executeByAddress`.
- [ ] Prove live `approve` / allowance enforcement on a token supporting approvals.

Verification note: live max-transfer enforcement was confirmed with `sdk/js/tests/aa_testnet_max_transfer_validate.js` using the owner as the transaction sender plus the deterministic AA proxy as an additional signer with `CustomContracts` scope limited to the AA contract and GAS, and the AA witness bound to `verify(accountId)`.

### Fresh Deploy + Real Update Verification

A second destructive verification pass was completed on **March 6, 2026** against a freshly deployed unique testnet instance **`0x171359751dee7f56ea633586bd070a51c8d60e9c`**.

- Fresh deploy tx: **`0x6ed39853b92ace9bf1a87e0b295aeb8455dd987c391a62c6ec28ef25ed9a9c54`**
- Real update tx: **`0x3390f58a10e2aed726d6b414c57eaf59f92216eed44b825f230cd48f57d77b9e`**
- Post-update validation reran `sdk/js/tests/aa_testnet_integration_check.js`, `sdk/js/tests/test-evm-meta-tx.js`, `sdk/js/tests/aa_testnet_full_validate.js`, `sdk/js/tests/aa_testnet_negative_meta_validate.js`, `sdk/js/tests/aa_testnet_max_transfer_validate.js`, and `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`
- Post-update authorization simulation confirmed the deployer `update` path still HALTs and a non-deployer signer still FAULTs with `Not Deployer`

### Legacy Comparison Note

The legacy testnet deployment **`0xf3f706936e37eeaf6bf51b074e55e840f30d993a`** remains a useful comparison baseline only. A raw proxy-signed GAS `transfer` still succeeds there, while the hardened deployment rejects that path and preserves wrapper execution through AA entrypoints such as `execute` and `executeByAddress` where restrictions are enforced.

## Structure
- `contracts/`: C# Smart Contract implementation of the Master Entry Contract.
- `frontend/`: Vue components demonstrating Account creation and signature workflows.
- `sdk/js/`: JavaScript/TypeScript SDK for dApp integration.
- `docs/`: Protocol design and specification standards.
