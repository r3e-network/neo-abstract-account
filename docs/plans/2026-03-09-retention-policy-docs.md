# Retention Policy Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document the bounded metadata-retention policy so operators know shared drafts keep capped activity and receipt history instead of growing indefinitely.

**Architecture:** Keep the change docs-only and reinforce it with the existing docs-rendering test suite. Mention both retention streams and their current limits in the workflow doc and the repo README so deployment/operator guidance matches the implementation.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs tests

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect the workflow doc and README to mention bounded activity history and bounded submission receipt history.
- Expect the limits `100` and `12` to appear in operator-facing docs.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the docs do not mention the new retention policy yet.

### Task 2: Update the docs

**Files:**
- Modify: `frontend/src/assets/docs/workflow.md`
- Modify: `README.md`

**Step 1: Write minimal documentation updates**
- Add a concise note that activity history is capped at `100` entries and submission receipts are capped at `12` entries for both local and Supabase-backed drafts.

**Step 2: Run targeted docs tests**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: PASS.

### Task 3: Verify the frontend slice

**Files:**
- Verify: `frontend/tests/homeOperationsView.test.js`

**Step 1: Run the full frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
