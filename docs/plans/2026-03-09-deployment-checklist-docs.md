# Deployment Checklist Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a compact deployment checklist so operators can scan the required Supabase, relay, explorer, and retention setup in one place.

**Architecture:** Keep the change docs-only and validate it through the existing docs-rendering suite. Add the checklist under the README's home workspace deployment section because that is the first operator-facing setup block users see.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect the README to include a `Deployment Checklist` section.
- Expect it to mention the Supabase migration, `AA_RELAY_WIF`, `VITE_AA_EXPLORER_BASE_URL`, and bounded draft history.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the checklist block does not exist yet.

### Task 2: Update the README

**Files:**
- Modify: `README.md`

**Step 1: Write minimal documentation updates**
- Add a short checklist covering Supabase migration, relay signer, explorer base URL, and retention expectations.

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
