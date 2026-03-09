#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/contracts/recovery/compiled"
TMP_PARENT="$(mktemp -d /tmp/recovery-build-XXXXXX)"
trap 'rm -rf "$TMP_PARENT"' EXIT

compile_one() {
  local contract_name="$1"
  local source_file="$2"
  local temp_dir="$TMP_PARENT/$contract_name"
  mkdir -p "$temp_dir"
  cp "$ROOT_DIR/contracts/recovery/$source_file" "$temp_dir/$contract_name.cs"
  cat > "$temp_dir/$contract_name.csproj" <<EOF
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
EOF
  ~/.dotnet/tools/nccs "$temp_dir/$contract_name.csproj" -o "$OUT_DIR" --base-name "$contract_name" --assembly
}

mkdir -p "$OUT_DIR"
compile_one ArgentRecoveryVerifier ArgentRecoveryVerifier.Fixed.cs
compile_one SafeRecoveryVerifier SafeRecoveryVerifier.Fixed.cs
compile_one LoopringRecoveryVerifier LoopringRecoveryVerifier.Fixed.cs
