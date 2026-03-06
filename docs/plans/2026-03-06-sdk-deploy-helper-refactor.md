# SDK Deploy Helper Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated deploy-script `invokescript` query construction while preserving current deployment behavior on testnet and mainnet.

**Architecture:** Add a very small shared helper under `sdk/js/tests/` that converts deploy script hex to the expected base64 payload and builds the `rpc.Query` for fee simulation. Keep network-specific fee handling inside each deploy script and only replace the duplicated query-building code.

**Tech Stack:** Node.js, `node:test`, Neon JS.

### Task 1: Add failing helper tests
**Files:**
- Create: `sdk/js/tests/deployHelpers.unit.test.js`
- Create: `sdk/js/tests/sharedDeployHelpersScripts.unit.test.js`

### Task 2: Extract the minimal shared helper
**Files:**
- Create: `sdk/js/tests/deployHelpers.js`

### Task 3: Rebind deploy scripts
**Files:**
- Modify: `sdk/js/tests/deploy.js`
- Modify: `sdk/js/tests/deploy_mainnet.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/deployHelpers.js sdk/js/tests/deploy.js sdk/js/tests/deploy_mainnet.js`
- `git diff --check`
