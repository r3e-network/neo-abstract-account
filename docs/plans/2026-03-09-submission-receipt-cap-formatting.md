# Submission Receipt Cap And Formatting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bound persisted submission receipt history growth and replace raw ISO timestamps in receipt history with cleaner user-facing labels.

**Architecture:** Extend the receipt helper with a max-history constant and a small timestamp formatter built on the existing activity date/time formatting helpers. Keep the append semantics append-only, but trim stored history to the newest N entries locally and in the Supabase RPC so shared drafts do not grow indefinitely.

**Tech Stack:** Vue 3 SFCs, Vite, node:test, Supabase SQL RPCs, existing operations helpers.

### Task 1: Add failing tests

**Files:**
- Modify: `frontend/tests/submissionReceipts.test.js`
- Modify: `frontend/tests/homeOperationsView.test.js`
- Modify: `frontend/tests/transactionDrafts.test.js`

**Step 1: Write the failing test**
- Expect receipt append helpers to cap history length.
- Expect history items to expose a formatted `createdLabel` using day + time.
- Expect the home/shared views to render `createdLabel` instead of raw `createdAt` in receipt history.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/submissionReceipts.test.js tests/homeOperationsView.test.js tests/transactionDrafts.test.js`
Expected: FAIL because history is currently unbounded and the views still render raw timestamps.

### Task 2: Implement capped history + formatted labels

**Files:**
- Modify: `frontend/src/features/operations/submissionReceipts.js`
- Modify: `supabase/migrations/20260309_submission_receipts.sql`

**Step 1: Write minimal implementation**
- Add a max receipt count constant.
- Trim appended histories to that max.
- Add a formatted `createdLabel` for history items using the activity date/time formatters.

**Step 2: Run targeted tests**
Run: `cd frontend && npm test -- tests/submissionReceipts.test.js`
Expected: PASS.

### Task 3: Rewire the history UI

**Files:**
- Modify: `frontend/src/features/operations/components/HomeOperationsWorkspace.vue`
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Test: `frontend/tests/homeOperationsView.test.js`
- Test: `frontend/tests/transactionDrafts.test.js`

**Step 1: Swap raw timestamps for formatted labels**
- Render the receipt history using `item.createdLabel`.

**Step 2: Run focused regression tests**
Run: `cd frontend && npm test -- tests/submissionReceipts.test.js tests/homeOperationsView.test.js tests/transactionDrafts.test.js`
Expected: PASS.

### Task 4: Verify the frontend slice

**Files:**
- Verify: `frontend/tests/submissionFeedback.test.js`
- Verify: `frontend/tests/activityTimelineView.test.js`

**Step 1: Run the full frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
