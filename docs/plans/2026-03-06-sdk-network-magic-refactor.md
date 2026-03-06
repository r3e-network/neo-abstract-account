# SDK Network Magic Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove repeated network-magic lookup logic from SDK deploy and validation scripts by extending the shared RPC helper.

**Architecture:** Add one small `getNetworkMagic` helper to `sdk/js/tests/rpc.js` that reads protocol network magic through either `getVersion()` or `getversion`, then throws a caller-supplied error when the network cannot be resolved. Rebind the affected scripts to use it directly or through their existing RPC helper imports.

**Tech Stack:** Node.js, `node:test`, Neon JS.

### Task 1: Add failing tests
**Files:**
- Modify: `sdk/js/tests/rpcHelpers.unit.test.js`
- Modify: `sdk/js/tests/sharedRpcHelpersScripts.unit.test.js`

### Task 2: Extend shared RPC helper
**Files:**
- Modify: `sdk/js/tests/rpc.js`

### Task 3: Rebind scripts
**Files:**
- Modify: `sdk/js/tests/deploy.js`
- Modify: `sdk/js/tests/deploy_mainnet.js`
- Modify: `sdk/js/tests/deploy_testnet.js`
- Modify: `sdk/js/tests/aa_testnet_integration_check.js`
- Modify: `sdk/js/tests/aa_testnet_update.js`
- Modify: `sdk/js/tests/aa_testnet_negative_meta_validate.js`
- Modify: `sdk/js/tests/aa_testnet_full_validate.js`
- Modify: `sdk/js/tests/aa_testnet_max_transfer_validate.js`
- Modify: `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`
- Modify: `sdk/js/tests/test-evm-meta-tx.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && npm test`
- `node --check sdk/js/tests/rpc.js` plus touched scripts
- `git diff --check`
