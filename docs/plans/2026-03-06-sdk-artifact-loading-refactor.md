# SDK Artifact Loading Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated artifact file reads in deployment and update scripts by extending the shared contract-artifact helper with content-loading support.

**Architecture:** Keep repo-root/path discovery in `sdk/js/src/contractArtifacts.js` and add one small content-loading helper that returns the same paths plus NEF bytes, base64, and manifest text. Rebind the deploy/update scripts to consume it without changing their network-specific deployment logic.

**Tech Stack:** Node.js, `node:test`, Neon JS.

### Task 1: Add failing tests
**Files:**
- Modify: `sdk/js/tests/contractArtifacts.unit.test.js`
- Create: `sdk/js/tests/sharedContractArtifactsScripts.unit.test.js`

### Task 2: Extend the shared artifact helper
**Files:**
- Modify: `sdk/js/src/contractArtifacts.js`

### Task 3: Rebind scripts
**Files:**
- Modify: `sdk/js/tests/deploy.js`
- Modify: `sdk/js/tests/deploy_mainnet.js`
- Modify: `sdk/js/tests/deploy_testnet.js`
- Modify: `sdk/js/tests/aa_testnet_update.js`

### Task 4: Verify and commit
**Files:**
- Modify: touched files above only if required

**Verification commands:**
- `cd sdk/js && npm test`
- `node --check sdk/js/src/contractArtifacts.js sdk/js/tests/deploy.js sdk/js/tests/deploy_mainnet.js sdk/js/tests/deploy_testnet.js sdk/js/tests/aa_testnet_update.js`
- `git diff --check`
