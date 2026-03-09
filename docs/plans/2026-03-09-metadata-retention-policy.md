# Metadata Retention Policy Cleanup Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize append-only metadata retention limits so activity history and submission receipt history share one explicit policy surface.

**Architecture:** Keep the existing helper-level exports for backward compatibility, but derive them from a single `DRAFT_METADATA_HISTORY_LIMITS` object in `frontend/src/features/operations/constants.js`. Leave SQL limits explicit, and add tests that verify the JS policy and SQL migrations stay aligned.

**Tech Stack:** Vue 3 helper modules, node:test, existing Supabase SQL migrations.

### Task 1: Add failing tests

**Files:**
- Create: `frontend/tests/operationsConstants.test.js`

**Step 1: Write the failing test**
- Expect `DRAFT_METADATA_HISTORY_LIMITS` to expose `activity` and `submissionReceipts`.
- Expect `MAX_ACTIVITY_ENTRIES` and `MAX_SUBMISSION_RECEIPTS` to derive from those constants.
- Expect the related migrations to use `limit 100` and `limit 12`.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/operationsConstants.test.js`
Expected: FAIL because the centralized policy object does not exist yet.

### Task 2: Implement the shared policy surface

**Files:**
- Modify: `frontend/src/features/operations/constants.js`
- Modify: `frontend/src/features/operations/activity.js`
- Modify: `frontend/src/features/operations/submissionReceipts.js`
- Test: `frontend/tests/operationsConstants.test.js`

**Step 1: Write minimal implementation**
- Add `DRAFT_METADATA_HISTORY_LIMITS` and named aliases in `constants.js`.
- Import those aliases into the activity and submission receipt helpers.

**Step 2: Run targeted tests**
Run: `cd frontend && npm test -- tests/operationsConstants.test.js`
Expected: PASS.

### Task 3: Verify the frontend slice

**Files:**
- Verify: `frontend/tests/activityTimeline.test.js`
- Verify: `frontend/tests/submissionReceipts.test.js`

**Step 1: Run the full frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
