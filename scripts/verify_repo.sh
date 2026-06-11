#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

dotnet build contracts/UnifiedSmartWallet.csproj -c Release -p:WarningsAsErrors=nullable -nologo
bash contracts/compile.sh
~/.dotnet/tools/nccs verifiers/AllowAllVerifier/AllowAllVerifier.csproj -o verifiers/AllowAllVerifier/bin/sc --base-name AllowAllVerifier --assembly
dotnet test neo-abstract-account.sln -c Release --nologo

cd frontend
npm test
npm run build
npm run test:e2e:browser
node ../scripts/check_frontend_audit_allowlist.mjs

cd ../sdk/js
npm test
