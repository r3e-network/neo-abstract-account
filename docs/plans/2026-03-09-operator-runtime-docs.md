# Operator Runtime Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document the new server-side operator mutation and relay hardening runtime so deployers know which migrations, API routes, and secrets are required.

**Architecture:** Keep this change docs-only and validate it with the docs-rendering suite plus the existing frontend build. Extend the operator-facing setup notes in `README.md` and the runtime guidance in `frontend/src/assets/docs/sdk-usage.md` so the browser-safe envs stay separate from the server-only relay and Supabase secrets.

**Tech Stack:** Markdown docs, node:test docs assertions, Vite frontend build.

### Task 1: Add failing docs assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Expect `sdk-usage.md` to mention `SUPABASE_SERVICE_ROLE_KEY`, `AA_RELAY_ALLOWED_HASH`, and `AA_RELAY_ALLOW_RAW_FORWARD`.
- Expect it to mention the signed operator mutation route and that operator secrets remain server-only.
- Expect the README deployment guidance to mention the `20260311` through `20260314` migrations.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the operator runtime guidance does not exist yet.

### Task 2: Update the operator/runtime docs

**Files:**
- Modify: `frontend/src/assets/docs/sdk-usage.md`
- Modify: `README.md`

**Step 1: Write minimal documentation updates**
- Add a small server-runtime subsection covering `frontend/api/relay-transaction.js` and `frontend/api/draft-operator.js` expectations.
- Document which relay settings are browser-safe versus server-only.
- Extend the README deployment checklist with the latest Supabase migration order and operator-mutation requirements.

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
