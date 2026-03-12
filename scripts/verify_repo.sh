#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

dotnet build contracts/AbstractAccount.csproj -c Release -p:WarningsAsErrors=nullable -nologo
bash contracts/compile_abstract_account.sh
bash contracts/recovery/compile_recovery_contracts.sh
~/.dotnet/tools/nccs verifiers/AllowAllVerifier/AllowAllVerifier.csproj -o verifiers/AllowAllVerifier/bin/sc --base-name AllowAllVerifier --assembly
~/.dotnet/tools/nccs tokens/TestAllowanceToken/TestAllowanceToken.csproj -o tokens/TestAllowanceToken/bin/sc --base-name TestAllowanceToken --assembly
dotnet test neo-abstract-account.sln -c Release --nologo

cd frontend
npm test
npm run build
npm audit --omit=dev

cd ../sdk/js
npm test
