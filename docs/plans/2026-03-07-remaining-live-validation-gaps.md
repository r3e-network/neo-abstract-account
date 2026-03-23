# Remaining Live Validation Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining README live-validation gaps for threshold `> 1` multisig, custom verifier flows, dome/oracle activation, and concurrency/load behavior.

**Architecture:** Keep the hardened contract unchanged unless the validations expose a real contract bug. Use dedicated, isolated testnet validator scripts for each remaining scenario so failures stay local, and promote only stable scripts into the shared validation runner after they pass repeatedly.

**Tech Stack:** Node.js, `@r3e/neo-js-sdk`, ethers, Neo N3 testnet, existing SDK shared helpers, GitHub Actions, Markdown docs

### Task 1: Prove threshold `> 1` mixed multisig on testnet

**Files:**
- Create: `sdk/js/tests/aa_testnet_threshold2_validate.js`
- Create: `sdk/js/tests/thresholdMultisigScript.unit.test.js`
- Modify: `sdk/js/package.json`
- Modify: `README.md`

**Step 1: Write the failing tests**
- Assert the new validator script exists, uses shared helpers, and is exposed through `package.json`.
- Add assertions that the script creates a dedicated threshold-2 account and proves a mixed Neo + EVM authorization path.

**Step 2: Run test to verify it fails**
Run: `cd sdk/js && npm test -- --test-name-pattern 'threshold-2'`
Expected: FAIL because the script and package script do not exist yet.

**Step 3: Write minimal implementation**
- Create a dedicated validator script that bootstraps a new account with threshold `1`, raises admins to threshold `2`, then proves a mixed-signature flow using an owner witness plus one EVM signer.
- Prefer a self-target method whose args encodings are already known-good.
- Log txids and postconditions explicitly.

**Step 4: Run test to verify it passes**
Run: `cd sdk/js && npm test -- --test-name-pattern 'threshold-2'`
Expected: PASS

**Step 5: Run live validation**
Run: `cd sdk/js && TEST_WIF=... AA_HASH_TESTNET=... node tests/aa_testnet_threshold2_validate.js`
Expected: PASS with a JSON summary and txids.

### Task 2: Prove custom verifier flows on testnet

**Files:**
- Create: `verifiers/AllowAllVerifier/AllowAllVerifier.csproj`
- Create: `verifiers/AllowAllVerifier/AllowAllVerifier.cs`
- Create: `sdk/js/tests/aa_testnet_custom_verifier_validate.js`
- Create: `sdk/js/tests/customVerifierScript.unit.test.js`
- Modify: `sdk/js/package.json`
- Modify: `README.md`

**Step 1: Write the failing tests**
- Assert the dedicated verifier project exists and exports a `verify(ByteString accountId)` method.
- Assert the validator script exists and is wired into `package.json`.

**Step 2: Run test to verify it fails**
Run: `cd sdk/js && npm test -- --test-name-pattern 'custom verifier'`
Expected: FAIL because the verifier project and validator script do not exist.

**Step 3: Write minimal implementation**
- Create a standalone verifier project rather than piggybacking on `contracts/AbstractAccount.csproj`.
- Build and deploy the verifier on testnet.
- Bind it through `setVerifierContractByAddress`.
- Prove that a caller who is no longer in the native admin set can still execute an otherwise-admin mutation through the custom verifier path, while runtime restrictions still apply.

**Step 4: Run tests to verify they pass**
Run: `cd sdk/js && npm test -- --test-name-pattern 'custom verifier'`
Expected: PASS

**Step 5: Run live validation**
Run: `cd sdk/js && TEST_WIF=... AA_HASH_TESTNET=... node tests/aa_testnet_custom_verifier_validate.js`
Expected: PASS with verifier deploy txid, deployed hash, bind txid, and mutation proof.

### Task 3: Prove dome/oracle activation on testnet

**Files:**
- Create: `sdk/js/tests/aa_testnet_dome_oracle_validate.js`
- Create: `sdk/js/tests/domeOracleScript.unit.test.js`
- Modify: `sdk/js/package.json`
- Modify: `README.md`

**Step 1: Write the failing tests**
- Assert the dome/oracle validator exists and uses shared helpers.
- Assert the package script is exposed.

**Step 2: Run test to verify it fails**
Run: `cd sdk/js && npm test -- --test-name-pattern 'dome oracle'`
Expected: FAIL because the script is missing.

**Step 3: Write minimal implementation**
- Use a disposable account with a very short dome timeout.
- Configure dome accounts, set a known oracle URL, wait until the timeout elapses, request activation, and prove the oracle-gated path unlocks only after the callback result is accepted.
- If public oracle infra is too unstable, add a clearly documented manual prerequisite and keep the script operator-driven.

**Step 4: Run tests to verify they pass**
Run: `cd sdk/js && npm test -- --test-name-pattern 'dome oracle'`
Expected: PASS

**Step 5: Run live validation**
Run: `cd sdk/js && TEST_WIF=... AA_HASH_TESTNET=... node tests/aa_testnet_dome_oracle_validate.js`
Expected: PASS with activation request txid and callback/unlock evidence.

### Task 4: Define a concurrency/load validation harness

**Files:**
- Create: `sdk/js/tests/aa_testnet_concurrency_validate.js`
- Create: `sdk/js/tests/concurrencyScript.unit.test.js`
- Modify: `sdk/js/package.json`
- Modify: `README.md`

**Step 1: Write the failing tests**
- Assert the concurrency validator exists and the package script is exposed.

**Step 2: Run test to verify it fails**
Run: `cd sdk/js && npm test -- --test-name-pattern 'concurrency'`
Expected: FAIL because the script is missing.

**Step 3: Write minimal implementation**
- Create a controlled, low-cost harness that launches a bounded set of parallel simulations and, optionally, a small number of serialized transactions.
- Record collision behavior, nonce consistency, and whether policy enforcement stays deterministic.
- Prefer simulations first; avoid destructive write storms.

**Step 4: Run tests to verify they pass**
Run: `cd sdk/js && npm test -- --test-name-pattern 'concurrency'`
Expected: PASS

**Step 5: Run live validation**
Run: `cd sdk/js && TEST_WIF=... AA_HASH_TESTNET=... node tests/aa_testnet_concurrency_validate.js`
Expected: PASS with summary metrics and no inconsistent nonce/policy results.
