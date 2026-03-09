# Submission Feedback And Pending States Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add visible pending states and richer submission receipts for relay checks, client broadcasts, and relay submissions in the home workspace and shared draft view.

**Architecture:** Keep execution behavior unchanged while introducing a small pure helper that maps submission actions into pending button labels and receipt-card view models. Each view owns its transient pending action ref and receipt ref, but they both use the same helper so copy, tone, and explorer-link behavior stay aligned.

**Tech Stack:** Vue 3 SFCs, Vite, node:test, existing operations helpers.

### Task 1: Add failing tests

**Files:**
- Create: `frontend/tests/submissionFeedback.test.js`
- Modify: `frontend/tests/homeOperationsView.test.js`
- Modify: `frontend/tests/transactionDrafts.test.js`

**Step 1: Write the failing test**
- Add helper tests for pending labels and receipt card generation.
- Add source-based tests that expect `Checking Relay…`, `Broadcasting…`, `Submitting…`, and `Submission Receipt` in the home/shared views.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/submissionFeedback.test.js tests/homeOperationsView.test.js tests/transactionDrafts.test.js`
Expected: FAIL because the helper module and the new receipt UI do not exist yet.

### Task 2: Implement reusable submission feedback helpers

**Files:**
- Create: `frontend/src/features/operations/submissionFeedback.js`
- Test: `frontend/tests/submissionFeedback.test.js`

**Step 1: Write minimal implementation**
- Map action ids to idle and pending button labels.
- Build receipt cards for pending, success, and error outcomes.
- Include txid explorer links when available.

**Step 2: Run targeted tests**
Run: `cd frontend && npm test -- tests/submissionFeedback.test.js`
Expected: PASS.

### Task 3: Wire home and shared views

**Files:**
- Modify: `frontend/src/features/operations/components/HomeOperationsWorkspace.vue`
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Test: `frontend/tests/homeOperationsView.test.js`
- Test: `frontend/tests/transactionDrafts.test.js`

**Step 1: Add transient pending state**
- Track which submission action is currently in flight.
- Swap button labels to pending text and disable concurrent submission actions.

**Step 2: Add receipt cards**
- Show the most recent submission/check outcome with tone, detail, txid preview, and explorer link when available.

**Step 3: Keep existing flows intact**
- Preserve current status messages, activity entries, and broadcast behavior.

**Step 4: Run focused regression tests**
Run: `cd frontend && npm test -- tests/submissionFeedback.test.js tests/homeOperationsView.test.js tests/transactionDrafts.test.js`
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
