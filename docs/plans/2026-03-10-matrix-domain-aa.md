# Matrix Domain Account Access Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users create and discover Abstract Accounts through `.matrix` domains so the frontend relies less on raw `accountId` values and more on memorable account-facing identifiers.

**Architecture:** Keep the master contract as the policy-gated AA execution surface and integrate `.matrix` at the edges. Use a same-transaction batched wallet invocation for account creation plus domain registration, register the `.matrix` domain to the signer wallet address, and resolve the domain back to one or more AA addresses through on-chain admin/manager indexes. Add contract getters that return bound AA addresses by admin/manager so the frontend can load accounts with less direct `accountId` handling.

**Tech Stack:** C# smart contract, Vue 3 frontend, Neo browser-wallet integration, SDK helper methods, Markdown docs, LaTeX specification, node:test, .NET tests.

### Task 1: Add failing tests for `.matrix` discovery and creation flow

**Files:**
- Create: `frontend/tests/matrixDomainSupport.test.js`
- Modify: `sdk/js/tests/accountHelpers.unit.test.js`
- Modify: `tests/AbstractAccount.Contracts.Tests/ContractTests.cs`
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write failing tests**
- Expect the frontend to contain a matrix-domain resolver / load flow and a same-transaction registration path.
- Expect the SDK to expose address-based AA discovery helpers returning bound AA addresses.
- Expect the contract tests to cover address-index getters that return bound AA addresses for admin/manager roles.
- Expect docs/spec references to mention `.matrix` support.

**Step 2: Run the tests to verify they fail**
Run targeted frontend, SDK, and contract tests.
Expected: FAIL because the new helpers and docs do not exist yet.

### Task 2: Add contract and SDK address-discovery helpers

**Files:**
- Modify: `contracts/AbstractAccount.StorageAndContext.cs`
- Modify: `contracts/AbstractAccount.cs`
- Modify: `tests/AbstractAccount.Contracts.Tests/ContractTests.cs`
- Modify: `sdk/js/src/index.js`
- Modify: `sdk/js/tests/accountHelpers.unit.test.js`

**Step 1: Add safe contract getters**
- Add getters that resolve admin/manager-linked account IDs into bound AA addresses.

**Step 2: Add SDK wrappers**
- Expose the new contract getters through `AbstractAccountClient`.

**Step 3: Re-run targeted tests**
- Verify contract and SDK tests pass.

### Task 3: Add `.matrix` frontend resolution and batched registration

**Files:**
- Create: `frontend/src/services/matrixDomainService.js`
- Modify: `frontend/src/config/runtimeConfig.js`
- Modify: `frontend/src/services/walletService.js`
- Modify: `frontend/src/features/operations/components/LoadAccountPanel.vue`
- Modify: `frontend/src/features/operations/components/HomeOperationsWorkspace.vue`
- Modify: `frontend/src/features/studio/useStudioController.js`
- Modify: `frontend/src/features/studio/components/CreateAccountPanel.vue`
- Create or modify tests in `frontend/tests/matrixDomainSupport.test.js`

**Step 1: Add matrix runtime config**
- Support matrix contract hash configuration with a sensible testnet default.

**Step 2: Add matrix resolver service**
- Resolve `.matrix` to owner/controller addresses and then discover associated AA addresses via the new SDK/contract getters.

**Step 3: Add same-transaction registration path**
- Extend wallet service with batched invocation support for compatible providers.
- In studio account creation, if a `.matrix` domain is provided, batch AA creation and domain registration in one wallet transaction.
- Keep accountId generation automatic/secondary so users do not need to manage it explicitly.

**Step 4: Add address/domain-first load UX**
- Let users load by AA address or `.matrix` domain.
- If a domain resolves to multiple AA accounts, present a short list and let the user select one.

**Step 5: Re-run targeted frontend tests**
- Verify matrix domain tests pass.

### Task 4: Update docs and formal specification

**Files:**
- Modify: `README.md`
- Modify: `docs/INDEX.md`
- Modify: `docs/HOW_IT_WORKS.md`
- Modify: `docs/USER_GUIDE.md`
- Modify: `docs/WORKFLOWS.md`
- Modify: `docs/DATA_FLOW.md`
- Modify: `docs/specification/neo_abstract_account_spec.tex`
- Modify: `frontend/tests/docsRendering.test.js`
- Modify: `sdk/js/tests/specificationLatex.unit.test.js`

**Step 1: Document `.matrix` support**
- Explain the same-transaction registration flow, domain-based loading, and account-discovery model.

**Step 2: Update the formal specification**
- Add `.matrix` terminology, workflow, and data-flow treatment.

**Step 3: Re-run docs/spec tests**
- Verify docs and LaTeX spec references pass.

### Task 5: Full verification

**Files:**
- Verify: repo slices touched above

**Step 1: Run targeted checks**
- Frontend tests
- SDK unit tests
- Contract tests
- LaTeX specification test and compile

**Step 2: Run broader repo verification if the touched slices are stable**
- Use the repo verification script if no new blocker appears.
