# Neo Abstract Account Security Audit

_Date:_ March 11, 2026

## Summary

This document records a focused static security audit of an earlier Neo Abstract Account contract generation together with the fixes applied during remediation. The current production runtime is `UnifiedSmartWalletV3`; this audit is retained as historical security context rather than as the sole description of the current system.

The audit concentrated on the following areas:

- Core account abstraction contract authorization and execution paths
- Meta-transaction verification, replay protection, and signer handling
- Deterministic account-address binding and identity mapping
- Admin mutation flows and privileged self-call boundaries
- Dome/oracle-based inactivity recovery logic
- Custom verifier integration contract interfaces
- Recovery verifier contract initialization and verification semantics

This was a source-level audit and regression-hardening exercise. It was not a formal proof, bytecode-level model check, or external third-party audit.

## Scope

### Core Contract

- predecessor account-abstraction runtime modules that predate `UnifiedSmartWalletV3`

### Recovery Verifiers

- `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs`
- `contracts/recovery/SafeRecoveryVerifier.Fixed.cs`
- `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs`

### Regression Coverage Added

- `sdk/js/tests/securityAudit.unit.test.js`

## Methodology

The review used the following process:

1. Manual inspection of authentication, authorization, replay, upgrade, oracle, and recovery logic.
2. Consistency checks between contract call sites and verifier manifests.
3. Source-level regression tests for each identified issue.
4. Contract rebuilds and artifact regeneration after remediation.
5. Re-running targeted regression tests to confirm fixes.

## Findings and Remediation

### 1. Recovery verifier initialization lacked owner authorization

**Severity:** High

**Affected files:**
- `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs`
- `contracts/recovery/SafeRecoveryVerifier.Fixed.cs`
- `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs`

**Issue:**
The `SetupRecovery(...)` entrypoints allowed verifier state to be initialized without requiring the claimed owner to authenticate the setup operation.

**Risk:**
If a verifier contract were installed for an account, arbitrary parties could initialize or overwrite recovery state and alter ownership or guardian policy assumptions.

**Fix applied:**
- `SetupRecovery(...)` now requires `Runtime.CheckWitness(owner)`.
- `SetupRecovery(...)` now rejects blind reinitialization if recovery state already exists.

**Representative locations:**
- `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs`
- `contracts/recovery/SafeRecoveryVerifier.Fixed.cs`
- `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs`

### 2. Recovery verifier interface did not match wallet expectations

**Severity:** High

**Affected files:**
- `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs`
- `contracts/recovery/SafeRecoveryVerifier.Fixed.cs`
- `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs`
- `contracts/recovery/compiled/*.manifest.json`

**Issue:**
The wallet calls custom verifiers using:
- `verify(accountId)`
- `verifyMetaTx(accountId, signerHashes)`

The recovery verifiers previously exposed only `Verify(UInt160 accountId)` and did not expose `VerifyMetaTx(...)`. This was incompatible with the wallet's `ByteString accountId` model and broke custom-verifier interoperability for meta-transactions.

**Risk:**
Custom verifier installation could fail at runtime or make meta-transaction authorization unusable.

**Fix applied:**
- Verifier boundary methods now accept `ByteString accountId`.
- Added `VerifyMetaTx(ByteString accountId, UInt160[] signerHashes)` to all three recovery verifiers.
- Regenerated recovery manifests and compiled artifacts.

### 3. Meta-transaction custom-verifier handoff allowed duplicate signers

**Severity:** Low

**Affected file:**
- predecessor meta-transaction module from the pre-V3 runtime

**Issue:**
Recovered EVM signers were handed to custom verifiers without deduplication.

**Risk:**
The built-in mixed-signature quorum check was safe, but a naive custom verifier could incorrectly count repeated signers as distinct approvals.

**Fix applied:**
- Added deduplication before the signer array is passed into policy evaluation and meta-tx context storage.

### 4. Dome recovery implicitly unlocked when no oracle URL was configured

**Severity:** Medium

**Affected file:**
- predecessor oracle/recovery module from the pre-V3 runtime

**Issue:**
The dome unlock helper treated a missing oracle URL as implicitly unlocked.

**Risk:**
Operators could believe dome recovery was oracle-gated while actually enabling timeout-only recovery if the oracle URL was absent.

**Fix applied:**
- `IsDomeOracleUnlocked(...)` now returns `false` when no oracle URL is configured.

### 5. Account creator was silently appended to explicit admin sets

**Severity:** Medium

**Affected file:**
- predecessor storage/context module from the pre-V3 runtime

**Issue:**
Account creation silently appended `tx.Sender` to the admin set even when administrators were explicitly provided.

**Risk:**
In sponsored or delegated creation flows, the creator could gain persistent administrative authority unintentionally.

**Fix applied:**
- The sender is only auto-added when no admin set is supplied.
- Explicit admin lists are now respected as authoritative input.

### 6. Proxy verification scope was broader than necessary

**Severity:** Informational / Defense-in-depth

**Affected file:**
- predecessor storage/context module from the pre-V3 runtime

**Issue:**
Proxy-witness verification previously accepted any hardened single-self-call script shape, not only the intended AA execution wrappers.

**Risk:**
While most sensitive methods still performed their own authorization checks, the broader acceptance rule increased future confused-deputy risk if new methods were added without equivalent guarding.

**Fix applied:**
- Added an explicit proxy verification allowlist via `AllowedProxyVerificationMethods`.
- Verification now requires both the hardened script shape and an allowed wrapper-method suffix.

## Files Changed During Remediation

### Core Wallet

- predecessor account-abstraction runtime modules later superseded by `UnifiedSmartWalletV3`

### Recovery Verifiers

- `contracts/recovery/ArgentRecoveryVerifier.Fixed.cs`
- `contracts/recovery/SafeRecoveryVerifier.Fixed.cs`
- `contracts/recovery/LoopringRecoveryVerifier.Fixed.cs`
- `contracts/recovery/compiled/ArgentRecoveryVerifier.*`
- `contracts/recovery/compiled/SafeRecoveryVerifier.*`
- `contracts/recovery/compiled/LoopringRecoveryVerifier.*`

### Tests and Planning Record

- `sdk/js/tests/securityAudit.unit.test.js`
- the current V3 contract/runtime hardening path documented in the main repo docs

## Verification Evidence

The following commands were used to verify the remediated state:

```bash
dotnet build neo-abstract-account.sln -c Release --nologo
cd contracts/recovery && dotnet build ArgentRecoveryVerifier.csproj -nologo
cd contracts/recovery && dotnet build SafeRecoveryVerifier.csproj -nologo
cd contracts/recovery && dotnet build LoopringRecoveryVerifier.csproj -nologo
cd contracts/recovery && bash ./compile_recovery_contracts.sh
cd sdk/js && node --test tests/securityAudit.unit.test.js tests/contractArtifacts.unit.test.js tests/recoveryReadiness.unit.test.js
```

### Verified Results

- Core contract build succeeded.
- Recovery verifier project builds succeeded.
- Recovery verifier artifacts were regenerated successfully.
- Targeted regression suite passed:
  - `25` tests passed
  - `0` tests failed

## Residual Notes

- The core contract build completed without warnings after final remediation.
- Recovery verifier builds still emit nullable/static-analysis warnings in some helper/event declarations. These did not block compilation and were not part of the identified exploitability findings addressed in this remediation pass.
- This audit does not replace an external independent review, integration testing on live networks, or runtime economic stress testing.

## Current Security Posture

After the fixes described here, all identified issues from this audit pass were remediated for that contract generation. For the current V3 runtime, this document should be read alongside the active architecture, plugin-matrix, and relay-validation docs. The remaining recommended next steps are:

- external third-party review,
- broader property-based / adversarial test coverage,
- end-to-end testnet execution for the updated recovery-verifier interface,
- and optional cleanup of remaining nullable warnings in recovery contracts.
