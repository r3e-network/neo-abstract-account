# Testnet Deployment Notes

## Recovery verifier deployment status

The current validated recovery verifier deployments are recorded in:

- `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md`

## Recommended deploy flow

1. Rebuild artifacts with `bash contracts/recovery/compile_recovery_contracts.sh`
2. Export `TEST_WIF`
3. Deploy with `neo-go contract deploy --await`
4. Record contract hash and txid immediately
5. Run the official package-script validators in `sdk/js`

## Related docs

- `contracts/recovery/README.md`
- `contracts/recovery/DEPLOYMENT.md`
- `contracts/recovery/PRE_DEPLOYMENT_CHECKLIST.md`
- `docs/MORPHEUS_PRIVATE_ACTIONS.md`

## Morpheus verifier validation

For the unified Morpheus verifier path, use:

```bash
cd sdk/js
export TEST_WIF="<your-testnet-wif>"
export AA_HASH_TESTNET="<your-aa-testnet-hash>"
export MORPHEUS_ORACLE_HASH_TESTNET="<your-morpheus-oracle-hash>"
export MORPHEUS_VERIFIER_PUBKEY_TESTNET="<your-morpheus-verifier-pubkey>"
npm run testnet:validate:morpheus-verifier
```
