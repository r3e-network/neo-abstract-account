# Abstract Account Workflow Lifecycle

The workflow of the Neo N3 Abstract Account mimics the intended behavior of Ethereum's ERC-4337, translating generalized intents into validated on-chain operations using a Master Entry Proxy.

## 1. Account Initialization

No code needs to be deployed by a user. The user simply dictates an initialization payload to the global `Master Entry Contract`.

```mermaid
sequenceDiagram
    actor User as User (dApp/Wallet)
    participant Master as Master Entry Contract (Neo N3)
    
    User->>Master: createAccountWithAddress(accountId, accountAddress, admins, managers)
    activate Master
    Master->>Master: Assert: Ensure accountId is not already registered
    Master->>Master: Compute: Verify accountAddress mathematically matches accountId script
    Master->>Master: Storage: Bind Admins and Managers to internal state maps
    Master-->>User: Emit AccountCreated Event
    deactivate Master
```

## 2. Standard Native Invocation

When a user wants to execute a transaction natively through the Neo N3 consensus nodes, the node intercepts the signature verification of the Proxy Address and invokes the Master Contract.

```mermaid
sequenceDiagram
    actor Signer as Admin / Manager
    participant Node as Neo N3 Node (VM)
    participant Proxy as Deterministic Proxy Address
    participant Master as Master Entry Contract
    participant Target as Target Smart Contract (e.g. NEP-17)

    Signer->>Node: Submits Transaction (Target: NEP-17 Transfer)
    activate Node
    
    Note over Node,Proxy: Step 1: Verification Phase
    Node->>Proxy: Trigger: Verification
    Proxy->>Master: Forward Verification Context
    activate Master
    Master->>Master: Extract accountId from executing script
    Master->>Master: Check Custom Verifier (if assigned)
    Master->>Master: Verify Signatures vs Admin/Manager Thresholds
    Master-->>Node: Return true (Valid) or false (Invalid)
    deactivate Master

    Note over Node,Target: Step 2: Execution Phase
    Node->>Proxy: Trigger: Application (if Verification == true)
    Proxy->>Target: Transfer(from, to, amount)
    Target-->>Node: Success
    deactivate Node
```

## 3. Meta-Transaction (Gasless / EVM) Workflow

Users without native Neo GAS can sign an EIP-712 formatted message via MetaMask. A relayer covers the Neo network fees and executes the payload on their behalf.

```mermaid
sequenceDiagram
    actor EVM as EVM Wallet (MetaMask)
    participant Relayer as Backend Relayer (Pays GAS)
    participant Master as Master Entry Contract
    participant Target as Target Smart Contract
    
    EVM->>Relayer: Sign EIP-712 Payload (Off-chain)
    activate Relayer
    Relayer->>Master: executeMetaTx(accountId, target, method, args, signature)
    deactivate Relayer
    
    activate Master
    Master->>Master: ecrecover(EIP-712 Hash, signature) -> evmAddress
    Master->>Master: Verify evmAddress is in Admin/Manager role
    Master->>Master: Enforce Whitelist / Blacklist / Token Limits
    Master->>Target: Contract.Call(target, method, args)
    Target-->>Master: Result
    Master-->>Relayer: Success Event
    deactivate Master
```