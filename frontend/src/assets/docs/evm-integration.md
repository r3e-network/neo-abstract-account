# Ethereum / EVM Integration

The Abstract Account contract natively supports Secp256k1 + Keccak256 verification so Ethereum wallets can authorize Neo execution via EIP-712 typed data.

## Verified Testnet Path

The current verified hardened testnet deployment is `0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423`. Live validation confirmed:

- `executeMetaTxByAddress` succeeds with a valid EVM signature
- `executeMetaTx` succeeds with the account-id path
- stale nonces, expired deadlines, wrong chain IDs, wrong verifying contracts, and tampered `argsHash` values are rejected

## Signing Flow

1. Build the EIP-712 payload from the Neo execution intent.
2. Sign it in MetaMask or another EVM wallet.
3. Relay the signature to Neo through `executeMetaTx` or `executeMetaTxByAddress`.
4. Let the Abstract Account contract recover the signer and enforce runtime restrictions before calling the target contract.

## Important Hardening Note

A deterministic proxy witness alone is no longer enough to authorize a raw external contract call. The proxy witness is restricted to a single self-call back into the Abstract Account contract, so EVM signatures must ultimately drive AA wrapper entrypoints where the policy checks are enforced.
