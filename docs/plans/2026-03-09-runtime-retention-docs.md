# Runtime Retention Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the runtime/operator docs so the SDK and mixed-signature guidance mention the bounded draft-retention policy alongside the existing Supabase and relay setup notes.

**Architecture:** Keep this change docs-only and validate it with the existing docs-rendering suite. Add concise policy notes to the SDK/runtime setup doc and the mixed multisig sharing doc so operators understand that collaboration drafts keep capped activity and submission receipt history.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to mention the shared draft retention policy.
- Expect `mixed-multisig.md` to mention bounded history on shared drafts.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because those docs do not mention the retention policy yet.

### Task 2: Update the runtime-facing docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`
- Modify: `frontend/src/assets/docs/mixed-multisig.md`

**Step 1: Write minimal documentation updates**
- Add a short note that shared draft metadata keeps the latest 100 activity entries and latest 12 submission receipts.

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
