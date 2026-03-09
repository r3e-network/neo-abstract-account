# Recommended Deployment Profiles Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a short recommended deployment profiles section so operators can map their setup goals to a minimal, collaborative, or full relay-enabled runtime profile.

**Architecture:** Keep the change docs-only and verify it through the existing docs-rendering suite. Add the section to `sdk-usage.md` near the runtime reference and capability matrix because that is already the operator-facing runtime guide.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to include `Recommended Deployment Profiles`.
- Expect it to mention `local-only`, `collaborative`, and `full relay-enabled` profiles.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because that section does not exist yet.

### Task 2: Update the runtime docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`

**Step 1: Write minimal documentation updates**
- Add a short list or table that maps operator goals to practical runtime profiles.

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
