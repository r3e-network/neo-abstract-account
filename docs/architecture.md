# Neo N3 Abstract Account Architecture

## Overview

The Neo N3 Abstract Account protocol serves as a universal gateway and smart contract wallet standard, providing advanced capabilities decoupled from the underlying key pairs (similar to ERC-4337). 

This allows users to deploy mathematically deterministic account addresses managed by programmable rulesets rather than basic ECDSA signatures.

## Capabilities

### Role-Based Access Control
The core system implements an Admin and Manager paradigm:
- **Admins:** Can update thresholds, add/remove members, and manage the underlying configuration of the account.
- **Managers:** Can perform day-to-day interactions and execute payload calls, but cannot alter the governance configuration.
- **Thresholds:** Both Admins and Managers have distinct, customizable multisig thresholds requiring `M-of-N` signatures.

### Custom Verifiers (Pluggable Authorization)
While the master contract ships with powerful native role-based and Dome recovery logic, it is fully extensible. 

Users can override the standard verification mechanism by assigning a **Custom Verifier Contract**.

To create a custom verifier, developers simply deploy a standard Neo smart contract implementing the following interface:

```csharp
public bool verify(ByteString accountId)
```

Once deployed, the Admin of an Abstract Account binds it to the account using:
```csharp
setVerifierContract(accountId, verifierContractHash)
```

When a custom verifier is set, the gateway automatically defers all authorization checks (during both the native `Verify` trigger and payload `Execute` phases) to this custom contract. This enables completely arbitrary signature schemes, time-locked conditions, or novel cryptographic curve verifications while maintaining the deterministic account proxy.

### Dome Recovery Network
A built-in social recovery mechanism that acts as a fallback if keys are lost.
- **Dome Accounts:** A list of trusted recovery actors (friends, hardware wallets, institutions).
- **Inactivity Timeout:** The Dome network cannot arbitrarily assume control; an admin-defined inactivity period must fully elapse before the Dome can be unlocked.
- **Oracle Integration:** Can optionally be gated by an external trusted Oracle to finalize activation.

### EIP-712 Meta-Transactions
The protocol inherently supports EVM signatures (Secp256k1 + Keccak256). The unified gateway can deserialize EIP-712 formatted `MetaTransaction` payloads, verify their EVM signers, and execute the desired underlying Neo N3 operations. This enables dApps to onboard users with MetaMask or standard EVM wallets without them needing native Neo N3 wallets.
