#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/contracts"

echo "Cleaning stale build intermediates..."
find "$ROOT_DIR/contracts" -type d -name obj -prune -exec rm -rf {} +

echo "Compiling UnifiedSmartWallet V3 Core..."
~/.dotnet/tools/nccs UnifiedSmartWallet.csproj -o bin/v3

echo "Compiling Verifiers..."
pushd verifiers >/dev/null
~/.dotnet/tools/nccs ./Web3AuthVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./TEEVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./SessionKeyVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./WebAuthnVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./ZKEmailVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./ZkLoginVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./MultiSigVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./SubscriptionVerifier.csproj -o ../bin/v3/verifiers
~/.dotnet/tools/nccs ./NeoNativeVerifier.csproj -o ../bin/v3/verifiers
popd >/dev/null

echo "Compiling Hooks..."
pushd hooks >/dev/null
~/.dotnet/tools/nccs ./DailyLimitHook.csproj -o ../bin/v3/hooks
~/.dotnet/tools/nccs ./NeoDIDCredentialHook.csproj -o ../bin/v3/hooks
~/.dotnet/tools/nccs ./WhitelistHook.csproj -o ../bin/v3/hooks
~/.dotnet/tools/nccs ./MultiHook.csproj -o ../bin/v3/hooks
~/.dotnet/tools/nccs ./TokenRestrictedHook.csproj -o ../bin/v3/hooks
popd >/dev/null

echo "Compiling Mock Targets..."
pushd mocks >/dev/null
~/.dotnet/tools/nccs ./MockTransferTarget.csproj -o ../bin/v3
popd >/dev/null

echo "Compiling Market Contracts..."
pushd market >/dev/null
~/.dotnet/tools/nccs ./AAAddressMarket.csproj -o ../bin/v3
popd >/dev/null

echo "Compilation completed successfully."
