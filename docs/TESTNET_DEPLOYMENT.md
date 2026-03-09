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
