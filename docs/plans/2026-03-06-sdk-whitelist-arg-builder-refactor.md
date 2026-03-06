# SDK Whitelist Arg Builder Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated whitelist and whitelist-mode argument builder logic from the SDK validation scripts by extracting one shared helper.

**Architecture:** Add a small dependency-injected helper module under `sdk/js/tests/` that centralizes the whitelist-related argument encodings already used in native and meta-tx flows. Keep the helper data-driven so it can generate the existing raw/reversed/integer/wrapped variants without changing script behavior.

**Tech Stack:** Node.js, `node:test`, Neon JS.

### Task 1: Add failing helper tests
**Files:**
- Create: `sdk/js/tests/whitelistArgs.unit.test.js`
- Create: `sdk/js/tests/sharedWhitelistArgsScripts.unit.test.js`

### Task 2: Extract shared whitelist arg builder module
**Files:**
- Create: `sdk/js/tests/whitelistArgs.js`

### Task 3: Rebind validation scripts to shared builders
**Files:**
- Modify: `sdk/js/tests/aa_testnet_full_validate.js`
- Modify: `sdk/js/tests/aa_testnet_negative_meta_validate.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && node --test tests/whitelistArgs.unit.test.js tests/sharedWhitelistArgsScripts.unit.test.js`
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/whitelistArgs.js sdk/js/tests/aa_testnet_full_validate.js sdk/js/tests/aa_testnet_negative_meta_validate.js`
- `git diff --check`
