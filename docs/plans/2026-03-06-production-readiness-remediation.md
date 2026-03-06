# Production Readiness Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the highest-risk correctness and consistency gaps blocking this repository from being production-ready.

**Architecture:** Keep the contract’s hardened execution model intact, but make it safer and more internally consistent. Fix storage-key safety and proxy-script parsing in the contract, align documentation and frontend source presentation with the real contract behavior, and add baseline CI so regressions are caught automatically.

**Tech Stack:** C# / Neo SmartContract Framework, MSTest, Vue 3 / Vite, Node.js, GitHub Actions

### Task 1: Make storage keys collision-safe without breaking existing state

**Files:**
- Modify: `contracts/AbstractAccount.StorageAndContext.cs`
- Test: `tests/AbstractAccount.Contracts.Tests/ContractTests.cs`

**Step 1: Write the failing tests**

Add tests that verify:
- new canonical storage keys are prefixed and do not equal raw short IDs
- legacy short IDs can still be detected through compatibility helpers

**Step 2: Run test to verify it fails**

Run: `dotnet test tests/AbstractAccount.Contracts.Tests/AbstractAccount.Contracts.Tests.csproj --filter Storage`
Expected: FAIL because the current keying scheme returns raw bytes for short IDs and has no compatibility layer.

**Step 3: Write minimal implementation**

Implement:
- canonical storage key helpers using versioned prefixes
- legacy key fallback for existing accounts
- creation guards that reject collisions against both canonical and legacy layouts

**Step 4: Run test to verify it passes**

Run: `dotnet test tests/AbstractAccount.Contracts.Tests/AbstractAccount.Contracts.Tests.csproj --filter Storage`
Expected: PASS

### Task 2: Replace raw byte-pattern proxy-script gating with opcode-aware parsing

**Files:**
- Modify: `contracts/AbstractAccount.StorageAndContext.cs`
- Test: `tests/AbstractAccount.Contracts.Tests/ContractTests.cs`

**Step 1: Write the failing test**

Add a test showing a valid self-call script is rejected when an argument payload contains the raw `System.Contract.Call` syscall bytes.

**Step 2: Run test to verify it fails**

Run: `dotnet test tests/AbstractAccount.Contracts.Tests/AbstractAccount.Contracts.Tests.csproj --filter ProxyWitness`
Expected: FAIL because the current implementation counts raw byte occurrences instead of parsed syscall instructions.

**Step 3: Write minimal implementation**

Implement a parser that walks the VM bytecode, skips pushed data correctly, and counts only real syscall opcodes for `System.Contract.Call`.

**Step 4: Run test to verify it passes**

Run: `dotnet test tests/AbstractAccount.Contracts.Tests/AbstractAccount.Contracts.Tests.csproj --filter ProxyWitness`
Expected: PASS

### Task 3: Align repo and docs with the real hardened contract behavior

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `frontend/src/assets/docs/overview.md`
- Modify: `frontend/src/assets/docs/custom-verifiers.md`
- Delete: `frontend/src/contracts/AbstractAccount.cs`
- Delete: `frontend/src/contracts/AbstractAccount.AccountLifecycle.cs`
- Delete: `frontend/src/contracts/AbstractAccount.Admin.cs`
- Delete: `frontend/src/contracts/AbstractAccount.ExecutionAndPermissions.cs`
- Delete: `frontend/src/contracts/AbstractAccount.MetaTx.cs`
- Delete: `frontend/src/contracts/AbstractAccount.Oracle.cs`
- Delete: `frontend/src/contracts/AbstractAccount.StorageAndContext.cs`
- Delete: `frontend/src/contracts/AbstractAccount.Upgrade.cs`

**Step 1: Write the failing tests**

Add/update frontend doc tests so they assert the docs describe a policy-gated hardened entrypoint model rather than a fully open programmable surface.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --test-name-pattern hardened`
Expected: FAIL until docs are updated.

**Step 3: Write minimal implementation**

Update docs and remove dead mirrored contract source files so the frontend only presents the repo-root contract files.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS

### Task 4: Add baseline CI for contract, frontend, and SDK validation

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write the failing test**

No automated test needed; the existence and syntax of the workflow are the deliverable.

**Step 2: Write minimal implementation**

Create a workflow that:
- runs `.NET` contract tests
- runs frontend tests and build
- runs SDK unit tests

**Step 3: Verify locally**

Run the same commands manually:
- `dotnet test neo-abstract-account.sln -c Release --nologo`
- `cd frontend && npm test && npm run build`
- `cd sdk/js && npm test`

Expected: PASS
