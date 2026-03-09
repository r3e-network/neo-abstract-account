# Runtime Env Reference Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add one compact runtime/env reference table so operators can see Supabase, relay, explorer, and bounded-history settings in one place.

**Architecture:** Keep this change docs-only and validate it with the existing docs-rendering suite. Add the table to `sdk-usage.md` near the runtime setup section because that doc already carries the frontend env guidance.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to include a `Runtime Reference` table.
- Expect it to mention `VITE_AA_EXPLORER_BASE_URL` and the bounded history policy.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the reference table does not exist yet.

### Task 2: Update the runtime docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`

**Step 1: Write minimal documentation updates**
- Add a concise markdown table covering Supabase, relay, explorer, and metadata-retention settings.

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
