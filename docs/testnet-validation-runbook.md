# Testnet Validation Runbook

This runbook executes the affected SDK testnet validation scripts in the safest recommended order, stopping on the first failure.

## Required environment

- `TEST_WIF` set to a dedicated funded Neo testnet account
- `AA_HASH_TESTNET` or `VITE_AA_HASH_TESTNET` set to the target AA contract hash
- `EXPECT_PROXY_SPEND_BLOCKED=1` unless you intentionally expect the direct proxy spend check to succeed
- `MORPHEUS_ORACLE_HASH_TESTNET` recommended for the Morpheus verifier validator
- `MORPHEUS_VERIFIER_PUBKEY_TESTNET` recommended for the Morpheus verifier validator

## Dry run

From `sdk/js`, print the planned commands without broadcasting anything:

```bash
./run_testnet_validation_suite.sh --dry-run
```

## Readiness check only

```bash
node tests/testnet_readiness.js
```

## Live execution

From `sdk/js`, run the full ordered suite:

```bash
./run_testnet_validation_suite.sh
```

## Ordered scripts

1. `tests/test-evm-meta-tx.js`
2. `tests/aa_testnet_integration_check.js`
3. `tests/aa_testnet_negative_meta_validate.js`
4. `tests/aa_testnet_max_transfer_validate.js`
5. `tests/aa_testnet_approve_allowance_validate.js`
6. `tests/aa_testnet_direct_proxy_spend_validate.js`
7. `tests/aa_testnet_threshold2_validate.js`
8. `tests/aa_testnet_custom_verifier_validate.js`
9. `tests/aa_testnet_morpheus_verifier_validate.js`
10. `tests/aa_testnet_dome_oracle_validate.js`
11. `tests/aa_testnet_concurrency_validate.js`
12. `tests/aa_testnet_full_validate.js`

## Safety notes

- The runner stops on the first failure.
- Several scripts broadcast real testnet transactions and mutate contract state.
- The suite now performs a funding/readiness check first unless `SKIP_TESTNET_READINESS_CHECK=1`.
- Prefer a disposable test key and a fresh or resettable testnet AA deployment before running the full suite.
- Re-running the suite against the same live state can change outcomes because nonces, whitelist state, and balances move forward.
