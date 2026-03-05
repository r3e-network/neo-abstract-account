# Contract Data Flow & Storage

The Abstract Account model centralizes all state inside the **Master Entry Contract**, partitioning configurations securely using a composite key derivation logic.

## Storage Schema

The contract utilizes a unified internal storage mapping where keys are derived by concatenating a static `Prefix` with a hashed representation of the user's `accountId`.

```mermaid
graph TD
    A[Master Contract Storage] --> B(Admins Map)
    A --> C(Managers Map)
    A --> D(Dome Configuration)
    A --> E(Limits & Restrictions)

    B --> B1[Prefix: 0x01 + sha256(accountId)]
    C --> C1[Prefix: 0x03 + sha256(accountId)]
    D --> D1[Prefix: 0x0E + sha256(accountId)]
    E --> E1[Prefix: 0x09 + sha256(accountId) + targetContract]
```

## Internal Data Flow during Execution

When an execution command (either native or meta-transaction) enters the Master Contract, it flows through a rigid pipeline of isolation, verification, and restriction checks before any external smart contract is called.

```mermaid
flowchart TD
    Start([Transaction Payload Received]) --> HasID{Account ID Valid?}
    
    HasID -- Yes --> ActiveLock{Execution Lock Active?}
    HasID -- No --> Reject([Revert: Invalid ID])
    
    ActiveLock -- Yes --> RejectLock([Revert: Re-entrancy Blocked])
    ActiveLock -- No --> Lock[Apply Execution Lock]
    
    Lock --> CustomVer{Custom Verifier Set?}
    
    CustomVer -- Yes --> CallCustom[Contract.Call(Verifier, 'verify')]
    CallCustom --> AuthResult
    
    CustomVer -- No --> CheckNative[Evaluate M-of-N Thresholds]
    CheckNative --> AuthResult{Authorized?}
    
    AuthResult -- Yes --> CheckBlacklist{Target Blacklisted?}
    AuthResult -- No --> RejectAuth([Revert: Unauthorized])
    
    CheckBlacklist -- Yes --> RejectBL([Revert: Target Blacklisted])
    CheckBlacklist -- No --> CheckWhitelist{Whitelist Enabled?}
    
    CheckWhitelist -- Yes --> InWhitelist{Target in Whitelist?}
    InWhitelist -- No --> RejectWL([Revert: Not Whitelisted])
    InWhitelist -- Yes --> TokenCheck
    CheckWhitelist -- No --> TokenCheck
    
    TokenCheck{Is Token Transfer?}
    TokenCheck -- Yes --> OverLimit{Amount > Max Transfer?}
    OverLimit -- Yes --> RejectLimit([Revert: Exceeds Limit])
    OverLimit -- No --> Execute
    TokenCheck -- No --> Execute
    
    Execute[Dynamic Call to Target Contract] --> Unlock[Remove Execution Lock]
    Unlock --> End([Transaction Success])
```

## Storage Key Prefixes Table

| Prefix Identifier | Hex Value | Purpose |
| :--- | :---: | :--- |
| `AdminsPrefix` | `0x01` | Serialized Array of `UInt160` Admin addresses. |
| `AdminThresholdPrefix` | `0x02` | Integer threshold for Admins. |
| `ManagersPrefix` | `0x03` | Serialized Array of `UInt160` Manager addresses. |
| `ManagerThresholdPrefix` | `0x04` | Integer threshold for Managers. |
| `VerifierContractPrefix` | `0x12` | `UInt160` hash of custom verifier logic contract. |
| `BlacklistPrefix` | `0x09` | Composite Key. Flags banned external contracts. |
| `WhitelistPrefix` | `0x0B` | Composite Key. Flags allowed external contracts. |
| `MaxTransferPrefix` | `0x0C` | Composite Key. Sets hard integer bounds on token txs. |