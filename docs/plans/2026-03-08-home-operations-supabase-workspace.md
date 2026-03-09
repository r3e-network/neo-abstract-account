# Home Operations Supabase Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the home page into an app-first Abstract Account workspace that lets users load an AA, compose operations, create shareable mixed-signature drafts, collect signatures through anonymous Supabase-backed links, and choose either client-side or relay broadcast.

**Architecture:** Reuse the existing frontend wallet/runtime helpers and studio patterns, but introduce a dedicated home-workspace module that separates transaction composition, draft persistence, signature collection, and broadcast orchestration. Use Supabase as the anonymous persistence and collaboration layer, keep private keys client-side, and treat relay submission as an optional transport mode rather than a signer of record.

**Tech Stack:** Vue 3, Vite, Vue Router, existing Neo runtime helpers, `@supabase/supabase-js`, Vercel serverless functions, local browser wallet integrations (NeoLine / neo3Dapi), ethers for EVM signature support

### Task 1: Add Supabase and relay runtime plumbing

**Files:**
- Create: `frontend/src/lib/supabaseClient.js`
- Create: `frontend/src/config/operationsRuntime.js`
- Create: `frontend/api/relay-transaction.js`
- Modify: `frontend/package.json`
- Modify: `frontend/src/config/runtimeConfig.js`
- Test: `frontend/tests/runtimeConfig.test.js`

**Step 1: Write the failing tests**
- Assert the frontend runtime config exposes Supabase URL, anon key, and optional relay endpoint.
- Assert a dedicated Supabase client module exists and can no-op cleanly when env is missing.
- Assert the relay endpoint returns a structured error when relay env is not configured.

**Step 2: Run test to verify it fails**
Run: `cd frontend && node --test tests/runtimeConfig.test.js`
Expected: FAIL because the new runtime config keys and modules do not exist.

**Step 3: Write minimal implementation**
- Add env-driven runtime config for Supabase + relay mode.
- Add a small Supabase client factory used only by the collaboration layer.
- Add a Vercel function that accepts an already-signed raw transaction and forwards it to the configured RPC, with explicit guardrails and error mapping.

**Step 4: Run test to verify it passes**
Run: `cd frontend && node --test tests/runtimeConfig.test.js`
Expected: PASS

### Task 2: Create the home operations workspace state layer

**Files:**
- Create: `frontend/src/features/operations/constants.js`
- Create: `frontend/src/features/operations/helpers.js`
- Create: `frontend/src/features/operations/useOperationsWorkspace.js`
- Test: `frontend/tests/operationsWorkspace.test.js`

**Step 1: Write the failing tests**
- Assert the workspace can hold AA identity, operation mode, transaction body, signers, signatures, and share metadata.
- Assert the workspace derives signer vs bound-address forms correctly from an AA draft.
- Assert broadcast mode can switch between local wallet broadcast and relay broadcast without mutating the draft body.

**Step 2: Run test to verify it fails**
Run: `cd frontend && node --test tests/operationsWorkspace.test.js`
Expected: FAIL because the workspace module does not exist.

**Step 3: Write minimal implementation**
- Add a focused composable for operation composition and draft state.
- Keep draft payload immutable once persisted; only signatures/status can append.
- Normalize Neo + EVM signer descriptors into one shared structure.

**Step 4: Run test to verify it passes**
Run: `cd frontend && node --test tests/operationsWorkspace.test.js`
Expected: PASS

### Task 3: Add anonymous Supabase draft persistence and share links

**Files:**
- Create: `frontend/src/features/operations/drafts.js`
- Create: `frontend/src/features/operations/shareLinks.js`
- Modify: `frontend/src/router/index.js`
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Test: `frontend/tests/transactionDrafts.test.js`

**Step 1: Write the failing tests**
- Assert a draft record can be serialized with immutable transaction data and append-only signatures.
- Assert `TransactionInfoView` can load a draft by share id and render signer/signature state.
- Assert link generation keeps only share-safe metadata in the URL.

**Step 2: Run test to verify it fails**
Run: `cd frontend && node --test tests/transactionDrafts.test.js`
Expected: FAIL because the draft/share modules do not exist.

**Step 3: Write minimal implementation**
- Add Supabase CRUD helpers for anonymous draft creation, read, append-signature, and status updates.
- Route `/tx/:draftId` (or equivalent) to the shared transaction view.
- Keep mutation permissions in the app logic append-only for signatures and status.

**Step 4: Run test to verify it passes**
Run: `cd frontend && node --test tests/transactionDrafts.test.js`
Expected: PASS

### Task 4: Build the app-first home operation panels

**Files:**
- Create: `frontend/src/features/operations/components/LoadAccountPanel.vue`
- Create: `frontend/src/features/operations/components/OperationComposerPanel.vue`
- Create: `frontend/src/features/operations/components/SignatureWorkflowPanel.vue`
- Create: `frontend/src/features/operations/components/BroadcastOptionsPanel.vue`
- Create: `frontend/src/features/operations/components/ActivitySidebar.vue`
- Modify: `frontend/src/views/HomeView.vue`
- Modify: `frontend/src/components/AbstractAccountTool.vue`
- Test: `frontend/tests/homeOperationsView.test.js`

**Step 1: Write the failing tests**
- Assert the home page now renders the operations workspace above the explanatory content.
- Assert the workspace exposes load-account, compose-operation, signature-collection, and broadcast-mode sections.
- Assert the old studio entrypoint is no longer the only primary action on home.

**Step 2: Run test to verify it fails**
Run: `cd frontend && node --test tests/homeOperationsView.test.js`
Expected: FAIL because the new app-first panels do not exist.

**Step 3: Write minimal implementation**
- Add a visually cohesive operations workspace using the existing design language.
- Embed the workspace at the top of `HomeView` and keep the architecture/marketing content below it.
- Reuse `AbstractAccountTool` concepts where helpful, but keep the home page focused on operations rather than governance tabs.

**Step 4: Run test to verify it passes**
Run: `cd frontend && node --test tests/homeOperationsView.test.js`
Expected: PASS

### Task 5: Support mixed Neo + EVM signature collection

**Files:**
- Create: `frontend/src/features/operations/signatures.js`
- Modify: `frontend/src/services/walletService.js`
- Modify: `frontend/src/composables/useWalletConnection.js`
- Test: `frontend/tests/mixedSignatureFlow.test.js`

**Step 1: Write the failing tests**
- Assert Neo wallet signatures and EVM signatures can both attach to the same immutable draft.
- Assert the UI/state layer tracks which signer roles are satisfied and which remain pending.
- Assert multi-signature transaction bodies can be exported for storage, relaying, or sharing.

**Step 2: Run test to verify it fails**
Run: `cd frontend && node --test tests/mixedSignatureFlow.test.js`
Expected: FAIL because the shared signature workflow does not exist.

**Step 3: Write minimal implementation**
- Add signature adapters for NeoLine/neo3Dapi and ethers-compatible EVM signing.
- Persist collected signatures in Supabase linked to signer identity and draft id.
- Expose transaction body export/download/share actions from the home workspace.

**Step 4: Run test to verify it passes**
Run: `cd frontend && node --test tests/mixedSignatureFlow.test.js`
Expected: PASS

### Task 6: Finish integration and docs

**Files:**
- Modify: `README.md`
- Modify: `frontend/src/assets/docs/sdk-usage.md`
- Modify: `frontend/src/assets/docs/workflow.md`
- Modify: `frontend/src/assets/docs/mixed-multisig.md`
- Test: `frontend/tests/docsRendering.test.js`

**Step 1: Write/update the failing doc expectations**
- Assert the docs mention the home operations workspace, anonymous share links, Supabase persistence, and both broadcast modes.

**Step 2: Run test to verify it fails**
Run: `cd frontend && node --test tests/docsRendering.test.js`
Expected: FAIL because the docs do not mention the new workflow yet.

**Step 3: Write minimal documentation**
- Document how drafts are created, shared, signed, and broadcast.
- Document that client-side broadcast is the default safe path and relay mode is optional.
- Document Supabase env setup for Vercel deployments.

**Step 4: Run tests to verify they pass**
Run: `cd frontend && npm test`
Expected: PASS

**Step 5: Run focused build verification**
Run: `cd frontend && npm run build`
Expected: PASS
