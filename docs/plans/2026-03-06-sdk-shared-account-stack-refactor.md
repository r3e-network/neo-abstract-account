# SDK Shared Account/Stack Helper Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated account-derivation and stack-decoding logic from testnet validation scripts while preserving their current behavior and verification coverage.

**Architecture:** Add small test-side helper modules under `sdk/js/tests/` that follow the existing dependency-injected helper style. Keep call-site changes minimal by destructuring bound helpers inside each validation script, then verify behavior with focused unit tests plus adoption tests that ensure scripts import the shared helpers instead of redefining them.

**Tech Stack:** Node.js, `node:test`, Neon JS, Ethers.

### Task 1: Add failing helper tests
**Files:**
- Create: `sdk/js/tests/accountHelpers.unit.test.js`
- Create: `sdk/js/tests/stackHelpers.unit.test.js`
- Create: `sdk/js/tests/sharedAccountHelpersScripts.unit.test.js`
- Create: `sdk/js/tests/sharedStackHelpersScripts.unit.test.js`

### Task 2: Extract shared helper modules
**Files:**
- Create: `sdk/js/tests/account.js`
- Create: `sdk/js/tests/stack.js`

### Task 3: Rebind validation scripts to helpers
**Files:**
- Modify: `sdk/js/tests/aa_testnet_full_validate.js`
- Modify: `sdk/js/tests/aa_testnet_negative_meta_validate.js`
- Modify: `sdk/js/tests/aa_testnet_max_transfer_validate.js`
- Modify: `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/account.js sdk/js/tests/stack.js sdk/js/tests/aa_testnet_full_validate.js sdk/js/tests/aa_testnet_negative_meta_validate.js sdk/js/tests/aa_testnet_max_transfer_validate.js sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`
- `git diff --check`
