# Restore Stashed WIP and N3Index API Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the user's pre-merge local WIP onto an isolated branch and update API-facing code to prefer `https://api.n3index.dev` endpoints documented on `https://n3index.dev` where they improve frontend data access or performance.

**Architecture:** Replay the preserved stash onto a clean branch created from the verified `master` merge so the user's unpublished work is recoverable without disturbing `master`. Then inspect the restored changes and route eligible API consumers through `api.n3index.dev`, preferring curated `/indexer/v1` endpoints and documented `/rest/v1` views rather than guessing unsupported RPC or explorer URLs.

**Tech Stack:** Git worktrees, Vue 3 frontend, JavaScript runtime config, Neo RPC helpers, N3Index public REST APIs, node:test, .NET contract tests.

### Task 1: Restore the preserved local WIP safely

**Files:**
- Modify: worktree git state only
- Source stash: `stash@{0}` on `/home/neo/git/neo-abstract-account`

**Step 1: Inspect the stash before applying**
Run: `git -C /home/neo/git/neo-abstract-account stash show --stat stash@{0}`
Expected: See the preserved local changes and affected files.

**Step 2: Apply the stash in the isolated worktree**
Run: `git -C /home/neo/.config/superpowers/worktrees/neo-abstract-account/wip-restore-stash-n3index-api stash apply stash@{0}`
Expected: The worktree now contains the user's unpublished WIP.

**Step 3: Resolve any replay conflicts minimally**
Run: `git status --short`
Expected: Either a clean apply or a focused list of conflicted files to resolve.

### Task 2: Identify API call sites suitable for N3Index

**Files:**
- Inspect: `frontend/src/config/runtimeConfig.js`
- Inspect: `frontend/src/utils/neo.js`
- Inspect: restored stash-modified frontend files
- Inspect docs: `docs/*`, `frontend/src/assets/docs/*`

**Step 1: Write or update a focused failing test**
- Add or update tests that assert the intended default API/runtime settings.
- Add coverage only where the repo already has adjacent tests.

**Step 2: Verify the test fails first**
Run: targeted `node --test` commands for the changed runtime/API helpers.
Expected: FAIL because the old default or API selection is still in place.

### Task 3: Implement N3Index-backed API/runtime changes

**Files:**
- Modify: `frontend/src/config/runtimeConfig.js`
- Modify: any restored frontend services or helpers that currently use slower/legacy public endpoints
- Modify: docs/config examples if defaults or guidance change
- Test: adjacent `frontend/tests/*.test.js`

**Step 1: Prefer documented N3Index API endpoints**
- Use `https://api.n3index.dev/indexer/v1/...` for curated network summaries and product-style API calls.
- Use `https://api.n3index.dev/rest/v1/...` only where the schema-backed explorer data is the right source.
- Do not replace Neo JSON-RPC calls with N3Index unless the docs confirm compatible RPC support.

**Step 2: Keep config explicit**
- If an API base URL is added, expose it through runtime config and `.env.example`.
- Keep existing RPC config separate from REST/indexer config.

**Step 3: Update docs**
- Document where N3Index is used and why.

### Task 4: Verify and summarize the restored branch

**Files:**
- Verify: all touched files

**Step 1: Run targeted tests**
- `node --test` for affected frontend runtime/service tests
- Additional targeted checks for restored WIP files as needed

**Step 2: Run broader verification if the touched slices are stable**
Run: `./scripts/verify_repo.sh` if dependency state in the worktree permits.
Expected: PASS, or a clear note about any worktree-specific setup blocker.

**Step 3: Commit the restored + updated WIP**
Run: `git add ... && git commit -m "..."`
Expected: A clean branch preserving the user's prior work plus the N3Index API migration.
