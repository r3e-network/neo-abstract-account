# Execute Unified Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep `Verify(...)` separate while introducing one canonical runtime execution entry that handles both native and EVM application paths.

**Architecture:** Add `ExecuteUnified(...)` plus an address-based convenience wrapper, route existing native and meta-tx public methods through it for backward compatibility, and share the execution tail plus meta-tx preparation logic. Keep verification unchanged and preserve security boundaries such as verify-context and execution locks.

**Tech Stack:** Neo N3 C# smart contracts, Node `node:test`, `dotnet build`

### Task 1: Add failing source-level tests

**Files:**
- Create: `sdk/js/tests/executeUnified.unit.test.js`

**Step 1: Write failing test**
- Assert `ExecuteUnified(...)` exists.
- Assert old execution entrypoints delegate to it.
- Assert proxy allowlist includes unified runtime names.

**Step 2: Run test to verify it fails**
Run: `cd sdk/js && node --test tests/executeUnified.unit.test.js`
Expected: FAIL because `ExecuteUnified` does not exist yet.

### Task 2: Implement unified runtime entry

**Files:**
- Modify: `contracts/AbstractAccount.ExecutionAndPermissions.cs`
- Modify: `contracts/AbstractAccount.MetaTx.cs`
- Modify: `contracts/AbstractAccount.StorageAndContext.cs`
- Modify: `contracts/AbstractAccount.cs`

**Step 1: Add canonical execution method**
- Introduce `ExecuteUnified(...)` and `ExecuteUnifiedByAddress(...)`.
- Route native and meta-tx paths through one shared implementation.
- Keep `Execute`, `ExecuteUnifiedByAddress`, `ExecuteUnified`, and `ExecuteUnifiedByAddress` as thin compatibility shims.

**Step 2: Update proxy verification allowlist**
- Permit unified runtime wrapper names in the explicit proxy verification allowlist.

### Task 3: Rebuild and verify

**Files:**
- None

**Step 1: Run verification**
Run: `cd contracts && dotnet build AbstractAccount.csproj -nologo && cd ../sdk/js && node --test tests/executeUnified.unit.test.js tests/securityAudit.unit.test.js`
Expected: PASS.
