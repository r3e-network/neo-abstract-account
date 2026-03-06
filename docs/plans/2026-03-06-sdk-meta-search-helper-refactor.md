# SDK Meta Search Helper Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated meta-transaction variant search logic from the SDK validation scripts by extracting one shared helper.

**Architecture:** Add a dependency-injected helper under `sdk/js/tests/` that resolves meta execution context and builds candidate variants across args-hash alternatives and public-key alternatives. Keep script-specific behavior local by letting each script decide whether to simulate or send each candidate, while the shared helper owns the repeated search-space construction.

**Tech Stack:** Node.js, `node:test`, Neon JS, Ethers.

### Task 1: Add failing helper tests
**Files:**
- Create: `sdk/js/tests/metaSearchHelpers.unit.test.js`
- Create: `sdk/js/tests/sharedMetaSearchHelpersScripts.unit.test.js`

### Task 2: Extract shared meta search helper module
**Files:**
- Create: `sdk/js/tests/metaSearch.js`

### Task 3: Rebind validation scripts to shared search helper
**Files:**
- Modify: `sdk/js/tests/aa_testnet_full_validate.js`
- Modify: `sdk/js/tests/aa_testnet_negative_meta_validate.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && node --test tests/metaSearchHelpers.unit.test.js tests/sharedMetaSearchHelpersScripts.unit.test.js`
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/metaSearch.js sdk/js/tests/aa_testnet_full_validate.js sdk/js/tests/aa_testnet_negative_meta_validate.js`
- `git diff --check`
