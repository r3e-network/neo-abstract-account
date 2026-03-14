#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

readonly SCRIPTS=(
  "tests/v3_testnet_smoke.js"
  "tests/v3_testnet_plugin_matrix.js"
)
readonly PAYMASTER_SCRIPT="tests/v3_testnet_paymaster_relay.mjs"

usage() {
  cat <<'EOF'
Usage: ./run_testnet_validation_suite.sh [--dry-run]

Runs the current V3 SDK testnet validation scripts in the recommended safety order.

Options:
  --dry-run  Print the commands and required env without executing them
  --help     Show this help text

Required env for live runs:
  TEST_WIF
  
Optional env:
  TESTNET_RPC_URL or NEO_RPC_URL
  PHALA_API_TOKEN (required only for the paymaster relay validator)
  MORPHEUS_PAYMASTER_APP_ID
  PAYMASTER_ACCOUNT_ID
  SKIP_PAYMASTER_ALLOWLIST_UPDATE=1
  PHALA_SSH_RETRIES
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
  echo
  echo "Optional env:"
  echo "  TESTNET_RPC_URL or NEO_RPC_URL"
  echo "  PHALA_API_TOKEN (required only for the paymaster relay validator)"
  echo "  MORPHEUS_PAYMASTER_APP_ID"
  echo "  PAYMASTER_ACCOUNT_ID"
  echo "  SKIP_PAYMASTER_ALLOWLIST_UPDATE=1"
  echo "  PHALA_SSH_RETRIES"
  echo
  for script in "${SCRIPTS[@]}"; do
    echo "node $script"
  done
  echo "if [ -n \"\${PHALA_API_TOKEN:-}\" ]; then node $PAYMASTER_SCRIPT; else echo \"skip $PAYMASTER_SCRIPT (missing PHALA_API_TOKEN)\"; fi"
  exit 0
fi

missing_env=()

if [[ -z "${TEST_WIF:-}" ]]; then
  missing_env+=("TEST_WIF")
fi

if [[ "${#missing_env[@]}" -gt 0 ]]; then
  printf 'Missing required env: %s\n' "${missing_env[*]}" >&2
  exit 1
fi

echo "Running testnet validation suite from $ROOT_DIR"

for script in "${SCRIPTS[@]}"; do
  echo
  echo "==> node $script"
  node "$script"
done

if [[ -n "${PHALA_API_TOKEN:-}" ]]; then
  echo
  echo "==> node $PAYMASTER_SCRIPT"
  node "$PAYMASTER_SCRIPT"
else
  echo
  echo "==> skipping $PAYMASTER_SCRIPT (PHALA_API_TOKEN is not set)"
fi
