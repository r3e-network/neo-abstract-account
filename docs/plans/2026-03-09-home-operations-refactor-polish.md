# Home Operations Refactor Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the duplicated summary, activity, clipboard, and relay preflight actions used by the home workspace and shared draft view into small reusable helpers without changing behavior.

**Architecture:** Keep both views thin by moving browser-side interaction helpers into focused `frontend/src/features/operations/*.js` modules next to the existing relay preflight helper. Preserve existing component contracts and status-message text so the current tests stay meaningful. Add small unit tests for the new helpers and keep view-level wiring stable.

**Tech Stack:** Vue 3 SFCs, Vite, node:test, existing operations helper modules.

### Task 1: Capture duplicated interaction helpers

**Files:**
- Modify: `frontend/src/features/operations/relayPreflightActions.js`
- Create: `frontend/src/features/operations/viewActions.js`
- Test: `frontend/tests/relayPreflightActions.test.js`
- Test: `frontend/tests/viewActions.test.js`

**Step 1: Write the failing tests**
- Add tests for copying summary values, copying share and txid actions, jumping to the relay section, and exporting relay preflight JSON.

**Step 2: Run targeted tests to verify the missing helpers fail**
- Run: `cd frontend && npm test -- viewActions relayPreflightActions`
- Expected: missing export or failing assertions for the new helpers.

**Step 3: Write the minimal implementation**
- Add browser-safe clipboard helpers and activity-action handling in `viewActions.js`.
- Move relay preflight JSON download logic into `relayPreflightActions.js`.

**Step 4: Run targeted tests to verify they pass**
- Run: `cd frontend && npm test -- viewActions relayPreflightActions`
- Expected: PASS.

### Task 2: Rewire both draft views to the shared helpers

**Files:**
- Modify: `frontend/src/features/operations/components/HomeOperationsWorkspace.vue`
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Test: `frontend/tests/homeOperationsView.test.js`

**Step 1: Update imports and handlers**
- Replace duplicated local functions with thin handlers built on the new shared helpers.

**Step 2: Keep UX copy and behavior stable**
- Preserve status messages, clipboard behavior, and relay jump behavior.

**Step 3: Run focused regression tests**
- Run: `cd frontend && npm test -- homeOperationsView activityTimeline draftSummary relayPreflightActions viewActions`
- Expected: PASS.

### Task 3: Validate the full frontend slice

**Files:**
- Verify: `frontend/tests/activityTimelineView.test.js`
- Verify: `frontend/tests/transactionDrafts.test.js`
- Verify: `frontend/tests/mixedSignatureFlow.test.js`
- Verify: `frontend/tests/relayPreflight.test.js`
- Verify: `frontend/tests/operationsPreferences.test.js`

**Step 1: Run the frontend suite**
- Run: `cd frontend && npm test`
- Expected: PASS.

**Step 2: Run the production build**
- Run: `cd frontend && npm run build`
- Expected: PASS with no new warnings introduced by the refactor.
