# Quick Reference

## Core local verification

```bash
./scripts/verify_repo.sh
```

## Frontend only

```bash
cd frontend && npm test
cd frontend && npm run build
```

## SDK only

```bash
cd sdk/js && npm test
```

## Recovery verifier rebuild

```bash
bash contracts/recovery/compile_recovery_contracts.sh
```

## Recovery verifier testnet validation

```bash
cd sdk/js
npm run testnet:validate:recovery
npm run testnet:validate:recovery:safe
npm run testnet:validate:recovery:loopring
```

## Canonical docs

- `docs/HOW_IT_WORKS.md`
- `docs/WORKFLOWS.md`
- `docs/DATA_FLOW.md`
- `docs/architecture.md`
