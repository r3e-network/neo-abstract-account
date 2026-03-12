# Recovery Verifier Contracts

## Status: Deployed and validated on Neo N3 testnet ✅

The recovery verifier workstream now has:

- fixed contract sources
- reproducible isolated compilation
- regenerated `.nef` / `.manifest.json` artifacts
- official package-script testnet validators for Argent, Safe, and Loopring
- recorded deployment txids and contract hashes

See `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md` for the exact deployment and validation results.

## Contracts

1. **ArgentRecoveryVerifier** - Argent-style social recovery with guardian management
2. **SafeRecoveryVerifier** - Safe-style modular recovery with configurable timelock
3. **LoopringRecoveryVerifier** - Loopring-style off-chain recovery with guardian hash
4. **MorpheusSocialRecoveryVerifier** - Morpheus NeoDID + privacy-oracle recovery tickets for privacy-preserving social recovery
5. **MorpheusProxySessionVerifier** - Morpheus NeoDID action tickets for private proxy / anonymous action sessions

## Verified Testnet Deployments

- **ArgentRecoveryVerifier** — `0xaa25d77353fbc4cceb372f91ebccf5fb726ed10f`
- **SafeRecoveryVerifier** — `0xfcd8c4601dfa29910d9fec0bf724ce39fc734a74`
- **LoopringRecoveryVerifier** — `0x5bc837e96b83f5080e722883398c8188177694ea`

## Key Changes

- Guardian type changed from `UInt160[]` to `ECPoint[]` where signature verification requires public keys
- `SetupRecovery` is no longer incorrectly marked `[Safe]`
- Recovery project files compile only the corresponding `*.Fixed.cs` source
- Plaintext WIF values were removed from checked-in docs and scripts
- Official SDK package scripts now cover all three verifier variants
- The AA admin path now delegates to the configured custom verifier, so a recovered verifier owner can actually rotate native admin policy after recovery
- A new Morpheus-oriented recovery verifier is included for NeoDID / TEE-signed recovery-ticket flows
- A Morpheus proxy-session verifier is included for short-lived anonymous execution sessions backed by NeoDID action tickets

## Build and Validation Workflow

### 1. Rebuild artifacts

```bash
bash contracts/recovery/compile_recovery_contracts.sh
```

### 2. Run local readiness checks

```bash
node --test sdk/js/tests/recoveryReadiness.unit.test.js
node sdk/js/tests/recovery_verifier_logic_test.js
```

### 3. Run official package-script validators

```bash
cd sdk/js
export TEST_WIF="<your-testnet-wif>"
export RECOVERY_HASH_TESTNET="aa25d77353fbc4cceb372f91ebccf5fb726ed10f"
export SAFE_RECOVERY_HASH_TESTNET="fcd8c4601dfa29910d9fec0bf724ce39fc734a74"
export LOOPRING_RECOVERY_HASH_TESTNET="5bc837e96b83f5080e722883398c8188177694ea"

npm run testnet:validate:recovery
npm run testnet:validate:recovery:safe
npm run testnet:validate:recovery:loopring
```

## Files

- `compiled/` - regenerated contract artifacts
- `*.Fixed.cs` - validated source variants used for compilation
- `compile_recovery_contracts.sh` - isolated artifact regeneration script
- `PRE_DEPLOYMENT_CHECKLIST.md` - deployment gate checklist
- `TESTNET_VALIDATION_2026-03-09.md` - exact deployment txids and validation results
- `MorpheusSocialRecoveryVerifier.Fixed.cs` - Morpheus NeoDID / privacy-oracle recovery verifier source
- `MorpheusProxySessionVerifier.Fixed.cs` - Morpheus NeoDID action-ticket verifier for private action sessions

## Morpheus Integration Notes

`MorpheusSocialRecoveryVerifier` is designed for the Morpheus stack:

- Morpheus Oracle request types:
  - `neodid_bind`
  - `neodid_action_ticket`
  - `neodid_recovery_ticket`
- TEE-signed recovery approvals bound to:
  - network
  - AA contract hash
  - verifier contract hash
  - AA account address
  - logical `accountId` text
  - `newOwner`
  - `recoveryNonce`
  - `expiresAt`
- per-factor privacy via `master_nullifier`
- one-time replay protection via `action_nullifier`

This verifier is included in-source and in the isolated recovery compile pipeline, but unlike Argent / Safe / Loopring it is not yet recorded in the historical `TESTNET_VALIDATION_2026-03-09.md` deployment ledger.

`MorpheusProxySessionVerifier` uses the same Morpheus Oracle request pipeline but consumes `neodid_action_ticket` results with compact callback encoding. It can authorize a temporary executor address through the AA custom-verifier surface, while AA policy gates still control the target contracts and methods that executor may call.

## npm Commands

```bash
npm run test:recovery:logic
npm run testnet:validate:morpheus-verifier
npm run testnet:validate:recovery
npm run testnet:validate:recovery:safe
npm run testnet:validate:recovery:loopring
npm run testnet:validate:recovery:all
```
