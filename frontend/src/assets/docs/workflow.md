# Abstract Account Workflow Lifecycle

The Neo N3 Abstract Account workflow turns user intent into verified on-chain execution through the master contract. After the March 6, 2026 hardening update, deterministic proxy witnesses are only valid for a single top-level self-call back into the Abstract Account contract. That means direct proxy-signed external token transfers are rejected, while wrapper entrypoints such as `execute`, `executeByAddress`, `executeMetaTx`, and `executeMetaTxByAddress` remain the supported execution paths.

## 1. Account Initialization

No per-user contract deployment is required. The user submits configuration to the global master contract and binds a deterministic address.

```mermaid
sequenceDiagram
    actor User as User (dApp/Wallet)
    participant Master as Master Entry Contract (Neo N3)

    User->>Master: createAccountWithAddress(accountId, accountAddress, admins, managers)
    activate Master
    Master->>Master: Ensure accountId is not already registered
    Master->>Master: Verify accountAddress matches verify(accountId)
    Master->>Master: Store roles, thresholds, and limits
    Master-->>User: Emit AccountCreated
    deactivate Master
```

## 2. Standard Native Invocation

Native Neo execution now flows through Abstract Account wrapper methods instead of relying on a raw proxy witness to call an external contract directly.

```mermaid
sequenceDiagram
    actor Signer as Admin / Manager
    participant Node as Neo N3 Node
    participant Proxy as Deterministic Proxy Address
    participant Master as Master Entry Contract
    participant Target as Target Contract

    Signer->>Node: Submit tx targeting executeByAddress(...)
    activate Node

    Note over Node,Proxy: Verification Phase
    Node->>Proxy: Trigger verify(accountId)
    Proxy->>Master: Forward verification context
    activate Master
    Master->>Master: Require single top-level self-call into AA contract
    Master->>Master: Validate witness / threshold / custom verifier
    Master-->>Node: Return true or false
    deactivate Master

    Note over Node,Target: Application Phase
    Node->>Master: Run execute / executeByAddress
    activate Master
    Master->>Master: Enforce whitelist, blacklist, and max-transfer limits
    Master->>Target: Contract.Call(target, method, args)
    Target-->>Master: Result
    Master-->>Node: Return result
    deactivate Master
    deactivate Node
```

> Raw external contract calls signed only by the deterministic proxy are intentionally rejected after hardening.

## 3. Meta-Transaction Workflow

Ethereum users can still sign EIP-712 payloads off-chain while a Neo relayer pays network fees and submits the wrapped AA execution.

```mermaid
sequenceDiagram
    actor EVM as EVM Wallet (MetaMask)
    participant Relayer as Neo Relayer
    participant Master as Master Entry Contract
    participant Target as Target Smart Contract

    EVM->>Relayer: Sign EIP-712 payload for AA wrapper call
    Relayer->>Master: executeMetaTx / executeMetaTxByAddress
    activate Master
    Master->>Master: Rebuild typed-data payload
    Master->>Master: Recover EVM signer and verify nonce/deadline/argsHash
    Master->>Master: Enforce whitelist, blacklist, and transfer policies
    Master->>Target: Contract.Call(target, method, args)
    Target-->>Master: Result
    Master-->>Relayer: Success or fault
    deactivate Master
```
