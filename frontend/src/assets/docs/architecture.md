# Core Architecture

The Neo N3 Abstract Account protocol heavily leverages the native capabilities of the Neo Virtual Machine, particularly its concept of dynamic **Verification Scripts**. 

The architecture relies on a singular **Master Entry Contract** that acts as an immutable factory and gateway proxy for all user accounts.

When a user "creates" an abstract account, no new smart contract is deployed on-chain. Instead, a lightweight **Deterministic Proxy Address** is derived mathematically using the Master Entry Contract hash and a unique, user-provided `Account ID` (which can be a UUID, an EVM public key, or any arbitrary byte array). 

> **Important Highlight: How the Verification Script Works**  
> On Neo N3, every account address is a base58 encoded hash of a compiled bytecode script. The Abstract Account generates this bytecode by constructing a script that simply invokes the `verify` operation on the Master Entry Contract, passing in the user's `accountId` as the only argument.
> 
> Because this small bytecode snippet is deterministic, the resulting hash (the Neo Address) is permanently linked to the Master Contract and the user's ID.

This proxy address acts as the public face of the wallet. When the Neo N3 Virtual Machine triggers the `Verify` step for a transaction originating from this proxy address, the network intercepts the call and forwards the verification context to the Master Entry Contract. 

The Master Contract then queries its internal storage for the specific `Account ID`'s predefined ruleset (Admins, Managers, Custom Verifiers) to determine if the transaction signature is valid.

## Technical Benefits
1. **Zero Deployment Cost:** Users do not pay GAS to instantiate new smart contract logic. Their configuration is merely stored within the Master's state.
2. **Upgradability & Universality:** All accounts share the same highly audited logic but isolate their distinct permissions securely.

## EIP-712 Meta-Transactions
The protocol natively understands EVM-standard cryptography (Secp256k1 + Keccak256). The Master gateway can deserialize standard EIP-712 `MetaTransaction` payloads. This allows dApp developers to onboard users strictly via MetaMask or WalletConnect—completely removing the friction of requiring a native Neo N3 wallet extension.