# Comprehensive Explainer Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a clearer end-to-end documentation set that explains what the Neo Abstract Account is, how the architecture fits together, how data moves across the frontend/relay/Supabase/on-chain boundaries, and how users actually use the system in practice.

**Architecture:** Keep the existing docs hub structure (`guide`, `overview`, `architecture`, `workflow`, `dataFlow`) and deepen the core English pages instead of creating a large number of new top-level docs. Add stronger figures, user-role walkthroughs, component maps, trust-boundary explanations, and a root README documentation map so both the website docs view and the repo landing page explain the system coherently.

**Tech Stack:** Markdown docs, Mermaid diagrams, node:test docs assertions, Vite frontend build.

### Task 1: Add failing documentation assertions

**Files:**
- Modify: `frontend/tests/docsRendering.test.js`

**Step 1: Write the failing test**
- Assert that `guide.md` includes richer onboarding sections such as `Who This Is For`, `Choose the Right Path`, and `Glossary`.
- Assert that `architecture.md` includes a component map and verification/application pipeline explanation.
- Assert that `workflow.md` includes a first-transaction walkthrough and a decision section for choosing broadcast mode.
- Assert that `data-flow.md` includes explicit system boundaries and a data ownership/trust boundary explanation.
- Assert that the repo README includes a `Documentation Map` section so the overview page points readers to the new structure.

**Step 2: Run test to verify it fails**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: FAIL because the richer explainer sections do not exist yet.

### Task 2: Expand the core explainer pages

**Files:**
- Modify: `frontend/src/assets/docs/guide.md`
- Modify: `frontend/src/assets/docs/architecture.md`
- Modify: `frontend/src/assets/docs/workflow.md`
- Modify: `frontend/src/assets/docs/data-flow.md`
- Modify: `README.md`

**Step 1: Update the guide page**
- Add a clearer audience section, learning path, role-based usage path, glossary, and end-to-end mental model figure.

**Step 2: Update the architecture page**
- Add a component map, contract module responsibility table, and a verification-vs-application pipeline explanation.

**Step 3: Update the workflow page**
- Add a first-transaction walkthrough, broadcast-mode decision guide, and operational checkpoints for users/operators.

**Step 4: Update the data-flow page**
- Add a system-boundary figure, a data ownership matrix, and a trust/mutation boundary explanation spanning browser, Supabase, relay, and chain.

**Step 5: Update the README overview**
- Add a compact documentation map near the top so the docs hub overview page points readers to the most important explainer pages.

**Step 6: Run targeted docs tests**
Run: `cd frontend && npm test -- tests/docsRendering.test.js`
Expected: PASS.

### Task 3: Verify the documentation slice

**Files:**
- Verify: `frontend/tests/runtimeConfig.test.js`

**Step 1: Run the frontend suite**
Run: `cd frontend && npm test`
Expected: PASS.

**Step 2: Run the production build**
Run: `cd frontend && npm run build`
Expected: PASS.
