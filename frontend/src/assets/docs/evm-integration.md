# Ethereum / EVM Integration

The Abstract Account contract natively supports Secp256k1 + Keccak256 verification so Ethereum wallets can authorize Neo execution via EIP-712 typed data.

## Verified Testnet Path

The current verified hardened testnet deployment is `0x5be915aea3ce85e4752d522632f0a9520e377aaf`. Live validation confirmed:

- `executeUnifiedByAddress` succeeds with a valid EVM signature
- `executeUnified` succeeds with the account-id path
- stale nonces, expired deadlines, wrong chain IDs, wrong verifying contracts, and tampered `argsHash` values are rejected

## Signing Flow

1. Build the EIP-712 payload from the Neo execution intent.
2. Sign it in MetaMask or another EVM wallet.
3. Relay the signature to Neo through `executeUnified` or `executeUnifiedByAddress`.
4. Let the Abstract Account contract recover the signer and enforce runtime restrictions before calling the target contract.

## Important Hardening Note

A deterministic proxy witness alone is no longer enough to authorize a raw external contract call. The proxy witness is restricted to a single self-call back into the Abstract Account contract, so EVM signatures must ultimately drive AA wrapper entrypoints where the policy checks are enforced.
