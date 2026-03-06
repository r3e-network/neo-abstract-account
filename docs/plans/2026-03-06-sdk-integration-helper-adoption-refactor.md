# SDK Integration Helper Adoption Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish adopting the shared account and stack helpers in the remaining SDK validation scripts that still inline address derivation or stack ByteString decoding.

**Architecture:** Extend the shared account helper with a small fallback path so scripts can derive account addresses without first binding param helpers. Then update the integration-check and EVM meta-tx scripts to consume the shared helpers, backed by focused unit and adoption tests.

**Tech Stack:** Node.js, `node:test`, Neon JS, Ethers.

### Task 1: Add failing regression tests
**Files:**
- Modify: `sdk/js/tests/accountHelpers.unit.test.js`
- Modify: `sdk/js/tests/sharedAccountHelpersScripts.unit.test.js`
- Modify: `sdk/js/tests/sharedStackHelpersScripts.unit.test.js`

### Task 2: Extend the shared helper minimally
**Files:**
- Modify: `sdk/js/tests/account.js`

### Task 3: Rebind remaining scripts
**Files:**
- Modify: `sdk/js/tests/aa_testnet_integration_check.js`
- Modify: `sdk/js/tests/test-evm-meta-tx.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/account.js sdk/js/tests/aa_testnet_integration_check.js sdk/js/tests/test-evm-meta-tx.js`
- `git diff --check`
