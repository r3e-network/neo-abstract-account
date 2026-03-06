# SDK Invocation Helper Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated invocation simulation/send/wait logic from the SDK testnet validation scripts by extracting one shared helper.

**Architecture:** Add a small dependency-injected helper module under `sdk/js/tests/` that centralizes signer defaults, script construction, simulation, transaction submission, optional confirmation waiting, and optional HALT assertion. Keep each script's call-site differences explicit through options so the refactor stays behavior-preserving and does not overfit to one script.

**Tech Stack:** Node.js, `node:test`, Neon JS.

### Task 1: Add failing helper tests
**Files:**
- Create: `sdk/js/tests/invokeHelpers.unit.test.js`
- Create: `sdk/js/tests/sharedInvokeHelpersScripts.unit.test.js`

### Task 2: Extract shared invocation helper
**Files:**
- Create: `sdk/js/tests/invoke.js`

### Task 3: Rebind validation scripts to helper
**Files:**
- Modify: `sdk/js/tests/aa_testnet_integration_check.js`
- Modify: `sdk/js/tests/aa_testnet_full_validate.js`
- Modify: `sdk/js/tests/aa_testnet_negative_meta_validate.js`
- Modify: `sdk/js/tests/aa_testnet_max_transfer_validate.js`
- Modify: `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/invoke.js sdk/js/tests/aa_testnet_integration_check.js sdk/js/tests/aa_testnet_full_validate.js sdk/js/tests/aa_testnet_negative_meta_validate.js sdk/js/tests/aa_testnet_max_transfer_validate.js sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`
- `git diff --check`
