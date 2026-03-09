# Testnet Production Checklist Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a concise operator checklist that distinguishes testnet setup from production setup for RPCs, explorers, relay signing, and relay-meta posture.

**Architecture:** Keep the change docs-only and validate it through the docs-rendering suite. Add the checklist to `sdk-usage.md` near the existing runtime guidance so deployers can compare environments in one place.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to include `Testnet vs Production Checklist`.
- Expect it to mention `testnet`, `production`, `AA_RELAY_WIF`, `VITE_AA_EXPLORER_BASE_URL`, and `relay meta mode`.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the checklist does not exist yet.

### Task 2: Update the runtime docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`

**Step 1: Write minimal documentation updates**
- Add a short testnet/production checklist with environment-specific reminders.

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
