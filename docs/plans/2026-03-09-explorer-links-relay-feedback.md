# Explorer Links And Relay Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reusable explorer links and clearer latest-submission feedback across the home/shared draft flows without changing the transaction execution model.

**Architecture:** Introduce a small explorer helper module that normalizes transaction ids and builds explorer URLs from runtime config. Reuse that helper in summary actions, activity actions, and the shared draft broadcast card so the UI can open the latest transaction directly while keeping the existing copy/jump flows intact.

**Tech Stack:** Vue 3 SFCs, Vite, node:test, existing operations helpers.

### Task 1: Add failing explorer tests

**Files:**
- Create: `frontend/tests/explorerLinks.test.js`
- Modify: `frontend/tests/runtimeConfig.test.js`
- Modify: `frontend/tests/operationsRuntime.test.js`
- Modify: `frontend/tests/activityTimelineView.test.js`
- Modify: `frontend/tests/draftSummary.test.js`
- Modify: `frontend/tests/viewActions.test.js`
- Modify: `frontend/tests/transactionDrafts.test.js`

**Step 1: Write the failing test**
- Add unit coverage for transaction explorer URL generation and latest txid extraction.
- Expect runtime config to expose an explorer base URL.
- Expect activity and summary actions to produce explorer-link actions for txids.
- Expect the shared draft page to expose a `View Latest in Explorer` CTA.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/explorerLinks.test.js tests/runtimeConfig.test.js tests/operationsRuntime.test.js tests/activityTimelineView.test.js tests/draftSummary.test.js tests/viewActions.test.js tests/transactionDrafts.test.js`
Expected: FAIL because the explorer helper, runtime field, and explorer actions do not exist yet.

### Task 2: Implement reusable explorer helpers and action handling

**Files:**
- Create: `frontend/src/features/operations/explorer.js`
- Modify: `frontend/src/config/runtimeConfig.js`
- Modify: `frontend/src/config/operationsRuntime.js`
- Modify: `frontend/src/features/operations/activityTimeline.js`
- Modify: `frontend/src/features/operations/draftSummary.js`
- Modify: `frontend/src/features/operations/viewActions.js`
- Modify: `frontend/src/features/operations/components/ActivityTimeline.vue`
- Modify: `frontend/src/features/operations/components/DraftSummaryStrip.vue`

**Step 1: Write minimal implementation**
- Add explorer URL helpers and latest txid extraction.
- Expose explorer base URL through runtime config.
- Emit `Open Explorer` and `View Explorer` actions when txids are available.
- Handle external-link actions in the shared view action helpers.

**Step 2: Run targeted tests**
Run: `cd frontend && npm test -- tests/explorerLinks.test.js tests/runtimeConfig.test.js tests/operationsRuntime.test.js tests/activityTimelineView.test.js tests/draftSummary.test.js tests/viewActions.test.js`
Expected: PASS.

### Task 3: Surface the latest submission link in the shared draft page

**Files:**
- Modify: `frontend/src/views/TransactionInfoView.vue`
- Test: `frontend/tests/transactionDrafts.test.js`

**Step 1: Add latest tx explorer feedback**
- Derive the newest broadcast txid from draft activity.
- Show latest txid preview and `View Latest in Explorer` in the `Broadcast & Relay` card when present.

**Step 2: Reuse shared action context**
- Pass explorer base URL into the shared/home draft action context so summary and timeline buttons can open explorer links.

**Step 3: Run focused regression tests**
Run: `cd frontend && npm test -- tests/transactionDrafts.test.js tests/homeOperationsView.test.js tests/activityTimelineView.test.js`
Expected: PASS.

### Task 4: Verify the frontend slice

**Files:**
- Verify: `frontend/tests/sharedDraftView.test.js`
- Verify: `frontend/tests/mixedSignatureFlow.test.js`
- Verify: `frontend/tests/relayPreflight.test.js`

**Step 1: Run the full frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
