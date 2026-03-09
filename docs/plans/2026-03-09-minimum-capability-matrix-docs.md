# Minimum Capability Matrix Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a quick-start matrix that shows what still works without Supabase, relay, or explorer configuration.

**Architecture:** Keep the change docs-only and validate it via the docs-rendering suite. Add the matrix to `sdk-usage.md` near the runtime guidance because that is where deployers already look for environment setup.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to include a `Minimum Capability Matrix` section.
- Expect it to mention `without Supabase`, `without relay`, and `without explorer` scenarios.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the matrix does not exist yet.

### Task 2: Update the runtime docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`

**Step 1: Write minimal documentation updates**
- Add a short table that maps missing optional services to the remaining supported capabilities.

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
