# Overview & Description

The Neo N3 Abstract Account protocol is a robust, enterprise-grade smart contract wallet standard designed to decouple account identities from their underlying cryptographic key pairs. Conceptually similar to Ethereum's ERC-4337, this architecture transforms standard accounts into fully programmable logic gates.

By transitioning from standard ECDSA signatures to deterministic proxy contracts, developers and users can implement advanced multi-signature structures, EVM cross-chain execution capabilities, social recovery mechanisms, and fine-grained operational limits without sacrificing user experience.

## Capabilities at a Glance

1. **Role-Based Access Control:** Separate thresholds for Admins and Managers.
2. **Dome Recovery:** Social recovery networking to restore lost keys.
3. **Execution Limits:** Universal Blacklists, Whitelists, and Token Transfer Limits.
4. **EIP-712 Compatibility:** Support for standard EVM wallets like MetaMask natively.
5. **Custom Verifiers:** Build and deploy fully custom C# smart contracts to govern verification (e.g. ZK-proofs, time-locks).