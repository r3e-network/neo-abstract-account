#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/contracts/bin/sc"
TMP_DIR="$(mktemp -d /tmp/aa-main-build-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp "$ROOT_DIR/contracts/AbstractAccount.cs" "$TMP_DIR/AbstractAccount.cs"
cp "$ROOT_DIR/contracts/AbstractAccount.AccountLifecycle.cs" "$TMP_DIR/AbstractAccount.AccountLifecycle.cs"
cp "$ROOT_DIR/contracts/AbstractAccount.Admin.cs" "$TMP_DIR/AbstractAccount.Admin.cs"
cp "$ROOT_DIR/contracts/AbstractAccount.ExecutionAndPermissions.cs" "$TMP_DIR/AbstractAccount.ExecutionAndPermissions.cs"
cp "$ROOT_DIR/contracts/AbstractAccount.MetaTx.cs" "$TMP_DIR/AbstractAccount.MetaTx.cs"
cp "$ROOT_DIR/contracts/AbstractAccount.Oracle.cs" "$TMP_DIR/AbstractAccount.Oracle.cs"
cp "$ROOT_DIR/contracts/AbstractAccount.StorageAndContext.cs" "$TMP_DIR/AbstractAccount.StorageAndContext.cs"
cp "$ROOT_DIR/contracts/AbstractAccount.Upgrade.cs" "$TMP_DIR/AbstractAccount.Upgrade.cs"
cp "$ROOT_DIR/contracts/InternalsVisibleTo.cs" "$TMP_DIR/InternalsVisibleTo.cs"
cp "$ROOT_DIR/contracts/TestECDSA.cs" "$TMP_DIR/TestECDSA.cs"

cat > "$TMP_DIR/AbstractAccount.csproj" <<'CSProj'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Neo.SmartContract.Framework" Version="3.9.1" />
  </ItemGroup>
</Project>
CSProj

mkdir -p "$OUT_DIR"
~/.dotnet/tools/nccs "$TMP_DIR/AbstractAccount.csproj" -o "$OUT_DIR" --base-name UnifiedSmartWalletV2 --assembly
