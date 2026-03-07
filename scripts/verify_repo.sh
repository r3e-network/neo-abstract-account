#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

dotnet build contracts/AbstractAccount.csproj -c Release -p:WarningsAsErrors=nullable -nologo
dotnet test neo-abstract-account.sln -c Release --nologo

cd frontend
npm test
npm run build
npm audit --omit=dev

cd ../sdk/js
npm test
