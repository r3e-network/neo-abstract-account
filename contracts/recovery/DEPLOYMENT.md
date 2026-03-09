# Recovery Verifier Deployment Guide

## Compiled Contracts

All three recovery verifiers have been compiled successfully:

- `compiled/ArgentRecoveryVerifier.nef` (2.8KB)
- `compiled/ArgentRecoveryVerifier.manifest.json` (3.4KB)
- `compiled/SafeRecoveryVerifier.nef` (2.3KB)
- `compiled/SafeRecoveryVerifier.manifest.json` (2.7KB)
- `compiled/LoopringRecoveryVerifier.nef` (2.0KB)
- `compiled/LoopringRecoveryVerifier.manifest.json` (2.8KB)

## Deployment to Testnet

### Prerequisites

- neo-go CLI installed
- Testnet GAS for deployment fees (~10-15 GAS per contract)
- Wallet with WIF: `<your-testnet-wif>`

### Method 1: Using neo-go (Recommended)

```bash
# 1. Create wallet
neo-go wallet init -w deploy.json

# 2. Import WIF (interactive - will prompt for account name and password)
neo-go wallet import -w deploy.json --wif "$TEST_WIF"

# 3. Deploy ArgentRecoveryVerifier
neo-go contract deploy \
  -i contracts/recovery/compiled/ArgentRecoveryVerifier.nef \
  -m contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json \
  -r https://testnet1.neo.coz.io:443 \
  -w deploy.json

# 4. Deploy SafeRecoveryVerifier
neo-go contract deploy \
  -i contracts/recovery/compiled/SafeRecoveryVerifier.nef \
  -m contracts/recovery/compiled/SafeRecoveryVerifier.manifest.json \
  -r https://testnet1.neo.coz.io:443 \
  -w deploy.json

# 5. Deploy LoopringRecoveryVerifier
neo-go contract deploy \
  -i contracts/recovery/compiled/LoopringRecoveryVerifier.nef \
  -m contracts/recovery/compiled/LoopringRecoveryVerifier.manifest.json \
  -r https://testnet1.neo.coz.io:443 \
  -w deploy.json
```

### Method 2: Using Neo-CLI

```bash
# Start neo-cli
neo-cli

# Open wallet
open wallet /path/to/wallet.json

# Deploy contracts
deploy contracts/recovery/compiled/ArgentRecoveryVerifier.nef contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json
deploy contracts/recovery/compiled/SafeRecoveryVerifier.nef contracts/recovery/compiled/SafeRecoveryVerifier.manifest.json
deploy contracts/recovery/compiled/LoopringRecoveryVerifier.nef contracts/recovery/compiled/LoopringRecoveryVerifier.manifest.json
```

## Calculate Contract Hash

After deployment, calculate the contract hash:

```bash
# Using neo-go
neo-go contract calc-hash \
  -i contracts/recovery/compiled/ArgentRecoveryVerifier.nef \
  -m contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json \
  --sender NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu
```

Use the `neo-go` result directly or `neo-go contract calc-hash` from the same sender address.

## Testing

After deployment, set the contract hash and run tests:

```bash
cd sdk/js
export TEST_WIF="<your-testnet-wif>"
export RECOVERY_HASH_TESTNET="<deployed_contract_hash>"

# Run integration tests
npm run testnet:validate:recovery

# Run logic tests (no deployment needed)
npm run test:recovery:logic
```

## Deployed Contract Hashes

- **ArgentRecoveryVerifier**: `0x260b204b109506140f6e20ef99d02c142d070f72`
- **SafeRecoveryVerifier**: `0x06a7c50c2dd81f988e2e31b7fd721501008fbfa8`
- **LoopringRecoveryVerifier**: `0x3ed17f73f19a89bc36e2dd82a19fc920aa2e54c7`

## Deployment Costs

Estimated deployment costs on testnet:
- ArgentRecoveryVerifier: ~10-12 GAS
- SafeRecoveryVerifier: ~10-12 GAS
- LoopringRecoveryVerifier: ~8-10 GAS

Total: ~30-35 GAS for all three contracts
