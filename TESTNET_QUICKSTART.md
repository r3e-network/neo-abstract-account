# Testnet Quickstart

## Recovery verifier quick path

```bash
bash contracts/recovery/compile_recovery_contracts.sh
cd sdk/js
export TEST_WIF="<your-testnet-wif>"
export RECOVERY_HASH_TESTNET="aa25d77353fbc4cceb372f91ebccf5fb726ed10f"
export SAFE_RECOVERY_HASH_TESTNET="fcd8c4601dfa29910d9fec0bf724ce39fc734a74"
export LOOPRING_RECOVERY_HASH_TESTNET="5bc837e96b83f5080e722883398c8188177694ea"
npm run testnet:validate:recovery:all
```

## Canonical result record

- `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md`
