# Morpheus Private Actions

This document describes how Neo Abstract Account can use Morpheus NeoDID action tickets for privacy-preserving delegated execution.

## Goal

Allow a temporary proxy account to execute an AA action without revealing the user's underlying Web2 identity or master wallet on-chain.

## Model

The recommended on-chain component is the unified Morpheus verifier:

- `contracts/recovery/MorpheusSocialRecoveryVerifier.Fixed.cs`

The dedicated `MorpheusProxySessionVerifier` remains available as a narrower verifier variant, but the unified Morpheus verifier is the preferred production path when the same AA should support both recovery and private action sessions.

## Flow

1. The account owner deploys or configures `MorpheusProxySessionVerifier`.
2. The verifier is bound into the AA wallet with `setVerifierContract`.
3. A temporary executor wallet requests a Morpheus action ticket.
4. Morpheus Oracle routes the request to NeoDID with `neodid_action_ticket`.
5. The verifier receives the callback in compact binary form.
6. The verifier validates the Morpheus signature and stores an active session:
   - executor
   - actionId
   - actionNullifier
   - expiry
7. Until expiry, the temporary executor can authorize AA actions through `verify` / `verifyMetaTx`.
8. AA still enforces whitelist, blacklist, method policy, and transfer limits.

## Why This Preserves Privacy

The proxy account visible on-chain is only the temporary executor.
The underlying social / exchange identity remains hidden behind:

- encrypted Web3Auth `id_token` or other confidential provider evidence inside Morpheus payloads
- TEE verification
- `action_nullifier`
- Morpheus signature evidence

No raw Twitter handle, email address, exchange account id, or OAuth token needs to appear on-chain.

Recommended identity source:

- use Web3Auth as the DID root
- link Google / Apple / email / SMS / other login methods in Web3Auth
- pass the live Web3Auth `id_token` into NeoDID as encrypted input so the TEE can derive the stable provider root
- treat any caller-supplied `provider_uid` only as an optional consistency hint
- request NeoDID action tickets with `provider = "web3auth"`
- use `did:morpheus:neo_n3:service:neodid` as the public metadata anchor for resolver-based integrations

## Security Boundaries

The Morpheus private action path is intentionally narrow:

- it does not bypass AA policy controls
- it does not permanently replace the owner
- it treats each action ticket as replay-protected through `action_nullifier`
- it requires explicit expiry for each delegated session

## Recommended Use Cases

- anonymous governance participation through a disposable wallet
- privacy-preserving claims or claims collection
- temporary operational delegation without exposing the main owner address
- compartmentalized execution from hot ephemeral wallets

## Recommended Operational Pattern

- keep AA whitelist mode enabled
- keep only the intended target contracts whitelisted
- keep token movement targets capped with max-transfer rules
- use short session expiries
- revoke the session after use

## Relationship To Recovery

This is not account recovery.

- `MorpheusSocialRecoveryVerifier` is for ownership recovery
- `MorpheusProxySessionVerifier` is for temporary private execution rights

Both use the same Morpheus Oracle + NeoDID stack, but they solve different authorization problems.
