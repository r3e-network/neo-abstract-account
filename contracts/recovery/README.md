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

- **ArgentRecoveryVerifier** — `0xaa25d77353fbc4cceb372f91ebccf5fb726ed10f`
- **SafeRecoveryVerifier** — `0xfcd8c4601dfa29910d9fec0bf724ce39fc734a74`
- **LoopringRecoveryVerifier** — `0x5bc837e96b83f5080e722883398c8188177694ea`

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

## npm Commands

```bash
npm run test:recovery:logic
npm run testnet:validate:recovery
npm run testnet:validate:recovery:safe
npm run testnet:validate:recovery:loopring
npm run testnet:validate:recovery:all
```
