# SDK Deploy Script Construction Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated contract-management hash and deploy-script construction from the SDK deploy scripts while preserving their current deployment flow.

**Architecture:** Extend `sdk/js/tests/deployHelpers.js` with a shared management hash constant plus small helpers for the common `sc.createScript` deploy path and the ScriptBuilder-based testnet deploy path. Keep fee estimation, signing, and broadcasting logic local to each script.

**Tech Stack:** Node.js, `node:test`, Neon JS.

### Task 1: Add failing tests
**Files:**
- Modify: `sdk/js/tests/deployHelpers.unit.test.js`
- Modify: `sdk/js/tests/sharedDeployHelpersScripts.unit.test.js`

### Task 2: Extend deploy helpers
**Files:**
- Modify: `sdk/js/tests/deployHelpers.js`

### Task 3: Rebind deploy scripts
**Files:**
- Modify: `sdk/js/tests/deploy.js`
- Modify: `sdk/js/tests/deploy_mainnet.js`
- Modify: `sdk/js/tests/deploy_testnet.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/deployHelpers.js sdk/js/tests/deploy.js sdk/js/tests/deploy_mainnet.js sdk/js/tests/deploy_testnet.js`
- `git diff --check`
