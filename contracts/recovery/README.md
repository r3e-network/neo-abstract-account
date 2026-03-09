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

## Verified Testnet Deployments

- **ArgentRecoveryVerifier** — `0x260b204b109506140f6e20ef99d02c142d070f72`
- **SafeRecoveryVerifier** — `0x06a7c50c2dd81f988e2e31b7fd721501008fbfa8`
- **LoopringRecoveryVerifier** — `0x3ed17f73f19a89bc36e2dd82a19fc920aa2e54c7`

## Key Changes

- Guardian type changed from `UInt160[]` to `ECPoint[]` where signature verification requires public keys
- `SetupRecovery` is no longer incorrectly marked `[Safe]`
- Recovery project files compile only the corresponding `*.Fixed.cs` source
- Plaintext WIF values were removed from checked-in docs and scripts
- Official SDK package scripts now cover all three verifier variants

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
export RECOVERY_HASH_TESTNET="260b204b109506140f6e20ef99d02c142d070f72"
export SAFE_RECOVERY_HASH_TESTNET="06a7c50c2dd81f988e2e31b7fd721501008fbfa8"
export LOOPRING_RECOVERY_HASH_TESTNET="3ed17f73f19a89bc36e2dd82a19fc920aa2e54c7"

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

## npm Commands

```bash
npm run test:recovery:logic
npm run testnet:validate:recovery
npm run testnet:validate:recovery:safe
npm run testnet:validate:recovery:loopring
npm run testnet:validate:recovery:all
```
