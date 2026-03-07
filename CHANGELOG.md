# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.

## [1.0.0] - 2026-03-07

### Added
- Added GitHub Actions CI to validate contract, frontend, and SDK workflows.
- Added a testnet validation runbook and dedicated SDK validators for threshold multisig, custom verifier, dome/oracle, concurrency, and approve/allowance live checks.
- Added standalone auxiliary contracts for live validation: `verifiers/AllowAllVerifier` and `tokens/TestAllowanceToken`.
- Added a repository quickstart covering install, test, and build flows.
- Added regression coverage for hardened docs/runtime expectations, SDK package metadata, contract safety checks, oracle callback handling, and repo verification coverage.

### Changed
- Hardened account storage-key handling to avoid ambiguous account-ID storage paths.
- Reworked proxy verification script checks to count real syscall instructions instead of matching raw byte patterns.
- Aligned internal self-call authorization with the mixed-signature execution model.
- Added manifest permission for custom verifier `verify` calls and completed live verifier-path validation on the hardened testnet deployment.
- Reworked dome/oracle activation handling to use the compiled callback name, parsed oracle filters, broader truth parsing, deterministic URL comparison, and callback diagnostics, then validated the full oracle unlock flow live on testnet.
- Added bounded concurrency/load validation showing deterministic parallel simulation results and serialized meta-tx nonce progression on testnet.
- Added live approve/allowance enforcement validation against a disposable approval-capable token with AA max-transfer policy applied.
- Clarified docs to describe the actual hardened, policy-gated execution surface.
- Stabilized the full live testnet validator's whitelist-mode path so the end-to-end six-script suite passes consistently on the hardened deployment.
- Replaced the frontend's Neon SDK dependency path with local Neo browser helpers.
- Reduced frontend bundle size with lazy-loaded docs/runtime dependencies, async UI panels, and manual chunk splitting.
- Cleaned contract nullable analysis so the contract project now builds with nullable warnings treated as errors.

### Removed
- Removed stale mirrored contract source files from the frontend.
- Removed tracked generated `.NET` build outputs from `contracts/bin` and `contracts/obj`, while preserving intentional smart-contract artifacts.

### Security
- Reduced frontend production audit findings to zero known production vulnerabilities.
- Preserved hardened execution checks around whitelist, blacklist, transfer-limit, approve/allowance limits, verifier-gated authorization, and wrapper-only execution paths.
