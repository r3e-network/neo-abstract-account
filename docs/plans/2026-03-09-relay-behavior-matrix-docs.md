# Relay Behavior Matrix Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a compact relay behavior matrix so operators can quickly see which runtime combinations enable preflight only, raw relay, or meta relay.

**Architecture:** Keep the change docs-only and validate it with the docs-rendering suite. Add the matrix to `sdk-usage.md` near the runtime/env reference because that section already explains relay-related configuration.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to include a `Relay Behavior Matrix` section.
- Expect it to mention `preflight only`, `signed raw relay`, and `meta relay submission`.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the matrix does not exist yet.

### Task 2: Update the runtime docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`

**Step 1: Write minimal documentation updates**
- Add a short markdown table that maps config combinations to effective relay behavior.

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
