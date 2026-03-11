# Manual Deployment Guide

## Quick Start

Regenerate artifacts with `bash contracts/recovery/compile_recovery_contracts.sh` before deployment so each verifier is compiled in isolation from the legacy source files.


Use the verified build flow below before any deployment:

### Step 1: Deploy Using neo-go (Interactive)

```bash
cd /home/neo/git/neo-abstract-account

# Create wallet (one-time)
neo-go wallet init -w deploy.json

# Import WIF (will prompt for account name and password)
neo-go wallet import -w deploy.json \
  --wif "$TEST_WIF" \
  --name deployer

# Deploy ArgentRecoveryVerifier
neo-go contract deploy \
  -i contracts/recovery/compiled/ArgentRecoveryVerifier.nef \
  -m contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json \
  -r https://testnet1.neo.coz.io:443 \
  -w deploy.json
```

### Step 2: Get Contract Hash

After deployment, record the contract hash printed by `neo-go contract deploy --await`, or calculate it with `neo-go contract calc-hash`:

```bash
neo-go contract calc-hash \
  -i contracts/recovery/compiled/ArgentRecoveryVerifier.nef \
  -m contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json \
  -s NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu
```

### Step 3: Run Tests

```bash
export TEST_WIF="<your-testnet-wif>"
export RECOVERY_HASH_TESTNET="aa25d77353fbc4cceb372f91ebccf5fb726ed10f"
npm run testnet:validate:recovery
```

## Alternative: Deploy All Three Contracts

```bash
# Deploy Safe
neo-go contract deploy \
  -i contracts/recovery/compiled/SafeRecoveryVerifier.nef \
  -m contracts/recovery/compiled/SafeRecoveryVerifier.manifest.json \
  -r https://testnet1.neo.coz.io:443 \
  -w deploy.json

# Deploy Loopring
neo-go contract deploy \
  -i contracts/recovery/compiled/LoopringRecoveryVerifier.nef \
  -m contracts/recovery/compiled/LoopringRecoveryVerifier.manifest.json \
  -r https://testnet1.neo.coz.io:443 \
  -w deploy.json
```

## Files Ready for Deployment

- `contracts/recovery/compiled/ArgentRecoveryVerifier.nef` (2.8KB)
- `contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json` (3.4KB)
- `contracts/recovery/compiled/SafeRecoveryVerifier.nef` (2.3KB)
- `contracts/recovery/compiled/SafeRecoveryVerifier.manifest.json` (2.7KB)
- `contracts/recovery/compiled/LoopringRecoveryVerifier.nef` (2.0KB)
- `contracts/recovery/compiled/LoopringRecoveryVerifier.manifest.json` (2.8KB)

## Deployment Account

- Address: `NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu`
- WIF: provided at runtime via `TEST_WIF`
- GAS Balance: verify live before deployment

## Estimated Costs

- ArgentRecoveryVerifier: ~10-12 GAS
- SafeRecoveryVerifier: ~10-12 GAS
- LoopringRecoveryVerifier: ~8-10 GAS
- Total: ~30-35 GAS
