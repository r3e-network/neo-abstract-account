# Core Architecture

This page mirrors the repository architecture explainer so the frontend docs bundle has a clear component-level view of the system.

## 1. Component Map

```mermaid
flowchart LR
  User[User / Signer / Operator]
  Browser[Frontend Workspace]
  Wallet[Neo Wallet or EVM Wallet]
  Drafts[Local Store / Supabase Draft Store]
  Relay[Optional Relay + Signed Operator APIs]
  Master[UnifiedSmartWallet Master Contract]
  Target[Target Contract]

  User --> Browser
  Browser --> Wallet
  Browser --> Drafts
  Browser --> Relay
  Browser --> Master
  Relay --> Master
  Master --> Target
  Oracle --> Master
```

The Neo N3 Abstract Account system is a **policy-gated** smart contract wallet design with one shared execution engine and deterministic per-account verify addresses.

## 2. Verification Pipeline

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

The hardened rule blocks direct proxy-signed external token transfers. The canonical runtime entrypoints are `executeUnified` and `executeUnifiedByAddress`.

## 3. Application Execution Pipeline

```mermaid
flowchart TD
  Entry[AA wrapper entrypoint] --> Load[Load account roles and policy state]
  Load --> RoleCheck{Threshold / verifier satisfied?}
  RoleCheck -- No --> RejectA[Abort unauthorized call]
  PolicyCheck -- No --> RejectC[Abort policy violation]
  PolicyCheck -- Yes --> LimitCheck{Transfer limit OK?}
  LimitCheck -- No --> RejectD[Abort amount violation]
  LimitCheck -- Yes --> CallTarget[Contract.Call target]
  CallTarget --> Return[Return result to caller]
```

## 4. Contract File Map

| File | Responsibility |
| --- | --- |
| `contracts/AbstractAccount.cs` | Top-level entrypoints and shared glue |
| `contracts/AbstractAccount.AccountLifecycle.cs` | Account creation and address binding |
| `contracts/AbstractAccount.StorageAndContext.cs` | Storage normalization and execution locks |
| `contracts/AbstractAccount.ExecutionAndPermissions.cs` | Policy checks and target execution |
| `contracts/AbstractAccount.MetaTx.cs` | EIP-712 verification and signer recovery |
| `contracts/AbstractAccount.Admin.cs` | Role and threshold governance |
| `contracts/AbstractAccount.Upgrade.cs` | Deployer-only update path |

## Matrix Naming Layer

The `.matrix` naming layer remains outside the AA master contract trust boundary. Registration can be batched in the same transaction as AA creation, but the domain itself is treated as a human-readable discovery layer rather than a direct authority primitive.
