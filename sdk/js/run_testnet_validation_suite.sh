#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

readonly SCRIPTS=(
  "tests/test-evm-meta-tx.js"
  "tests/aa_testnet_integration_check.js"
  "tests/aa_testnet_negative_meta_validate.js"
  "tests/aa_testnet_max_transfer_validate.js"
  "tests/aa_testnet_approve_allowance_validate.js"
  "tests/aa_testnet_direct_proxy_spend_validate.js"
  "tests/aa_testnet_threshold2_validate.js"
  "tests/aa_testnet_custom_verifier_validate.js"
  "tests/aa_testnet_morpheus_verifier_validate.js"
  "tests/aa_testnet_dome_oracle_validate.js"
  "tests/aa_testnet_concurrency_validate.js"
  "tests/aa_testnet_full_validate.js"
)

usage() {
  cat <<'EOF'
Usage: ./run_testnet_validation_suite.sh [--dry-run]

Runs the affected SDK testnet validation scripts in the recommended safety order.

Options:
  --dry-run  Print the commands and required env without executing them
  --help     Show this help text

Required env for live runs:
  TEST_WIF
  AA_HASH_TESTNET or VITE_AA_HASH_TESTNET

Optional env:
  EXPECT_PROXY_SPEND_BLOCKED (defaults to 1)
  MORPHEUS_ORACLE_HASH_TESTNET
  MORPHEUS_VERIFIER_PUBKEY_TESTNET
EOF
}

dry_run=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      dry_run=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$dry_run" -eq 1 ]]; then
  echo "Dry run only. Required env for live execution:"
  echo "  TEST_WIF"
  echo "  AA_HASH_TESTNET or VITE_AA_HASH_TESTNET"
  echo "  EXPECT_PROXY_SPEND_BLOCKED defaults to 1"
  echo "  MORPHEUS_ORACLE_HASH_TESTNET and MORPHEUS_VERIFIER_PUBKEY_TESTNET are recommended for the Morpheus verifier validator"
  echo
  echo "node tests/testnet_readiness.js"
  for script in "${SCRIPTS[@]}"; do
    echo "node $script"
  done
  exit 0
fi

missing_env=()

if [[ -z "${TEST_WIF:-}" ]]; then
  missing_env+=("TEST_WIF")
fi

if [[ -z "${AA_HASH_TESTNET:-}" && -z "${VITE_AA_HASH_TESTNET:-}" ]]; then
  missing_env+=("AA_HASH_TESTNET or VITE_AA_HASH_TESTNET")
fi

if [[ "${#missing_env[@]}" -gt 0 ]]; then
  printf 'Missing required env: %s\n' "${missing_env[*]}" >&2
  exit 1
fi

: "${EXPECT_PROXY_SPEND_BLOCKED:=1}"
export EXPECT_PROXY_SPEND_BLOCKED

echo "Running testnet validation suite from $ROOT_DIR"
echo "EXPECT_PROXY_SPEND_BLOCKED=$EXPECT_PROXY_SPEND_BLOCKED"

if [[ "${SKIP_TESTNET_READINESS_CHECK:-0}" != "1" ]]; then
  echo
  echo "==> node tests/testnet_readiness.js"
  node tests/testnet_readiness.js
fi

for script in "${SCRIPTS[@]}"; do
  echo
  echo "==> node $script"
  node "$script"
done
