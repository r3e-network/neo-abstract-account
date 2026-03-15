# Neo N3 Abstract Account (ERC-4337 equivalent)

This project contains the comprehensive standard, smart contract implementation, frontend tooling, and SDK for creating and utilizing Abstract Accounts on the Neo N3 blockchain.

Current status note:

- The latest `main` branch is migrating to `UnifiedSmartWalletV3`.
- V3 removes the old role-heavy / dome-heavy core wallet model and replaces it with a minimalist account core plus verifier and hook plugins.
- Older role / dome / `executeUnifiedByAddress` materials below are historical unless explicitly updated to mention V3.

## Features
- **Deterministic V3 Accounts**: Each account is keyed by a 20-byte `accountId` and derives a stable Neo virtual address without deploying per-user wallet logic.
- **Verifier Plugin Authorization**: Bind Web3Auth, TEE, WebAuthn, session keys, multisig, or other verifier plugins per account.
- **Hook Plugin Policy Enforcement**: Attach optional hook plugins for daily limits, token restrictions, credential gates, and post-execution controls.
- **Backup-Owner Escape Hatch**: Every account can define a native Neo backup owner plus timelocked verifier rotation.
- **Cross-Chain EVM Compatibility**: V3 supports secp256k1 / Keccak256 EIP-712 `UserOperation` signatures through the Web3Auth verifier path.
- **Policy-Gated Execution**: New integrations should flow through `executeUserOp(accountId, op)` where nonce handling, verification, hooks, and target execution stay centralized.

## Home Workspace Deployment

The frontend home page now exposes an app-first V3 workspace for loading an account from its deterministic seed or `accountId` hash, building a `UserOperation`, persisting anonymous Supabase drafts, collecting mixed Neo + EVM approvals, and choosing either client-side or relay broadcast. Shared drafts retain the latest 100 activity entries and latest 12 submission receipts.

For a Vercel deployment, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AA_RELAY_URL`, and `VITE_AA_RELAY_RPC_URL`, then apply the Supabase draft migrations in order. Start with `supabase/migrations/20260308_home_operations_workspace.sql`, then apply `supabase/migrations/20260309_shared_draft_collaboration_capability.sql`, `supabase/migrations/20260309_submission_receipts.sql`, `supabase/migrations/20260310_shared_draft_collaboration_cleanup.sql`, `supabase/migrations/20260311_rotate_draft_collaboration_slug.sql`, `supabase/migrations/20260312_scoped_draft_access.sql`, `supabase/migrations/20260313_activity_scope_guards.sql`, and `supabase/migrations/20260314_signed_operator_mutations.sql`. That full chain keeps the public share link read-only, narrows collaborator links to signature-safe writes, and moves operator-only status/relay mutations behind the signed operator mutation server route in `frontend/api/draft-operator.js`.

If you deploy the bundled server routes, keep `SUPABASE_SERVICE_ROLE_KEY` and `AA_RELAY_WIF` on the server, prefer `AA_RELAY_RPC_URL` for the relay backend, pin `AA_RELAY_ALLOWED_HASH` to the intended AA contract, and leave `AA_RELAY_ALLOW_RAW_FORWARD=0` unless you explicitly want raw passthrough in `frontend/api/relay-transaction.js`.
For local setup, start from `frontend/.env.example` and copy the values you need into `frontend/.env.local` or your hosting provider's environment-variable dashboard.

If you want relay submission to request Morpheus sponsorship before broadcasting, also configure the server-side paymaster bridge:

- `MORPHEUS_PAYMASTER_TESTNET_ENDPOINT`
- `MORPHEUS_PAYMASTER_TESTNET_API_TOKEN`
- `MORPHEUS_PAYMASTER_MAINNET_ENDPOINT`
- `MORPHEUS_PAYMASTER_MAINNET_API_TOKEN`
- Optional debug only: `AA_RELAY_INCLUDE_RAW_ERRORS=1`

The relay route now forwards optional paymaster metadata and can request Morpheus paymaster pre-authorization before broadcasting a relay-ready `executeUserOp` or `executeUnifiedByAddress` invocation. Failures are now phase-tagged as `preview`, `paymaster`, `relay`, or `response` so operator logs can separate Morpheus sponsorship errors from on-chain relay failures.

## Canonical Morpheus Network Anchors

When this repo references Morpheus-integrated addresses, treat the following as the current canonical Neo N3 anchors:

| Item | Mainnet | Testnet |
| --- | --- | --- |
| AA core | `0x0466fa7e8fe548480d7978d2652625d4a22589a6` | `0x9cbbfc969f94a5056fd6a658cab090bcb3604724` |
| Morpheus Oracle | `0x017520f068fd602082fe5572596185e62a4ad991` | `0x4b882e94ed766807c4fd728768f972e13008ad52` |
| Morpheus DataFeed | `0x03013f49c42a14546c8bbe58f9d434c3517fccab` | `0x9bea75cf702f6afc09125aa6d22f082bfd2ee064` |
| Oracle callback consumer | `0xe1226268f2fe08bea67fb29e1c8fda0d7c8e9844` | `0x6af95dac2c55d4af01f657c86b83583b6dd2fabe` |
| NeoDIDRegistry | `0x6a51671fd45d61b9536791390f275eb31d07954a` | unpublished in the shared registry |
| MorpheusSocialRecoveryVerifier | `0x975483c2d0928c1ed6da568190b5137463431422` | deployment-specific in current test flows |

Domain rules:

- mainnet AA domain: `aa.morpheus.neo`
- mainnet NeoDID domain: `neodid.morpheus.neo`
- testnet currently has no shared AA / NeoDID NNS aliases

Do not conflate the AA recovery verifier with the independent NeoDID registry:

- `MorpheusSocialRecoveryVerifier` is the AA-specific recovery verifier
- `NeoDIDRegistry` is the independent Morpheus identity / action-ticket registry

For Morpheus / NeoDID production integration, also set:

- `VITE_WEB3AUTH_CLIENT_ID`
- `VITE_WEB3AUTH_NETWORK=sapphire_mainnet`
- `VITE_MORPHEUS_API_BASE_URL=https://neo-morpheus-oracle-web.vercel.app`
- `VITE_MORPHEUS_NEODID_SERVICE_DID=did:morpheus:neo_n3:service:neodid`
- server-only `WEB3AUTH_CLIENT_SECRET`
- server-only `MORPHEUS_API_BASE_URL`

Shared draft metadata is intentionally bounded: the frontend keeps the latest 100 activity entries and the latest 12 submission receipts per draft so long-lived collaboration records do not grow without limit.

### Deployment Checklist

- Apply `supabase/migrations/20260308_home_operations_workspace.sql` before enabling anonymous shared drafts.
- Apply `supabase/migrations/20260309_shared_draft_collaboration_capability.sql` so public share links are read-only and collaborator links carry the write capability.
- Apply `supabase/migrations/20260309_submission_receipts.sql` so append-only submission receipts are persisted for shared drafts.
- Apply `supabase/migrations/20260310_shared_draft_collaboration_cleanup.sql` so fresh installs drop the legacy anonymous write RPC signatures recreated by the receipt migration.
- Apply `supabase/migrations/20260311_rotate_draft_collaboration_slug.sql` so leaked collaborator links can be rotated in place.
- Apply `supabase/migrations/20260312_scoped_draft_access.sql` so collaborator links become signature-only while operator links retain relay/broadcast authority.
- Apply `supabase/migrations/20260313_activity_scope_guards.sql` so collaborator links cannot forge operator-class relay or broadcast activity entries.
- Apply `supabase/migrations/20260314_signed_operator_mutations.sql` so operator-only writes move behind the signed operator mutation flow and direct anon operator RPCs are revoked.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for browser-side anonymous draft persistence.
- Share the normal draft URL for read-only review, the collaborator link for signature collection, and the operator link for relay checks, broadcast, and other operator-only actions. Signer links cannot append operator-class relay or broadcast activity entries.
- Use the Rotate Collaborator Link action when a signer link leaks, and rotate the operator link if an operator-only URL should be invalidated without rebuilding the draft.
- Set `VITE_AA_RELAY_URL`, `VITE_AA_RELAY_RPC_URL`, and server-side `AA_RELAY_WIF` before enabling relay submission flows.
- Set server-only `SUPABASE_SERVICE_ROLE_KEY` so `frontend/api/draft-operator.js` can accept signed operator mutation requests for status changes, relay-preflight persistence, submission receipts, and link rotation.
- Prefer server-side `AA_RELAY_RPC_URL`, pin `AA_RELAY_ALLOWED_HASH` to the intended AA contract, and keep `AA_RELAY_ALLOW_RAW_FORWARD` disabled unless you intentionally want the relay route to forward already-signed raw transactions.
- Set `VITE_AA_EXPLORER_BASE_URL` if you want tx receipts and timeline actions to open your preferred explorer.
- Expect shared draft metadata to retain only the latest 100 activity entries and the latest 12 submission receipts.

### Documentation Map

If you want the clearest end-to-end explanation, read these docs in order:

- **How It Works & Usage Guide** — the full mental model, user roles, and practical usage path
- **Core Architecture** — deterministic verify addresses, the master contract, and execution pipelines
- **Workflow Lifecycle** — how a transaction moves from compose to sign to submit
- **Data Flow & Storage** — what lives in the browser, Supabase, relay, and on-chain boundaries
- **SDK Integration** — runtime variables, relay behavior, and deployment setup
- **Mixed Multi-Sig (N3 + EVM)** — how combined native + EVM signing works in practice
- **Morpheus Private Actions** — NeoDID / Web3Auth integration, session keys, and TEE verifier private actions in `docs/MORPHEUS_PRIVATE_ACTIONS.md`

## Quickstart

### Prerequisites
- `.NET SDK 10`
- `Node.js 22+`

### Install

```bash
cd frontend && npm ci
cd ../sdk/js && npm ci
```

### Test

```bash
dotnet test neo-abstract-account.sln -c Release --nologo
cd frontend && npm test
cd sdk/js && npm test
```

To run the full local verification sequence in one command:

```bash
./scripts/verify_repo.sh
```

### Live Testnet Validation

```bash
cd sdk/js
cp .env.example .env
# fill in TEST_WIF
npm run testnet:validate:dry-run
npm run testnet:validate
```

The runner now executes the current V3 live testnet flow in order:

- `v3_testnet_smoke.js`
- `v3_testnet_plugin_matrix.js`
- `v3_testnet_paymaster_policy.mjs` when `PHALA_API_TOKEN` is available
- `v3_testnet_paymaster_relay.mjs` when `PHALA_API_TOKEN` is available

You can also run the stages individually with:

```bash
npm run testnet:validate:smoke
npm run testnet:validate:plugin-matrix
npm run testnet:validate:paymaster-policy
npm run testnet:validate:paymaster
npm run testnet:validate:report
```

The suite writes:

- JSON artifacts under `sdk/docs/reports/`
- a consolidated markdown acceptance report under `docs/reports/2026-03-14-v3-testnet-validation-suite.md`

### Build

```bash
cd frontend && npm run build
```

## Verified Testnet Status

### V3 Plugin Matrix

The current V3 verifier / hook matrix was revalidated on **Neo N3 testnet** on **March 13, 2026** with live deployments and adversarial negative cases.

Canonical report:

- `docs/reports/2026-03-13-v3-testnet-plugin-matrix.md`

Verified on-chain in that matrix:

- `Web3AuthVerifier`
- `TEEVerifier`
- `WebAuthnVerifier`
- `SessionKeyVerifier`
- `MultiSigVerifier`
- `SubscriptionVerifier`
- `WhitelistHook`
- `DailyLimitHook`
- `TokenRestrictedHook`
- `MultiHook`
- `NeoDIDCredentialHook`

Security outcomes:

- direct external plugin configuration attempts fault
- typed-data tampering faults
- nonce replay faults
- session-key method overreach faults
- subscription overcharge and replay faults
- whitelist bypass attempts fault
- restricted-target access faults
- credential-missing / revoked-credential access faults

Production note:

- `ZKEmailVerifier` is intentionally disabled until a real proof-verification implementation is added. The previous placeholder behavior was not production-safe.

Verified on **Neo N3 testnet** on **March 6, 2026** against hardened contract **`0x5be915aea3ce85e4752d522632f0a9520e377aaf`** (deployment tx **`0x635e75cc321fcb7b0906f6a9c39f9d1b227848e7e56d9648496d7d4df706a984`**) using:
- `sdk/js/tests/aa_testnet_integration_check.js`
- `sdk/js/tests/test-evm-meta-tx.js`
- `sdk/js/tests/aa_testnet_full_validate.js`
- `sdk/js/tests/aa_testnet_negative_meta_validate.js`
- `sdk/js/tests/aa_testnet_max_transfer_validate.js`
- `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`

Additional live authorization simulation confirmed `update` still HALTs for the deployer and FAULTs with `Not Deployer` for a non-deployer signer on the hardened deployment.

Re-validated on **March 7, 2026** against the same hardened deployment with a fresh funded signer. The expanded SDK testnet validation suite completed successfully, covering the core integration flow plus threshold-2 multisig, custom verifier, dome/oracle, concurrency, max-transfer, direct-proxy-spend, and approve/allowance validators after tightening the whitelist-mode postconditions.

On **March 8, 2026**, a fresh validation deployment **`0x2dd3b3776ddccdd56c4969342a3f9b0c5516933c`** (deployment tx **`0xe6b65fb40f5f291ba8cb383428b2dd0bcde3ff0c1a0a62de3216fd748a88f364`**) was used to finish validating the remaining wrapper and asset/token paths under the current branch semantics. That diagnostic instance passed live runs of `aa_testnet_integration_check.js`, `aa_testnet_negative_meta_validate.js`, `aa_testnet_threshold2_validate.js`, `aa_testnet_dome_oracle_validate.js`, `aa_testnet_custom_verifier_validate.js`, `aa_testnet_max_transfer_validate.js`, `aa_testnet_approve_allowance_validate.js`, `aa_testnet_full_validate.js`, and `aa_testnet_concurrency_validate.js`. The direct proxy-signed external spend path remained blocked, which is the expected hardened negative path.

### Security Checklist
- [x] Unauthorized bootstrap account creation is rejected.
- [x] Blacklisted targets are blocked from execution.
- [x] Whitelist-only mode blocks non-whitelisted targets.
- [x] Whitelist-only mode still allows explicitly whitelisted targets.
- [x] Meta-transaction replay with a stale nonce is rejected.
- [x] Expired meta-transaction signatures are rejected.
- [x] Tampered `argsHash` values are rejected.
- [x] Wrong EIP-712 chain ID signatures are rejected.
- [x] Wrong EIP-712 verifying-contract signatures are rejected.
- [x] Mismatched pubkey/signature pairs are rejected.
- [x] Invalid signature lengths are rejected.
- [x] Mismatched signer-array lengths are rejected.
- [x] Negative meta-transaction simulations leave nonce state unchanged.
- [x] Upgrade authorization is restricted to the deployer account.
- [x] Direct proxy-signed external spends are rejected on the hardened deployment.
- [x] Threshold `> 1` multisig execution is live-tested.
- [x] Custom verifier flows are live-tested.
- [x] Dome/oracle activation flows are live-tested.
- [x] Concurrency/load behavior is stress-tested.

### Functionality Checklist
- [x] Create account with deterministic address binding.
- [x] Create account without address and bind it later.
- [x] Read admins by account ID and by address.
- [x] Read managers by account ID and by address.
- [x] Read admin and manager thresholds by ID and by address.
- [x] Resolve account ID from address and address from account ID.
- [x] Read nonce values for account and address paths.
- [x] Compute a 32-byte `argsHash` through the contract.
- [x] Execute calls through `executeUnified` by account ID.
- [x] Execute calls through the canonical `executeUnifiedByAddress` runtime entry by bound address.
- [x] Execute EVM meta-transactions by address.
- [x] Execute EVM meta-transactions by account ID.
- [x] Execute mixed Neo-relayer + EVM-signer flows.
- [x] Set admins and managers through native admin operations.
- [x] Set whitelist, blacklist, and whitelist-mode controls.
- [x] Set max-transfer policy values.
- [x] Prove live max-transfer enforcement on an actual GAS token transfer through `executeUnifiedByAddress`.
- [x] Prove live `approve` / allowance enforcement on a token supporting approvals.

Verification note: live max-transfer enforcement was confirmed with `sdk/js/tests/aa_testnet_max_transfer_validate.js` using the owner as the transaction sender plus the deterministic AA proxy as an additional signer with `CustomContracts` scope limited to the AA contract and GAS, the AA witness bound to `verify(accountId)`, and an explicit `setWhitelistByAddress(..., GAS, true)` step before the external GAS `transfer` path.

Threshold note: on **March 7, 2026**, `sdk/js/tests/aa_testnet_threshold2_validate.js` confirmed a live threshold-2 mixed-signature path against hardened testnet deployment `0x5be915aea3ce85e4752d522632f0a9520e377aaf`. The validator raises the account admin threshold from `1` to `2`, proves owner-only `executeUnifiedByAddress` on `getNonce` FAULTs with `Unauthorized`, then proves `executeUnifiedByAddress` on `getNonce` HALTs with one native Neo witness plus one EIP-712 EVM signer and increments the meta-tx nonce.

Custom verifier note: on **March 7, 2026**, the live hardened deployment at `0x5be915aea3ce85e4752d522632f0a9520e377aaf` was updated via `0xba9c7978b93e4c7c86c775fa8eacd07c9c2ab16249f1a16ffbd74219065d490c` to add manifest permission for verifier `verify` calls. After that update, `sdk/js/tests/aa_testnet_custom_verifier_validate.js` deployed a disposable verifier at `0xfd3de95a8b331d4ea419201ef4d41a2a9b3b43b6`, bound it, removed the owner from the native admin set, proved owner-only direct admin mutation FAULTs with `Unauthorized admin`, proved a proxy-signed direct admin mutation HALTs via the custom verifier path, and proved whitelist restrictions still block non-whitelisted `executeUnifiedByAddress` targets.

Dome/oracle note: on **March 7, 2026**, the live hardened deployment at `0x5be915aea3ce85e4752d522632f0a9520e377aaf` was updated via `0x2478107d07291d1a944262893a60d8139a43dd324447e2cf9acd1b27568e167b`, `0xc995eec63592e0b310a5a363dcdb4ee3b5e1487484bfeb72710b0ffd9377a09e`, `0x8d583c34e5c5b2d0899dbb0b5907884888361e4bf57635fec2381e3218b26fec`, `0x460dabeeed69485b14e3083b0589d5decdd87b6a91cda94179ef55b29aef1a50`, `0xd09902cc493d17fb4b31521965ebc66bc83186ba60586769ebbc7c61bf268e72`, `0x9081787daaa46c843f254141d34b128d983564393c75420910dfe3d3e5f20057`, and `0x164cb9440c203d747ad153f6000b7de3bf88527482306e134afd2dd55c4e61d0` while productionizing the oracle flow. The final validator run in `sdk/js/tests/aa_testnet_dome_oracle_validate.js` succeeded against `https://jsonplaceholder.typicode.com/todos/4|$.completed`, proving pre-timeout access FAULTs with `Dome account not active yet`, post-timeout pre-callback access FAULTs with `Dome account not unlocked by oracle`, the oracle callback flips `isDomeOracleUnlocked` to true, and the dome-gated `executeUnifiedByAddress` path HALTs afterward.

Concurrency note: on **March 7, 2026**, `sdk/js/tests/aa_testnet_concurrency_validate.js` completed a bounded live load pass against hardened testnet deployment `0x5be915aea3ce85e4752d522632f0a9520e377aaf` using **12 parallel simulations** plus **2 serialized live meta-transactions**. The harness proved all pre-write and post-write `executeUnifiedByAddress(..., getNonce, ...)` simulations HALT consistently, all parallel nonce reads agree before and after writes, and the EVM signer nonce advances deterministically from `0` to `1` to `2` across live meta-tx submissions without inconsistent policy or nonce results.

Approve/allowance note: on **March 7, 2026**, `sdk/js/tests/aa_testnet_approve_allowance_validate.js` deployed a disposable approval-capable token at `0x698ad0fb426dfe64ed8c100c75e5f6da4cb9c535`, explicitly whitelisted that token for the AA account, set an AA max-transfer limit of `100` for that token, proved a Neo-style `approve(owner, spender, amount)` within limit HALTs and returns `true`, proved an over-limit approve FAULTs with `Amount exceeds max limit`, and confirmed `allowance(owner, spender)` stays at `100` after the rejected over-limit path.

### Fresh Deploy + Real Update Verification

A second destructive verification pass was completed on **March 6, 2026** against a freshly deployed unique testnet instance **`0x171359751dee7f56ea633586bd070a51c8d60e9c`**.

- Fresh deploy tx: **`0x6ed39853b92ace9bf1a87e0b295aeb8455dd987c391a62c6ec28ef25ed9a9c54`**
- Real update tx: **`0x3390f58a10e2aed726d6b414c57eaf59f92216eed44b825f230cd48f57d77b9e`**
- Post-update validation reran `sdk/js/tests/aa_testnet_integration_check.js`, `sdk/js/tests/test-evm-meta-tx.js`, `sdk/js/tests/aa_testnet_full_validate.js`, `sdk/js/tests/aa_testnet_negative_meta_validate.js`, `sdk/js/tests/aa_testnet_max_transfer_validate.js`, and `sdk/js/tests/aa_testnet_direct_proxy_spend_validate.js`
- Post-update authorization simulation confirmed the deployer `update` path still HALTs and a non-deployer signer still FAULTs with `Not Deployer`

### Legacy Comparison Note

The legacy testnet deployment **`0xf3f706936e37eeaf6bf51b074e55e840f30d993a`** remains a useful comparison baseline only. A raw proxy-signed GAS `transfer` still succeeds there, while the hardened deployment rejects that path and preserves wrapper execution through the canonical AA runtime entrypoints `executeUnified` and `executeUnifiedByAddress` where restrictions are enforced.

## Structure
- `contracts/`: C# Smart Contract implementation of the Master Entry Contract.
- `frontend/`: Vue components demonstrating Account creation and signature workflows.
- `sdk/js/`: JavaScript/TypeScript SDK for dApp integration.
- `docs/`: Protocol design and specification standards.

## Frontend Security Status

As of **March 7, 2026**, `frontend` passes `npm audit --omit=dev` with **0 known production vulnerabilities**.
