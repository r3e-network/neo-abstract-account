# Activity History Cap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bound persisted activity history so shared drafts do not accumulate unbounded metadata over time.

**Architecture:** Extend the activity helper with a stable max-history constant and keep append semantics append-only while trimming to the newest N entries. Mirror the cap in the local draft store and the Supabase RPC so both offline and shared flows behave identically.

**Tech Stack:** Vue 3 SFCs, Vite, node:test, Supabase SQL RPCs, existing operations helpers.

### Task 1: Add failing tests

**Files:**
- Modify: `frontend/tests/activityTimeline.test.js`
- Modify: `frontend/tests/transactionDrafts.test.js`

**Step 1: Write the failing test**
- Expect appended activity history to cap at a fixed maximum size.
- Expect the local draft store append path to keep only the newest activity entries.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/activityTimeline.test.js tests/transactionDrafts.test.js`
Expected: FAIL because activity history is currently unbounded.

### Task 2: Implement capped activity history

**Files:**
- Modify: `frontend/src/features/operations/activity.js`
- Modify: `frontend/src/features/operations/drafts.js`
- Modify: `supabase/migrations/20260308_home_operations_workspace.sql`

**Step 1: Write minimal implementation**
- Add a max activity count constant.
- Trim appended activity entries locally.
- Trim the Supabase activity RPC to the newest N records.

**Step 2: Run targeted tests**
Run: `cd frontend && npm test -- tests/activityTimeline.test.js tests/transactionDrafts.test.js`
Expected: PASS.

### Task 3: Verify the frontend slice

**Files:**
- Verify: `frontend/tests/homeOperationsView.test.js`
- Verify: `frontend/tests/activityTimelineView.test.js`

**Step 1: Run the full frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
