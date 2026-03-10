# Contract Data Flow & Storage

The Abstract Account model centralizes all on-chain authority inside the **Master Entry Contract**, while using the browser, Supabase, and optional relay services to improve usability and collaboration.

## 1. System Boundaries

The easiest way to understand the system is to separate it into trust boundaries.

```mermaid
flowchart TD
  subgraph Client [Client Environment]
    Browser[Browser / UI]
    Local[(localStorage)]
  end

  subgraph Cloud [Off-Chain Cloud]
    Supabase[(Supabase Drafts)]
    Relay[Relay & Operator APIs]
  end

  subgraph Blockchain [Neo N3 Network]
    Chain[On-Chain AA Contract]
  end

  Browser -->|Offline Fallback| Local
  Browser <-->|Collaboration| Supabase
  Browser -->|API Requests| Relay
  Browser -->|Client Broadcast| Chain
  Relay -->|Relay Submission| Chain

  classDef client fill:#eff6ff,stroke:#93c5fd,stroke-width:2px,color:#1e3a8a
  classDef cloud fill:#f0fdfa,stroke:#5eead4,stroke-width:2px,color:#115e59
  classDef chain fill:#fef2f2,stroke:#fca5a5,stroke-width:2px,color:#991b1b

  class Browser,Local client
  class Supabase,Relay cloud
  class Chain chain
```

Those boundaries do different jobs:

- **Browser** prepares invocations, displays readiness, and holds temporary UI state
- **localStorage** preserves local-only drafts when Supabase is absent
- **Supabase** stores collaborative draft data and scoped links
- **Relay APIs** simulate or submit relay-ready payloads and accept signed operator mutations
- **Neo N3 chain** stores the real account rules and executes the final call

## 2. Data Ownership Matrix

| Boundary | What lives there | Who can mutate it | Why it exists |
| --- | --- | --- | --- |
| On-chain master contract | Admins, managers, thresholds, whitelist / blacklist, verifier, dome, limits, nonces | Authorized AA governance flows | Source of truth for authorization and execution |
| Browser memory | Current workspace state, selected payload mode, active wallet session | Current browser session | Fast UX and staging |
| `localStorage` fallback | Local-only drafts and preferences | Same browser only | Offline / no-Supabase development path |
| Supabase | Draft body, append-only signatures, bounded activity, bounded receipts, scoped slugs | Scope-limited collaboration flows | Shared review and multi-party coordination |
| Relay server | Simulation results in flight, relay signer use, signed operator mutation validation | Server config + signed operator requests | UX helper for relay and operator-only actions |

## 3. Mutation Authority by Boundary

Not every boundary is allowed to mutate the same data.

```mermaid
flowchart TD
  Public([Public Share Link]) -->|View| ReadOnly[Read-Only Access]
  Collaborator([Collaborator Link]) -->|Sign| SigOnly[Signature-Only Append]
  Operator([Operator Link]) -->|Mutate| SignedServer[Signed Operator Route]
  
  SignedServer --> Receipts[Manage Receipts & Status]
  SignedServer --> Rotation[Link Rotation & Preflight]
  
  Chain([On-Chain Execution]) --> Policy[Final Policy Enforcement]

  classDef link fill:#fffbeb,stroke:#fcd34d,stroke-width:2px,color:#92400e
  classDef action fill:#ecfdf5,stroke:#6ee7b7,stroke-width:2px,color:#065f46
  classDef enforce fill:#fef2f2,stroke:#fca5a5,stroke-width:2px,color:#991b1b
  
  class Public,Collaborator,Operator link
  class ReadOnly,SigOnly,SignedServer,Receipts,Rotation action
  class Chain,Policy enforce
```

Practical meaning:

- public viewers can inspect a draft but cannot mutate it
- collaborators can add signatures but cannot append operator-class relay activity
- operators can request higher-sensitivity mutations, but the server still validates signed intent
- the chain remains the final authority for whether the transaction is valid

## 4. Storage Schema On-Chain

The contract utilizes a unified internal storage mapping where keys are derived by concatenating a static prefix with a hashed representation of the user's `accountId`.

```mermaid
flowchart TD
    subgraph Storage [Master Contract Storage]
      A[Unified Storage Map]
    end

    A --> B(Admins Map)
    A --> C(Managers Map)
    A --> D(Dome Configuration)
    A --> E(Limits & Restrictions)

    B -.-> B1[Prefix: 0x01 + sha256]
    C -.-> C1[Prefix: 0x03 + sha256]
    D -.-> D1[Prefix: 0x0E + sha256]
    E -.-> E1[Prefix: 0x09/0x0B/0x0C composite]

    classDef map fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#334155
    classDef prefix fill:#f0fdfa,stroke:#5eead4,stroke-width:1px,stroke-dasharray: 5 5,color:#115e59
    
    class B,C,D,E map
    class B1,C1,D1,E1 prefix
```

## 5. Internal Data Flow During Execution

When an execution command enters the Master Contract, it flows through a rigid pipeline of isolation, verification, and restriction checks before any external smart contract is called.

```mermaid
flowchart TD
    Start([Tx Payload Received]) --> HasID{Account ID Valid?}
    
    HasID -- Yes --> ActiveLock{Execution Lock Active?}
    HasID -- No --> Reject1[Revert: Invalid ID]

    ActiveLock -- Yes --> Reject2[Revert: Re-entrancy Blocked]
    ActiveLock -- No --> Lock[Apply Execution Lock]

    Lock --> CustomVer{Custom Verifier Set?}

    CustomVer -- Yes --> CallCustom[Call verifier.verify]
    CallCustom --> AuthResult{Authorized?}

    CustomVer -- No --> CheckNative[Evaluate Thresholds]
    CheckNative --> AuthResult

    AuthResult -- Yes --> CheckBlacklist{Target Blacklisted?}
    AuthResult -- No --> Reject3[Revert: Unauthorized]

    CheckBlacklist -- Yes --> Reject4[Revert: Target Blacklisted]
    CheckBlacklist -- No --> CheckWhitelist{Whitelist Enabled?}

    CheckWhitelist -- Yes --> InWhitelist{Target in Whitelist?}
    InWhitelist -- No --> Reject5[Revert: Not Whitelisted]
    InWhitelist -- Yes --> TokenCheck{Is Token Transfer?}
    
    CheckWhitelist -- No --> TokenCheck

    TokenCheck -- Yes --> OverLimit{Exceeds Max Limit?}
    OverLimit -- Yes --> Reject6[Revert: Exceeds Limit]
    OverLimit -- No --> Execute[Dynamic Call to Target]
    
    TokenCheck -- No --> Execute

    Execute --> Unlock[Remove Execution Lock]
    Unlock --> End([Transaction Success])

    classDef decision fill:#fffbeb,stroke:#fcd34d,stroke-width:2px,color:#92400e
    classDef terminal fill:#fef2f2,stroke:#fca5a5,stroke-width:2px,color:#991b1b
    classDef success fill:#ecfdf5,stroke:#6ee7b7,stroke-width:2px,color:#065f46
    classDef action fill:#f0fdfa,stroke:#5eead4,stroke-width:2px,color:#115e59
    
    class HasID,ActiveLock,CustomVer,AuthResult,CheckBlacklist,CheckWhitelist,InWhitelist,TokenCheck,OverLimit decision
    class Reject1,Reject2,Reject3,Reject4,Reject5,Reject6 terminal
    class Start,End success
    class Lock,CallCustom,CheckNative,Execute,Unlock action
```

## 6. Relay and Signed Operator Mutation Flow

The relay and operator helper paths exist to improve usability, not to replace the contract.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant S as Supabase
  participant O as Operator API
  participant R as Relay API
  participant C as Neo Chain

  B->>S: Read or append draft collaboration data
  B->>O: Send signed operator mutation request
  O->>S: Persist operator-class change
  B->>R: Request simulation or relay submission
  R->>C: Simulate or submit supported payload
```

## 7. Retention and Practical Limits

The collaborative metadata layer is intentionally bounded:

- latest **100 activity entries** retained
- latest **12 submission receipts** retained
- immutable draft body preserved separately from append-only signature history

This keeps long-lived drafts explainable and reviewable without letting metadata grow without limit.

## 8. Storage Key Prefixes Table

| Prefix Identifier | Hex Value | Purpose |
| :--- | :---: | :--- |
| `AdminsPrefix` | `0x01` | Serialized array of admin addresses. |
| `AdminThresholdPrefix` | `0x02` | Integer threshold for admins. |
| `ManagersPrefix` | `0x03` | Serialized array of manager addresses. |
| `ManagerThresholdPrefix` | `0x04` | Integer threshold for managers. |
| `BlacklistPrefix` | `0x09` | Composite key for blocked external contracts. |
| `WhitelistPrefix` | `0x0B` | Composite key for allowed external contracts. |
| `MaxTransferPrefix` | `0x0C` | Composite key for token transfer caps. |
| `VerifierContractPrefix` | `0x12` | Script hash of custom verifier logic. |


## Matrix Domain Boundary

The `.matrix` contract acts as an external naming boundary. It is not the source of AA authorization state; instead, it provides a human-readable identifier that resolves to the controlling wallet address. The frontend then combines that address with AA admin/manager discovery reads to find the actual bound AA addresses.
