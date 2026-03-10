# Contract Security Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the highest-risk contract logic issues around custom verifier authorization in meta-transactions and clean up confusing nonce semantics without regressing native or address-based AA flows.

**Architecture:** Preserve the existing address↔accountId mapping and native verifier interface for standard verification, but split custom-verifier authorization paths so meta-transactions use an explicit verifier entrypoint that receives the recovered signer set. Add a small address-based convenience getter for nonce clarity and leave legacy getters only where compatibility demands it.

**Tech Stack:** C# Neo smart contracts, .NET contract tests, existing SDK/validator source-level tests.

### Task 1: Add failing tests for custom verifier meta-tx safety

**Files:**
- Modify: `tests/AbstractAccount.Contracts.Tests/ContractTests.cs`
- Modify: `sdk/js/tests/customVerifierScript.unit.test.js`

**Step 1: Write failing tests**
- Expect meta-tx authorization to call a dedicated custom verifier method that includes recovered signer context.
- Expect the legacy `verify(accountId)` path to remain for native verification only.
- Expect the contract comments/source to make the split explicit.

**Step 2: Run targeted tests to verify they fail**
Run targeted .NET and SDK unit tests.
Expected: FAIL because the current code calls `verify(accountId)` in both native and meta paths.

### Task 2: Implement custom verifier split for meta-tx

**Files:**
- Modify: `contracts/AbstractAccount.ExecutionAndPermissions.cs`
- Modify: `contracts/AbstractAccount.MetaTx.cs`
- Modify: `contracts/AbstractAccount.AccountLifecycle.cs`
- Modify: `contracts/AbstractAccount.cs`
- Modify: `tests/AbstractAccount.Contracts.Tests/TestingArtifacts/UnifiedSmartWalletV2.artifacts.cs` if ABI changes require it

**Step 1: Add dedicated meta verifier contract call**
- Keep native/custom verification on `verify(accountId)`.
- For meta-tx permission checks, call a dedicated method such as `verifyMetaTx(accountId, recoveredSigners)` on the custom verifier.
- Fail closed if the custom verifier is configured but does not authorize the provided signer set.

**Step 2: Keep signer context semantics tight**
- Do not rely on ambient temporary context for external verifier contracts.
- Pass recovered signer information directly in the contract call.

**Step 3: Run targeted contract tests**
Run: `dotnet test tests/AbstractAccount.Contracts.Tests/AbstractAccount.Contracts.Tests.csproj -c Release --nologo`
Expected: PASS.

### Task 3: Clarify or deprecate confusing nonce getter behavior

**Files:**
- Modify: `contracts/AbstractAccount.MetaTx.cs`
- Modify: `sdk/js/src/index.js` only if public SDK helpers need alignment
- Modify: tests adjacent to these files

**Step 1: Reduce misuse risk**
- Keep `GetNonceForAddress(...)` as the preferred external path.
- Either mark `GetNonce(UInt160 signer)` as legacy in comments/docs or make its semantics explicit so callers do not mistake it for an address-bound nonce API.

**Step 2: Verify no regressions**
Run focused SDK and contract tests.

### Task 4: Full verification

**Files:**
- Verify: all touched slices

**Step 1: Run targeted checks**
- `.NET` contract tests
- `sdk/js` unit tests touching verifier logic

**Step 2: Run broad repo verification**
Run: `./scripts/verify_repo.sh`
Expected: PASS.

**Step 3: Commit**
Run: `git add ... && git commit -m "fix: harden contract verifier authorization"`
Expected: clean security-fix commit on isolated branch.
