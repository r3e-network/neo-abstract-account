# Shared Draft Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the shared draft page so operators can scan operation details, signer state, signature actions, and relay/broadcast controls without redundant raw JSON panels.

**Architecture:** Keep `TransactionInfoView.vue` focused on orchestration while moving display shaping into a small `sharedDraftView.js` helper. Reuse the current draft, signer-progress, and relay-readiness models so this remains a UI polish pass rather than a behavior rewrite. Preserve current signing and broadcast actions while grouping them into clearer cards.

**Tech Stack:** Vue 3 SFCs, Vite, node:test, existing operations helpers.

### Task 1: Add failing presentation tests

**Files:**
- Create: `frontend/tests/sharedDraftView.test.js`
- Modify: `frontend/tests/transactionDrafts.test.js`

**Step 1: Write the failing test**
- Add unit tests for operation snapshot cards, signer checklist rows, and collected-signature presentation.
- Add a view-source test that expects the shared draft page to expose `Operation Snapshot`, `Signer Checklist`, `Signature Actions`, and `Broadcast & Relay`.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/sharedDraftView.test.js tests/transactionDrafts.test.js`
Expected: FAIL because the helper module and new shared-draft section labels do not exist yet.

### Task 2: Implement shared presentation helpers

**Files:**
- Create: `frontend/src/features/operations/sharedDraftView.js`
- Test: `frontend/tests/sharedDraftView.test.js`

**Step 1: Write minimal implementation**
- Build operation snapshot fields from `draft.operation_body`, `draft.transaction_body`, and relay-readiness state.
- Build signer checklist rows from signer requirements plus collected signatures.
- Build collected-signature cards with compact previews and metadata badges.

**Step 2: Run targeted tests**
Run: `cd frontend && npm test -- tests/sharedDraftView.test.js`
Expected: PASS.

### Task 3: Rework the shared draft page layout

**Files:**
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Test: `frontend/tests/transactionDrafts.test.js`
- Test: `frontend/tests/homeOperationsView.test.js`

**Step 1: Replace redundant panels**
- Remove the raw `Draft Summary` JSON panel.
- Add `Operation Snapshot` and `Signer Checklist` sections driven by the new helper.

**Step 2: Regroup controls**
- Split the current mixed control area into `Signature Actions` and `Broadcast & Relay` cards.
- Keep all existing actions and status messages intact.

**Step 3: Improve collected-signature scanability**
- Render signatures as cards with signer label, preview, and metadata hints instead of a plain stacked dump.

**Step 4: Run focused regression tests**
Run: `cd frontend && npm test -- tests/sharedDraftView.test.js tests/transactionDrafts.test.js tests/homeOperationsView.test.js`
Expected: PASS.

### Task 4: Verify the frontend slice

**Files:**
- Verify: `frontend/tests/activityTimelineView.test.js`
- Verify: `frontend/tests/mixedSignatureFlow.test.js`
- Verify: `frontend/tests/relayPreflight.test.js`

**Step 1: Run the full frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
