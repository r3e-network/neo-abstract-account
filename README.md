# Neo N3 Abstract Account (ERC-4337 equivalent)

This project contains the comprehensive standard, smart contract implementation, frontend tooling, and SDK for creating and utilizing Abstract Accounts on the Neo N3 blockchain. 

## Features
- **Deterministic Proxy Verification**: No deployment cost for new users; uses a global master contract.
- **Cross-Chain EVM Compatibility**: Secp256k1 and Keccak256 native validation. Users can interact via MetaMask / EVM wallets using EIP-712 Meta-Transactions.
- **Multi-Signature Access Control**: Isolated thresholds for Admins and Managers for modular security.

## Structure
- `contracts/`: C# Smart Contract implementation of the Master Entry Contract.
- `frontend/`: Vue components demonstrating Account creation and signature workflows.
- `sdk/js/`: JavaScript/TypeScript SDK for dApp integration.
- `docs/`: Protocol design and specification standards.

