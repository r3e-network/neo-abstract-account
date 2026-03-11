# Security Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the identified AA and recovery-verifier security issues without changing unrelated behavior.

**Architecture:** The core wallet remains address-first and account-scoped. Fixes focus on (1) hardening verifier contracts so they match the wallet interface and cannot be initialized by arbitrary callers, and (2) tightening edge-case safety in the wallet around custom-verifier signer handoff and recovery policy defaults.

**Tech Stack:** Neo N3 C# smart contracts, Node `node:test` unit tests, `dotnet build`

### Task 1: Add failing contract-shape tests

**Files:**
- Modify: `sdk/js/tests/contractArtifacts.unit.test.js`
- Modify: `sdk/js/tests/recoveryReadiness.unit.test.js`

**Step 1: Write failing tests**
- Assert recovery verifier manifests expose both `verify` and `verifyMetaTx`.
- Assert recovery verifier source uses `ByteString accountId` instead of `UInt160 accountId` for verifier entrypoints.
- Assert recovery setup paths require owner authorization and reject blind reinitialization.

**Step 2: Run tests to verify failure**
Run: `cd sdk/js && node --test tests/contractArtifacts.unit.test.js tests/recoveryReadiness.unit.test.js`
Expected: FAIL on missing `verifyMetaTx` / insecure setup expectations.

### Task 2: Harden recovery verifier interfaces

**Files:**
- Modify: `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs`
- Modify: `contracts/recovery/SafeRecoveryVerifier.Fixed.cs`
- Modify: `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs`

**Step 1: Implement minimal fixes**
- Change verifier entrypoints to `ByteString accountId` where they are called by the AA wallet.
- Add `VerifyMetaTx(ByteString accountId, UInt160[] signerHashes)`.
- Make `SetupRecovery(...)` require `Runtime.CheckWitness(owner)` and reject reinitialization when already set.

**Step 2: Rebuild verifier artifacts**
Run: `cd contracts/recovery && dotnet build ArgentRecoveryVerifier.csproj -nologo && dotnet build SafeRecoveryVerifier.csproj -nologo && dotnet build LoopringRecoveryVerifier.csproj -nologo`
Expected: PASS.

### Task 3: Harden core wallet edge cases

**Files:**
- Modify: `contracts/AbstractAccount.MetaTx.cs`
- Modify: `contracts/AbstractAccount.Oracle.cs`
- Modify: `contracts/AbstractAccount.StorageAndContext.cs`
- Modify: `sdk/js/tests/metaTx.unit.test.js`
- Modify: `sdk/js/tests/recoveryReadiness.unit.test.js`

**Step 1: Write minimal code**
- Deduplicate recovered signer hashes before handing them to custom verifiers.
- Make dome oracle semantics explicit and safer by treating configured dome recovery as locked unless explicitly oracle-unlocked when an oracle URL is configured, and add a guardrail test for the no-oracle path.

**Step 2: Run focused tests**
Run: `cd sdk/js && node --test tests/metaTx.unit.test.js tests/recoveryReadiness.unit.test.js tests/contractArtifacts.unit.test.js`
Expected: PASS.

### Task 4: Verify builds and summarize

**Files:**
- None or update generated manifests if needed by existing repo workflows.

**Step 1: Run full targeted verification**
Run: `cd contracts && dotnet build AbstractAccount.csproj -nologo && cd ../contracts/recovery && dotnet build ArgentRecoveryVerifier.csproj -nologo && dotnet build SafeRecoveryVerifier.csproj -nologo && dotnet build LoopringRecoveryVerifier.csproj -nologo && cd ../sdk/js && node --test tests/contractArtifacts.unit.test.js tests/recoveryReadiness.unit.test.js tests/metaTx.unit.test.js`
Expected: PASS.
