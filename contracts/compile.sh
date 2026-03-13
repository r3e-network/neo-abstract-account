#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/contracts"

echo "Compiling UnifiedSmartWallet V3 Core..."
~/.dotnet/tools/nccs UnifiedSmartWallet.csproj -o bin/v3

echo "Compilation completed successfully."
