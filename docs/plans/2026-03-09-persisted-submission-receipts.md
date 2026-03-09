# Persisted Submission Receipts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist completed relay checks and submission receipts in draft metadata so shared drafts can recover receipt state and show a lightweight receipt history after reloads.

**Architecture:** Add an append-only submission-receipt helper for normalized receipt entries plus a dedicated draft-store append method. Keep transient pending state local to each view, but persist completed success/error outcomes in `metadata.submissionReceipts` using append semantics so multiple operators do not overwrite each other. Use a small computed history presentation in the home/shared views to render recent receipts with explorer links.

**Tech Stack:** Vue 3 SFCs, Vite, node:test, Supabase SQL RPCs, existing operations helpers.

### Task 1: Add failing tests

**Files:**
- Create: `frontend/tests/submissionReceipts.test.js`
- Modify: `frontend/tests/submissionFeedback.test.js`
- Modify: `frontend/tests/transactionDrafts.test.js`
- Modify: `frontend/tests/homeOperationsView.test.js`

**Step 1: Write the failing test**
- Add helper tests for normalizing, appending, and resolving persisted receipt entries.
- Add a draft-store test for appending persisted receipt history locally.
- Add source tests that expect `Receipt History` in the home/shared views.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/submissionReceipts.test.js tests/submissionFeedback.test.js tests/transactionDrafts.test.js tests/homeOperationsView.test.js`
Expected: FAIL because the helper module, draft-store append method, and history UI do not exist yet.

### Task 2: Implement receipt persistence helpers and store support

**Files:**
- Create: `frontend/src/features/operations/submissionReceipts.js`
- Modify: `frontend/src/features/operations/submissionFeedback.js`
- Modify: `frontend/src/features/operations/drafts.js`
- Create: `supabase/migrations/20260309_submission_receipts.sql`
- Test: `frontend/tests/submissionReceipts.test.js`

**Step 1: Write minimal implementation**
- Normalize receipt entries with action, phase, detail, txid, and timestamp.
- Append receipt entries immutably and resolve the latest stored receipt.
- Add `appendSubmissionReceipt` to the local and Supabase-backed draft store.
- Add a dedicated Supabase RPC for append-only receipt history updates.

**Step 2: Run targeted tests**
Run: `cd frontend && npm test -- tests/submissionReceipts.test.js tests/submissionFeedback.test.js`
Expected: PASS.

### Task 3: Rehydrate and render receipt history in both views

**Files:**
- Modify: `frontend/src/features/operations/components/HomeOperationsWorkspace.vue`
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Test: `frontend/tests/homeOperationsView.test.js`
- Test: `frontend/tests/transactionDrafts.test.js`

**Step 1: Persist completed receipts**
- When a relay check or submission completes, append the normalized receipt entry to draft metadata when a share slug exists.

**Step 2: Rehydrate the latest receipt**
- Build the active receipt from transient state first, falling back to the latest persisted receipt after reload.

**Step 3: Render recent receipt history**
- Show a small `Receipt History` list with timestamp, title, detail, and explorer link when a txid exists.

**Step 4: Run focused regression tests**
Run: `cd frontend && npm test -- tests/submissionReceipts.test.js tests/homeOperationsView.test.js tests/transactionDrafts.test.js`
Expected: PASS.

### Task 4: Verify the frontend slice

**Files:**
- Verify: `frontend/tests/activityTimelineView.test.js`
- Verify: `frontend/tests/relayPreflight.test.js`
- Verify: `frontend/tests/mixedSignatureFlow.test.js`

**Step 1: Run the full frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
