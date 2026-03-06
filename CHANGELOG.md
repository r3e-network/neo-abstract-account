# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.

## [1.0.0] - 2026-03-07

### Added
- Added GitHub Actions CI to validate contract, frontend, and SDK workflows.
- Added a testnet validation runbook and SDK runner scripts for ordered live validation.
- Added a repository quickstart covering install, test, and build flows.
- Added regression coverage for hardened docs/runtime expectations, SDK package metadata, and contract safety checks.

### Changed
- Hardened account storage-key handling to avoid ambiguous account-ID storage paths.
- Reworked proxy verification script checks to count real syscall instructions instead of matching raw byte patterns.
- Aligned internal self-call authorization with the mixed-signature execution model.
- Clarified docs to describe the actual hardened, policy-gated execution surface.
- Switched the frontend runtime dependency from `@cityofzion/neon-js` to `@cityofzion/neon-core`.
- Reduced frontend bundle size with lazy-loaded docs/runtime dependencies, async UI panels, and manual chunk splitting.
- Cleaned contract nullable analysis so the contract project now builds with nullable warnings treated as errors.

### Removed
- Removed stale mirrored contract source files from the frontend.
- Removed tracked generated `.NET` build outputs from `contracts/bin` and `contracts/obj`, while preserving intentional smart-contract artifacts.

### Security
- Reduced frontend production audit findings to two low-severity upstream issues with no currently available npm fix.
- Preserved hardened execution checks around whitelist, blacklist, transfer-limit, and wrapper-only execution paths.
