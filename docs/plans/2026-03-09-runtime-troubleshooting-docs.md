# Runtime Troubleshooting Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a short troubleshooting section for the most common frontend runtime misconfigurations.

**Architecture:** Keep this change docs-only and verify it through the existing docs-rendering suite. Add the section to `sdk-usage.md` because that document already owns the runtime/env guidance.

**Tech Stack:** Markdown docs, node:test docs assertions.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to include a `Troubleshooting` section.
- Expect it to mention missing Supabase envs, missing `AA_RELAY_WIF`, relay meta mode being disabled, and missing explorer base URLs.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the troubleshooting section does not exist yet.

### Task 2: Update the runtime docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`

**Step 1: Write minimal documentation updates**
- Add a concise troubleshooting list for the most common operator/runtime mistakes.

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
