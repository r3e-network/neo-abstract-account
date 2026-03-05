# Neo N3 Abstract Account Architecture

## 1. Description & Overview

The Neo N3 Abstract Account protocol is a robust, enterprise-grade smart contract wallet standard designed to decouple account identities from their underlying cryptographic key pairs. Conceptually similar to Ethereum's ERC-4337, this architecture transforms standard accounts into fully programmable logic gates.

By transitioning from standard ECDSA signatures to deterministic proxy contracts, developers and users can implement advanced multi-signature structures, EVM cross-chain execution capabilities, social recovery mechanisms, and fine-grained operational limits without sacrificing user experience.

---

## 2. Core Architecture & How It Works

The architecture relies on a singular **Master Entry Contract** that acts as an immutable factory and gateway proxy for all user accounts.

When a user "creates" an abstract account, no new smart contract is deployed on-chain. Instead, a lightweight **Deterministic Proxy Address** is derived mathematically using the Master Entry Contract hash and a unique, user-provided `Account ID` (which can be a UUID, an EVM public key, or any arbitrary byte array). 

This proxy address acts as the public face of the wallet. When the Neo N3 Virtual Machine triggers the `Verify` step for a transaction originating from this proxy address, the network intercepts the call and forwards the verification context to the Master Entry Contract. The Master Contract then queries its internal storage for the specific `Account ID`'s predefined ruleset (Admins, Managers, Custom Verifiers) to determine if the transaction signature is valid.

This yields two massive benefits:
1. **Zero Deployment Cost:** Users do not pay GAS to instantiate new smart contract logic.
2. **Upgradability & Universality:** All accounts share the same highly audited logic, but isolate their distinct permissions and storage state securely.

---

## 3. Account Configuration & Capabilities

The protocol supports extensive configurations to meet the security needs of individuals, DAOs, and exchanges.

### Role-Based Access Control (RBAC)
The core system implements an Admin and Manager paradigm:
- **Admins:** High-privilege actors capable of updating governance thresholds, modifying whitelists/blacklists, and altering structural configurations. 
- **Managers:** Operational actors capable of performing day-to-day smart contract interactions and token transfers. They cannot alter the structural configuration.
- **Thresholds:** Both roles have distinct, customizable multisig thresholds requiring an `M-of-N` signature consensus to execute actions.

### Granular Execution Limits
To mitigate attack vectors on compromised Manager keys, Admins can enforce strict operational boundaries:
- **Global Whitelists:** The account can be locked down so it can only interact with explicitly approved smart contract hashes.
- **Global Blacklists:** Specific malicious or deprecate contracts can be blocked universally.
- **Token Transfer Limits:** Administrators can enforce a hard maximum on the amount of a specific token (e.g., NEO, GAS) that can be moved in a single transaction.

### EIP-712 Meta-Transactions
The protocol natively understands EVM-standard cryptography (Secp256k1 + Keccak256). The Master gateway can deserialize standard EIP-712 `MetaTransaction` payloads. This allows dApp developers to onboard users strictly via MetaMask or WalletConnect—completely removing the friction of requiring a native Neo N3 wallet extension.

---

## 4. Dome Social Recovery Network

The "Dome" is a built-in social recovery network designed to restore access if primary Admin keys are lost or compromised. 

Instead of relying on a centralized custodian, users define a list of trusted **Dome Accounts** (friends, secondary hardware wallets, legal entities). To prevent these actors from arbitrarily assuming control, the protocol enforces strict temporal constraints.

1. **Inactivity Timeout:** Admins configure a `Timeout` value in seconds. The Dome network is completely locked out of the contract while the account is active.
2. **Time Decay:** Every time an Admin or Manager executes a valid transaction, the inactivity timer resets.
3. **Activation:** If the timeout period elapses with zero activity, the Dome threshold criteria becomes valid, allowing the trusted actors to issue an emergency operation to reset the Admin keys.
4. **Oracle Integration (Optional):** Admins can specify a web endpoint (`DomeOracleUrl`). Upon timeout, the Dome network must also receive a cryptographic signature from this external Oracle confirming that external real-world conditions (e.g., KYC verifications or legal proceedings) have been met before unlocking the proxy.

---

## 5. Custom Verifiers (Pluggable Authorization)

While the default Role and Dome structures cover 95% of use cases, the Neo Abstract Account protocol is designed to be infinitely extensible. 

Users can entirely bypass the standard `M-of-N` threshold logic by assigning a **Custom Verifier Contract**. When assigned, the Master Entry Contract defers all authorization checks directly to this custom logic. This enables arbitrary mathematical signature schemes, biometric gating, advanced multi-chain relayer networks, and automated algorithmic trading approvals.

### How to Build a Custom Verifier

To create a custom verifier, developers must write and deploy a standard Neo smart contract. The contract must expose the following exact interface signature:

```csharp
using Neo;
using Neo.SmartContract.Framework;

namespace MyCustomVerifier 
{
    public class CustomVerifierContract : SmartContract
    {
        // The method MUST be named "verify" and accept a single ByteString argument
        public static bool verify(ByteString accountId)
        {
            // Extract the transaction and signers
            var tx = (Transaction)Runtime.Transaction;
            
            // ... implement custom logic ...
            // Examples:
            // 1. Check if the current time is between 9 AM and 5 PM
            // 2. Validate a ZK-SNARK proof passed via transaction attributes
            // 3. Ensure the transaction only interacts with a specific DeFi router
            
            // Return true if authorized, false to reject
            return true; 
        }
    }
}
```

### How to Bind a Custom Verifier

Once your custom verifier contract is deployed to the Neo N3 network, you must bind it to your Abstract Account. This can only be done by an existing `Admin` of the account.

Using the Frontend Studio:
1. Navigate to the **Permissions & Limits** tab.
2. Locate the **Custom Verifier Contract** panel.
3. Input the Script Hash (e.g., `0xabc123...`) of your deployed verifier contract.
4. Click **Set Custom Verifier** and approve the transaction.

Using the SDK:
```javascript
const payload = {
  scriptHash: masterContractHash,
  operation: 'setVerifierContractByAddress',
  args: [
    sc.ContractParam.hash160(myAbstractAccountAddress),
    sc.ContractParam.hash160(myCustomVerifierScriptHash)
  ]
};

// Sign and invoke using the Admin's wallet
await walletService.invoke(payload);
```

To remove a custom verifier and fallback to the native role-based logic, simply update the verifier configuration with an empty hash (`0x0000000000000000000000000000000000000000`).