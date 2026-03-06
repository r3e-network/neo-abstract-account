# SDK Meta-Tx Helper Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated meta-transaction payload construction logic from the SDK test scripts by extracting one shared helper module.

**Architecture:** Add a dependency-injected helper under `sdk/js/tests/` that centralizes `computeArgsHash`, EIP-712 typed-data construction, and meta-transaction argument assembly for both account-id and address paths. Keep higher-level execution/search loops inside the existing scripts unless the shared shape is already identical, so the refactor stays small and behavior-preserving.

**Tech Stack:** Node.js, `node:test`, Neon JS, Ethers.

### Task 1: Add failing helper tests
**Files:**
- Create: `sdk/js/tests/metaTxHelpers.unit.test.js`
- Create: `sdk/js/tests/sharedMetaTxHelpersScripts.unit.test.js`

### Task 2: Extract shared helper module
**Files:**
- Create: `sdk/js/tests/meta.js`

### Task 3: Rebind scripts to shared helpers
**Files:**
- Modify: `sdk/js/tests/aa_testnet_full_validate.js`
- Modify: `sdk/js/tests/aa_testnet_negative_meta_validate.js`
- Modify: `sdk/js/tests/test-evm-meta-tx.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && node --test tests/metaTxHelpers.unit.test.js tests/sharedMetaTxHelpersScripts.unit.test.js`
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/meta.js sdk/js/tests/aa_testnet_full_validate.js sdk/js/tests/aa_testnet_negative_meta_validate.js sdk/js/tests/test-evm-meta-tx.js`
- `git diff --check`
