# Web3Auth + NeoDID + AA Gap Audit

Date: 2026-03-12

## Scope

This audit compares the current implementation against the intended design:

- Web3Auth handles user onboarding and social login
- SGX / TEE verifies the identity proof
- NeoDID derives unlinkable nullifiers from the verified identity
- AA recovery and private action execution consume NeoDID tickets without exposing raw social identity

## What Already Matches The Design

The current codebase already implements these design-aligned components:

- Web3Auth is integrated as the DID root in the AA frontend
- a stable `provider_uid` is derived from Web3Auth claims
- NeoDID supports provider-scoped action tickets and recovery tickets
- encrypted parameters are supported with `X25519-HKDF-SHA256-AES-256-GCM`
- AA recovery and AA private-action verifier contracts are deployed on Neo N3 mainnet
- mainnet Oracle / Datafeed production entrypoints remain stable and domain-bound

## Critical Gaps

### 1. JWT verification is not performed inside SGX

Current state:

- Web3Auth `id_token` verification is performed in the AA frontend API route, not in the TEE worker.
- File: `frontend/api/did-verify.js`

Impact:

- This does not satisfy the intended design where SGX should verify JWTs directly against JWKS and derive nullifiers from the verified token inside the enclave.
- The TEE currently receives or derives only `provider_uid`, not a JWT-backed proof object.

Consequence:

- The privacy architecture is split across two trust domains:
  - frontend/server verifies JWT
  - SGX signs tickets
- This is weaker than the target design, where the TEE should be the only component trusted to validate and transform social identity proofs.

### 2. NeoDID worker trusts caller-supplied `provider_uid`

Current state:

- The worker accepts `provider_uid` directly from the request payload after optional confidential payload decryption.
- File: `workers/phala-worker/src/neodid/index.js`

Impact:

- The worker does not independently verify that the claimed `provider_uid` was authenticated by Web3Auth, Twitter, GitHub, Google, email OTP, Binance, or OKX.
- It computes nullifiers from whatever `provider_uid` is supplied.

Consequence:

- This fails the intended model of:
  - verify JWT / OAuth proof in SGX
  - parse provider identity in SGX
  - derive nullifier in SGX
- Instead, the current model is:
  - caller supplies `provider_uid`
  - worker signs based on trusted input

### 3. Active action sessions currently imply admin-grade AA authorization

Current state:

- `UnifiedSmartWallet.AssertIsAdmin(...)` delegates to the configured custom verifier.
- `MorpheusSocialRecoveryVerifier.Verify(...)` returns `true` both for:
  - owner witness
  - active session executor witness

Files:

- `contracts/AbstractAccount.Admin.cs`
- `contracts/recovery/MorpheusSocialRecoveryVerifier.Fixed.cs`
- `contracts/AbstractAccount.ExecutionAndPermissions.cs`

Impact:

- An action-session executor can satisfy the same verifier path used by AA admin mutations.
- This is broader than the intended design, where private action tickets should authorize temporary delegated execution, not full account administration.

Consequence:

- The current verifier interface does not separate:
  - execution authorization
  - admin authorization
- As implemented today, action-session scope is too broad for a production-grade privacy delegation model.

## Functional Gap

### 4. AA frontend recovery invocation used a mismatched parameter type

Current state:

- `requestRecoveryTicket` on-chain expects `expiresAtText` as string.
- The AA frontend service previously passed it as integer.
- File: `frontend/src/services/morpheusDidService.js`

Impact:

- Frontend-triggered recovery requests could fail or behave inconsistently even when the verifier contract itself was healthy.

Status:

- Fixed locally in the current working tree by switching `expiresAt` to string.

## Domain / Registry Status

The following production domains are the intended public entrypoints:

- `oracle.morpheus.neo`
- `pricefeed.morpheus.neo`
- `aa.morpheus.neo`
- `neodid.morpheus.neo`

Status:

- Oracle registry and web network config were updated locally to include AA and NeoDID mainnet domains.

## Required Remediation To Match The Intended Architecture

### A. Move Web3Auth JWT verification into SGX

Recommended target:

- TEE receives `id_token`
- TEE validates JWT against JWKS
- TEE derives stable provider identity internally
- TEE computes `master_nullifier` / `action_nullifier`
- TEE signs the ticket

The frontend should no longer be the trust anchor for identity verification.

### B. Remove raw caller control over `provider_uid`

Recommended target:

- `provider_uid` should be treated as derived evidence, not as trusted input
- the worker should derive it from verified JWT / OAuth / OTP / exchange challenge data

### C. Separate admin authorization from action-session authorization

Recommended target:

- introduce a dedicated verifier surface for admin operations, or
- change the AA / verifier contract boundary so action sessions cannot satisfy `AssertIsAdmin(...)`

Without this separation, private delegated execution remains over-authorized.

### D. Re-validate the deployed mainnet AA verifier after the authorization split

Required after remediation:

- owner recovery still works
- recovered owner can regain durable control safely
- action session can execute only intended AA wrapper flows
- action session cannot mutate admins / managers / verifier / policy surfaces

## Conclusion

The current implementation is partially aligned with the target Web3Auth + NeoDID + SGX design, but it is not yet fully design-consistent.

Most important conclusion:

- The system is not yet at the target security model because JWT verification is outside SGX and action sessions currently sit on top of an overly broad AA verifier boundary.

Until those two issues are fixed, the implementation should be treated as:

- strong prototype / advanced integration,
- not final-form production architecture for the intended privacy and authorization model.
