# Security Audit Note — 2026-03-07

## Scope
- Smart contract authorization, signature validation, nonce handling, reentrancy/callback safety, asset-movement policy enforcement, update path safety, and live testnet validation scripts.
- Deployment reviewed: `0x711c1899a3b7fa0e055ae0d17c9acfcd1bef6423`.

## Fixed During Audit
- Blocked external `requestDomeActivation*` mutation during active execution.
- Hardened `update` so it requires both a deployer witness and a direct AA self-call path, and now rejects external mutation during active execution.
- Added a global execution lock so a malicious external target cannot reenter the wallet and act on a different account in the same transaction.
- Switched nominal read methods to `CallFlags.ReadOnly` so malicious targets cannot hide writes behind `balanceOf`, `allowance`, `symbol`, `decimals`, or `totalSupply`.
- Required explicit whitelist entries for external `transfer` / `approve` calls, so asset-moving calls to third-party tokens are always an explicit trust decision.
- Required manager-threshold witness satisfaction when managers are configured during account bootstrap.
- Restricted account binding so `createAccountWithAddress` and `bindAccountAddress` only accept the deterministic `verify(accountId)` proxy address.

## Live Validation Evidence
- Threshold mixed-signature path: `sdk/js/tests/aa_testnet_threshold2_validate.js`
- Custom verifier path: `sdk/js/tests/aa_testnet_custom_verifier_validate.js`
- Dome/oracle path: `sdk/js/tests/aa_testnet_dome_oracle_validate.js`
- Bounded concurrency/load path: `sdk/js/tests/aa_testnet_concurrency_validate.js`
- Approve/allowance path: `sdk/js/tests/aa_testnet_approve_allowance_validate.js`
- Direct proxy spend negative path: `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`
- Max-transfer live enforcement: `sdk/js/tests/aa_testnet_max_transfer_validate.js`

## Residual Risks / Trust Assumptions
- Custom verifier safety is delegated to the verifier contract once bound. A permissive or compromised verifier can authorize wallet actions by design.
- Whitelisting a malicious token is still an explicit trust decision. The wallet now requires whitelisting for external `transfer` / `approve`, but it cannot force a third-party token to behave honestly once that token is trusted.

## March 8 Validation Follow-up
- On **March 8, 2026**, a fresh validation deployment **`0x2dd3b3776ddccdd56c4969342a3f9b0c5516933c`** (tx **`0xe6b65fb40f5f291ba8cb383428b2dd0bcde3ff0c1a0a62de3216fd748a88f364`**) was used to validate the current branch's raw-accountId and signer-script-hash client/runtime alignment on testnet.
- That diagnostic deployment passed live runs for integration, negative meta, threshold-2, dome/oracle, custom verifier, max-transfer, approve/allowance, the broad integration sweep, and bounded concurrency.
- The direct proxy-signed external spend path remained blocked on the diagnostic deployment, which is consistent with the hardened security model rather than a newly observed regression.

## Verification Commands
- `dotnet build contracts/AbstractAccount.csproj -c Release -p:WarningsAsErrors=nullable -nologo`
- `dotnet test neo-abstract-account.sln -c Release --nologo`
- `cd sdk/js && npm test`
- `cd frontend && npm test && npm run build && npm audit --omit=dev`
