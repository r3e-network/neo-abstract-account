#!/bin/bash
set -euo pipefail

echo "=== Recovery verifier testnet preparation ==="

command -v dotnet >/dev/null 2>&1 || { echo "Missing .NET SDK"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Missing Node.js"; exit 1; }
command -v ~/.dotnet/tools/nccs >/dev/null 2>&1 || { echo "Missing nccs tool"; exit 1; }

: "${TEST_WIF:?Set TEST_WIF before running this script}"

echo "Step 1: Build fixed recovery projects..."
dotnet build contracts/recovery/ArgentRecoveryVerifier.csproj -c Release -nologo
dotnet build contracts/recovery/SafeRecoveryVerifier.csproj -c Release -nologo
dotnet build contracts/recovery/LoopringRecoveryVerifier.csproj -c Release -nologo

echo "Step 2: Regenerate compiled recovery artifacts..."
~/.dotnet/tools/nccs contracts/recovery/ArgentRecoveryVerifier.csproj -o contracts/recovery/compiled --base-name ArgentRecoveryVerifier --assembly
~/.dotnet/tools/nccs contracts/recovery/SafeRecoveryVerifier.csproj -o contracts/recovery/compiled --base-name SafeRecoveryVerifier --assembly
~/.dotnet/tools/nccs contracts/recovery/LoopringRecoveryVerifier.csproj -o contracts/recovery/compiled --base-name LoopringRecoveryVerifier --assembly

echo "Step 3: Run local readiness checks..."
cd sdk/js
node --test tests/recoveryReadiness.unit.test.js
node tests/recovery_verifier_logic_test.js

echo
echo "Local recovery verification passed."
echo "Next manual steps:"
echo "  1. Export RECOVERY_HASH_TESTNET after deployment"
echo "  2. Run: npm run testnet:validate:recovery"
