# Testnet Quickstart

## Recovery verifier quick path

```bash
bash contracts/recovery/compile_recovery_contracts.sh
cd sdk/js
export TEST_WIF="<your-testnet-wif>"
export RECOVERY_HASH_TESTNET="260b204b109506140f6e20ef99d02c142d070f72"
export SAFE_RECOVERY_HASH_TESTNET="06a7c50c2dd81f988e2e31b7fd721501008fbfa8"
export LOOPRING_RECOVERY_HASH_TESTNET="3ed17f73f19a89bc36e2dd82a19fc920aa2e54c7"
npm run testnet:validate:recovery:all
```

## Canonical result record

- `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md`
