#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/contracts"

echo "Compiling UnifiedSmartWallet V3 Core..."
~/.dotnet/tools/nccs UnifiedSmartWallet.csproj -o bin/v3

echo "Compiling Verifiers..."
~/.dotnet/tools/nccs verifiers/Web3AuthVerifier.csproj -o bin/v3/verifiers
~/.dotnet/tools/nccs verifiers/TEEVerifier.csproj -o bin/v3/verifiers
~/.dotnet/tools/nccs verifiers/SessionKeyVerifier.csproj -o bin/v3/verifiers
~/.dotnet/tools/nccs verifiers/WebAuthnVerifier.csproj -o bin/v3/verifiers
~/.dotnet/tools/nccs verifiers/ZKEmailVerifier.csproj -o bin/v3/verifiers
~/.dotnet/tools/nccs verifiers/MultiSigVerifier.csproj -o bin/v3/verifiers
~/.dotnet/tools/nccs verifiers/SubscriptionVerifier.csproj -o bin/v3/verifiers

echo "Compiling Hooks..."
~/.dotnet/tools/nccs hooks/DailyLimitHook.csproj -o bin/v3/hooks
~/.dotnet/tools/nccs hooks/NeoDIDCredentialHook.csproj -o bin/v3/hooks
~/.dotnet/tools/nccs hooks/WhitelistHook.csproj -o bin/v3/hooks
~/.dotnet/tools/nccs hooks/MultiHook.csproj -o bin/v3/hooks
~/.dotnet/tools/nccs hooks/TokenRestrictedHook.csproj -o bin/v3/hooks

echo "Compilation completed successfully."