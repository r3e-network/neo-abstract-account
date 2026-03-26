#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

run_contracts=1
run_frontend=1
run_sdk=1

usage() {
  cat <<'EOF'
Usage: scripts/run_local_validation_gates.sh [--contracts-only|--frontend-only|--sdk-only]

Runs local validation gates for neo-abstract-account:
- contracts solution tests
- frontend test + build
- sdk unit tests
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --contracts-only)
      run_contracts=1
      run_frontend=0
      run_sdk=0
      shift
      ;;
    --frontend-only)
      run_contracts=0
      run_frontend=1
      run_sdk=0
      shift
      ;;
    --sdk-only)
      run_contracts=0
      run_frontend=0
      run_sdk=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cd "$REPO_ROOT"

if [[ $run_contracts -eq 1 ]]; then
  echo ""
  echo "=== Contract Local Gates ==="
  dotnet test neo-abstract-account.sln -c Release --nologo
fi

if [[ $run_frontend -eq 1 ]]; then
  echo ""
  echo "=== Frontend Local Gates ==="
  npm --prefix frontend test
  npm --prefix frontend run build
fi

if [[ $run_sdk -eq 1 ]]; then
  echo ""
  echo "=== SDK Local Gates ==="
  npm --prefix sdk/js test
fi

echo ""
echo "Local validation gates completed successfully."
