# Recovery Verifier Pre-Deployment Checklist

## Goal

Use this checklist before deploying any recovery verifier to Neo N3 testnet. A deployment should not proceed until every local verification item below is complete.

## 1. Secrets and Environment

- [ ] `TEST_WIF` is set in the current shell; no plaintext WIF is stored in repo files
- [ ] The deployer account address is derived locally from `TEST_WIF` and verified before use
- [ ] Testnet GAS balance is checked immediately before deployment

## 2. Source Integrity

- [ ] `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs` is the intended Argent source
- [ ] `contracts/recovery/SafeRecoveryVerifier.Fixed.cs` is the intended Safe source
- [ ] `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs` is the intended Loopring source
- [ ] The matching `.csproj` files compile only the corresponding `*.Fixed.cs` source

## 3. Local Build Verification

Run these commands from the repo root:

```bash
dotnet build contracts/recovery/ArgentRecoveryVerifier.csproj -c Release -nologo
dotnet build contracts/recovery/SafeRecoveryVerifier.csproj -c Release -nologo
dotnet build contracts/recovery/LoopringRecoveryVerifier.csproj -c Release -nologo
bash contracts/recovery/compile_recovery_contracts.sh
```

- [ ] All three builds pass
- [ ] All three `.nef` files are regenerated in `contracts/recovery/compiled/`
- [ ] All three `.manifest.json` files are regenerated in `contracts/recovery/compiled/`

## 4. Test Verification

Run these commands:

```bash
cd sdk/js
node --test tests/recoveryReadiness.unit.test.js
node tests/recovery_verifier_logic_test.js
```

- [ ] Recovery readiness regression test passes
- [ ] Recovery logic script passes
- [ ] Any remaining integration/testnet script assumptions are reviewed manually

## 5. Deployment Execution

- [ ] `neo-go` is installed and the target RPC is reachable
- [ ] Contract hash will be recorded immediately after each deployment
- [ ] Only one contract is deployed at a time and verified before continuing

Suggested deploy pattern:

```bash
export TEST_WIF="<your-testnet-wif>"
neo-go wallet init -w deploy.json
neo-go wallet import -w deploy.json --wif "$TEST_WIF" --name deployer
neo-go contract deploy -i contracts/recovery/compiled/ArgentRecoveryVerifier.nef -m contracts/recovery/compiled/ArgentRecoveryVerifier.manifest.json -r https://testnet1.neo.coz.io:443 -w deploy.json
```

## 6. Post-Deployment Validation

- [ ] Set `RECOVERY_HASH_TESTNET` to the deployed contract hash
- [ ] Run `cd sdk/js && npm run testnet:validate:recovery`
- [ ] Record txid, contract hash, date, and any observed limitations

## Status

- [ ] Ready to deploy
