# Neo N3 Abstract Account Architecture

The Neo N3 Abstract Account system is a **policy-gated** smart contract wallet architecture. It decouples a user's logical account identity from any single signing key while still preserving a deterministic Neo address and a strict execution boundary.

## 1. Component Map

The system has one shared execution engine and several supporting boundaries around it.

```mermaid
flowchart LR
  User[User / Signer / Operator]
  Browser[Frontend Workspace]
  Wallet[Neo Wallet or EVM Wallet]
  Drafts[Local Store / Supabase Draft Store]
  Relay[Optional Relay + Signed Operator APIs]
  Master[UnifiedSmartWallet Master Contract]
  Target[Target Contract]
  Oracle[Optional Dome Oracle]

  User --> Browser
  Browser --> Wallet
  Browser --> Drafts
  Browser --> Relay
  Browser --> Master
  Relay --> Master
  Master --> Target
  Oracle --> Master
```

### Why this shape exists

- **No per-user contract deployment:** users do not pay to deploy unique wallet logic
- **Deterministic addressing:** each logical account still has a stable verify address
- **Centralized enforcement:** every supported path runs through the same permission engine
- **Optional off-chain helpers:** draft sharing and relay APIs improve UX without redefining on-chain authority

## 2. Deterministic Addressing

When a user creates an account, no new contract is deployed. Instead, the system derives a deterministic verify script from the master contract hash plus `accountId`, and the resulting script hash becomes the public Neo address for that account.

That address is the user's stable entry point, but verification always routes back into the master contract.

## 3. Verification Pipeline

The verification phase decides whether the transaction is allowed to act as the abstract account.

```mermaid
flowchart TD
  Start[Tx hits Neo node] --> Verify[Node triggers verify(accountId)]
  Verify --> Context[Master contract rebuilds account context]
  Context --> SelfCall{Top-level script is an AA self-call?}
  SelfCall -- No --> Reject1[Reject hardened proxy misuse]
  SelfCall -- Yes --> Auth{Auth path passes?}
  Auth -- No --> Reject2[Reject unauthorized signer / verifier result]
  Auth -- Yes --> Pass[Verification succeeds]
```

The hardened rule is important: direct proxy-signed external token transfers are rejected. Supported entrypoints are the AA wrapper methods such as `execute`, `executeByAddress`, `executeMetaTx`, and `executeMetaTxByAddress`.

## 4. Application Execution Pipeline

After verification succeeds, the AA contract still has to enforce the execution policy before calling any external target.

```mermaid
flowchart TD
  Entry[AA wrapper entrypoint] --> Load[Load account roles and policy state]
  Load --> RoleCheck{Threshold / verifier satisfied?}
  RoleCheck -- No --> RejectA[Abort unauthorized call]
  RoleCheck -- Yes --> DomeCheck{Dome / oracle constraints satisfied?}
  DomeCheck -- No --> RejectB[Abort recovery constraint failure]
  DomeCheck -- Yes --> PolicyCheck{Whitelist / blacklist / method policy OK?}
  PolicyCheck -- No --> RejectC[Abort policy violation]
  PolicyCheck -- Yes --> LimitCheck{Transfer limit OK?}
  LimitCheck -- No --> RejectD[Abort amount violation]
  LimitCheck -- Yes --> CallTarget[Contract.Call target]
  CallTarget --> Return[Return result to caller]
```

This is why the design is safer than a raw proxy witness alone: the application phase is where the contract can enforce policy-gated execution.

## 5. Contract File Map

The implementation is split into focused contract files:

| File | Responsibility |
| --- | --- |
| `contracts/AbstractAccount.cs` | Top-level entrypoints, shared types, and integration glue |
| `contracts/AbstractAccount.AccountLifecycle.cs` | Account creation, address binding, and lifecycle state |
| `contracts/AbstractAccount.StorageAndContext.cs` | Storage-key normalization, execution lock handling, and transient call context |
| `contracts/AbstractAccount.ExecutionAndPermissions.cs` | Core execution path plus whitelist / blacklist / transfer-limit checks |
| `contracts/AbstractAccount.MetaTx.cs` | EIP-712 meta-transaction verification and signer recovery |
| `contracts/AbstractAccount.Admin.cs` | Admin / manager role mutation, thresholds, and governance operations |
| `contracts/AbstractAccount.Oracle.cs` | Dome oracle request, callback, and unlock logic |
| `contracts/AbstractAccount.Upgrade.cs` | Deployer-only update path |

## 6. Authorization Modes

The contract supports several ways to authorize an action, but they all converge into the same protected execution path:

- **Native Neo signers** using admin / manager threshold logic
- **Custom verifier contracts** for pluggable authorization logic
- **EVM EIP-712 signatures** for `executeMetaTx` and `executeMetaTxByAddress`
- **Dome recovery actors** once inactivity and optional oracle conditions are satisfied

Custom verifiers extend authorization, but they do **not** bypass whitelist, blacklist, method policy, or max-transfer enforcement.

## 7. Recovery and Extensibility

The architecture also includes optional recovery and extension surfaces:

- **Dome recovery** for inactivity-based social recovery
- **Oracle gating** for extra real-world unlock conditions
- **Custom verifiers** for bespoke authorization logic
- **Relay-ready meta flows** for EVM-first user experiences

## 8. Security Invariants

The most important invariants to remember are:

1. The deterministic proxy does not replace the master contract; it routes into it.
2. The verification phase and the application phase are separate, and both matter.
3. Direct proxy-signed external spends are intentionally blocked.
4. Shared drafts are collaboration tools, not permission bypasses.
5. Every production path remains bound to the same on-chain policy engine.
