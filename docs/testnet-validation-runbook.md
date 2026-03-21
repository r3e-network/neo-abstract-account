# Testnet Validation Runbook

This runbook executes the current V3 SDK testnet validation scripts in the safest recommended order, stopping on the first failure.

## Required environment

- `TEST_WIF` set to a dedicated funded Neo testnet account

## Optional environment

- `TESTNET_RPC_URL` or `NEO_RPC_URL` to override the default Neo N3 testnet RPC
- `MORPHEUS_RUNTIME_TOKEN` preferred, or `PHALA_API_TOKEN` / `PHALA_SHARED_SECRET`, to enable the live Morpheus paymaster relay validator
- `MORPHEUS_TESTNET_RUNTIME_URL` or `MORPHEUS_RUNTIME_URL` to override the default Morpheus testnet runtime URL
- `MORPHEUS_PAYMASTER_APP_ID` if the paymaster validator should target a non-default CVM app
- `PAYMASTER_ACCOUNT_ID` if you want to replay against a fixed existing account instead of using a fresh one
- `SKIP_PAYMASTER_ALLOWLIST_UPDATE=1` if you already manually allowlisted the account on the Morpheus worker
- `PHALA_SSH_RETRIES` to tune CVM bridge retries for the paymaster validator

## Dry run

From `sdk/js`, print the planned commands without broadcasting anything:

```bash
./run_testnet_validation_suite.sh --dry-run
```

## Live execution

From `sdk/js`, run the full ordered suite:

```bash
./run_testnet_validation_suite.sh
```

The suite writes:

- machine-readable JSON reports to `sdk/docs/reports/`
- a human-readable markdown summary to `docs/reports/2026-03-14-v3-testnet-validation-suite.md`

## Ordered scripts

1. `tests/v3_testnet_smoke.js`
2. `tests/v3_testnet_plugin_matrix.js`
3. `tests/v3_testnet_paymaster_policy.mjs` when `MORPHEUS_RUNTIME_TOKEN` or `PHALA_API_TOKEN` is present
4. `tests/v3_testnet_paymaster_relay.mjs` when `MORPHEUS_RUNTIME_TOKEN` or `PHALA_API_TOKEN` is present

## Individual commands

```bash
npm run testnet:validate:smoke
npm run testnet:validate:plugin-matrix
npm run testnet:validate:paymaster-policy
npm run testnet:validate:paymaster
npm run testnet:validate:report
```

## Safety notes

- The runner stops on the first failure.
- Several scripts deploy contracts or broadcast real testnet transactions and mutate live state.
- The plugin matrix deploys fresh verifier and hook artifacts and records a JSON report under `sdk/docs/reports/`.
- The paymaster policy validator exercises explicit deny paths such as wrong `dapp_id`, wrong `account_id`, wrong `target_contract`, wrong `method`, missing `operation_hash`, and over-limit gas.
- The paymaster validator can reuse a fixed allowlisted account or register a fresh account and update the worker allowlist live.
- Prefer a disposable test key and a fresh or resettable testnet environment before running the full suite.
- Re-running the suite against the same live state can change outcomes because nonces, verifier keys, allowlists, and balances move forward.
