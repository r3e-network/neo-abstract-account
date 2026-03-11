# Address-First Abstract Account Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the application, SDK, and default execution flows use the AA address as the primary identity everywhere, leaving `accountId` only in the create-account flow and in contract-internal verification/mapping paths.

**Architecture:** Keep the on-chain storage mapping between `accountId` and deterministic AA address, but shift all public-facing app state and default SDK/meta-transaction flows to address-first identifiers. Update EIP-712/meta-transaction hashing to bind signatures to AA address rather than `accountId`, keep compatibility helpers only where unavoidable, and remove `accountId` from UI summaries, loaded-state panels, staged transaction bodies, and draft approvals.

**Tech Stack:** C# Neo smart contracts, Vue 3 frontend, JavaScript operation helpers, node:test, .NET contract tests.

### Task 1: Add failing tests for address-first identity

**Files:**
- Modify: `frontend/tests/metaTransactionBuilder.test.js`
- Modify: `frontend/tests/draftSummary.test.js`
- Modify: `frontend/tests/homeOperationsView.test.js`
- Modify: `frontend/tests/operationsWorkspace.test.js`
- Modify: `sdk/js/tests/accountHelpers.unit.test.js`
- Modify: `tests/AbstractAccount.Contracts.Tests/ContractTests.cs`

**Step 1: Write failing tests**
- Expect typed-data payloads to carry `accountAddress` instead of `accountId`.
- Expect staged transaction bodies and draft approvals to store/render AA address as primary identity.
- Expect workspace/account helpers to no longer require `accountIdHex` for normal load/sign/broadcast flows.
- Expect the contract meta-tx struct hash path to key the typed-data payload by AA address.

**Step 2: Run targeted tests to verify they fail**
Run: targeted frontend, SDK, and contract tests.
Expected: FAIL because current code still uses `accountId` in typed data and draft state.

### Task 2: Refactor contract meta-tx hashing to address-first

**Files:**
- Modify: `contracts/AbstractAccount.MetaTx.cs`
- Modify: `tests/AbstractAccount.Contracts.Tests/ContractTests.cs`

**Step 1: Update struct-hash construction**
- Make the EIP-712 / meta-tx struct hash use the deterministic AA address as the account identity field.
- For `ExecuteUnifiedByAddress`, use the provided address directly.
- For `ExecuteUnified`, derive the deterministic AA address from the supplied `accountId` before hashing.

**Step 2: Keep nonce and verification internals intact**
- Continue resolving account storage through `accountId` internally where needed.
- Do not remove address↔id mapping.

**Step 3: Run contract tests**
Run: `dotnet test tests/AbstractAccount.Contracts.Tests/AbstractAccount.Contracts.Tests.csproj -c Release --nologo`
Expected: PASS.

### Task 3: Refactor frontend operation and draft state to address-first

**Files:**
- Modify: `frontend/src/features/operations/metaTx.js`
- Modify: `frontend/src/features/operations/execution.js`
- Modify: `frontend/src/features/operations/useOperationsWorkspace.js`
- Modify: `frontend/src/features/operations/helpers.js`
- Modify: `frontend/src/features/operations/draftSummary.js`
- Modify: `frontend/src/features/operations/components/HomeOperationsWorkspace.vue`
- Modify: `frontend/src/features/operations/components/LoadAccountPanel.vue`
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Modify related tests above

**Step 1: Replace accountId-based payload fields**
- Update typed-data builders, draft approvals, staged transaction bodies, and summaries to use AA address/script hash as the canonical identity.
- Remove `accountIdHex` from normal workflow state where it is only used for display or signing.

**Step 2: Keep internal fallback only where unavoidable**
- If a contract call still needs resolved `accountId` behind the scenes, derive it internally rather than surfacing it in UI state.

**Step 3: Run targeted frontend tests**
Run: affected `node --test` files first.
Expected: PASS.

### Task 4: Reduce `accountId` visibility in studio and sidebar UX

**Files:**
- Modify: `frontend/src/features/studio/components/CreateAccountPanel.vue`
- Modify: `frontend/src/features/studio/components/ManageGovernancePanel.vue`
- Modify: `frontend/src/features/studio/components/StudioSidebar.vue`
- Modify: `frontend/src/features/studio/constants.js`
- Modify: `frontend/src/features/studio/useStudioController.js`
- Modify: `frontend/src/i18n/index.js`

**Step 1: Keep Account ID only in create flow**
- Leave advanced override available only during creation.
- Remove non-essential Account ID display from governance/load/status views.
- Make AA address the visible identifier in sidebar/checklist/current-state summaries.

**Step 2: Run targeted studio tests**
- Update/add source-level tests if adjacent files already have them.
- Verify create flow still computes deterministic AA address correctly.

### Task 5: Update SDK defaults to address-first public flows

**Files:**
- Modify: `sdk/js/src/metaTx.js`
- Modify: `sdk/js/src/index.js`
- Modify: `sdk/js/tests/accountHelpers.unit.test.js`

**Step 1: Change public meta-tx helpers**
- Make SDK typed-data helpers accept AA address as the identity field.
- Preserve create-account helpers that require `accountId`.

**Step 2: Keep compatibility carefully**
- If old signatures are still exported, make them delegate to the address-first path or clearly mark them as legacy.

**Step 3: Run SDK tests**
Run: `cd sdk/js && npm test`
Expected: PASS.

### Task 6: Full verification and cleanup

**Files:**
- Verify: all touched slices

**Step 1: Run focused checks**
- Frontend targeted tests
- Contract tests
- SDK tests

**Step 2: Run broad verification**
Run: `./scripts/verify_repo.sh`
Expected: PASS.

**Step 3: Commit the address-first change set**
Run: `git add ... && git commit -m "refactor: make AA flows address-first"`
Expected: clean commit on isolated branch.
