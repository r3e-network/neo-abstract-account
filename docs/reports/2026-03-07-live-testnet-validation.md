# Live Testnet Validation Notes — 2026-03-07

## Signer / Deployment
- Validation signer: funded disposable Neo N3 testnet account supplied by operator at runtime.
- Fresh deployment tx: `0xaf7d2a28b8d1ee89ac4f9133e5a887495cd8f18b32a5172e53066ce84be37d49`
- Fresh deployed hash: `0x018b4a9bca2034bc6768c3962b455f24484902c4`
- RPC endpoint: `https://testnet1.neo.coz.io:443`

## Live Passes
- `sdk/js/tests/test-evm-meta-tx.js`
- `sdk/js/tests/aa_testnet_integration_check.js`
- `sdk/js/tests/aa_testnet_negative_meta_validate.js`
- `sdk/js/tests/aa_testnet_threshold2_validate.js`
- `sdk/js/tests/aa_testnet_dome_oracle_validate.js`

## Confirmed Live Behavior
- `createAccountWithAddress` and address-path wrapper reads work on the fresh deployment.
- `executeUnifiedByAddress(..., aaHash, getNonce, ...)` HALTs with the owner signer alone.
- Threshold-2 mixed `executeUnifiedByAddress` succeeds live and increments nonce correctly.
- Dome/oracle gating works live: pre-timeout FAULT, post-timeout pre-callback FAULT, post-unlock HALT.

## Confirmed Live Blockers
- Transactions that include the deterministic proxy as an explicit signer/witness still fail during `calculateNetworkFee` with RPC error `Invalid signature`.
- Reproduced against:
  - `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`
  - `sdk/js/tests/aa_testnet_max_transfer_validate.js`
  - `sdk/js/tests/aa_testnet_custom_verifier_validate.js`
  - manual `executeUnifiedByAddress(... getNonce ...)` self-call probes with proxy signer/witness
- Because NEP-17 `transfer` / token `approve` require the source account witness, owner-only wrapper execution reaches the contract but returns `false` for the underlying token operation instead of completing the asset move.

## Infrastructure Noise
- `sdk/js/tests/aa_testnet_concurrency_validate.js` hit repeat TLS resets from the public RPC endpoint (`ECONNRESET` before TLS connection established) on two retries, so concurrency remains unverified on this run.

## Current Working Hypothesis
- Native/admin wrapper execution is healthy on the fresh deployment.
- The remaining blocker is isolated to the deterministic proxy witness path used when the AA account itself must satisfy token-account `CheckWitness` requirements.
- This means functionality and security are only partially validated live: wrapper and meta-tx logic are proven for owner/EVM paths, but full asset-moving proxy-witness execution is still blocked.
