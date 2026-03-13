# 🚀 Neo N3 Ultimate Abstract Account (AA) Architecture Blueprint V3

## 1. Core Design Philosophy
1. **Global Singleton Pattern**: Users should never bear the 10 NEO contract deployment fee. The entire protocol runs on a single master gateway contract.
2. **Virtual Accounts**: Leveraging NeoVM's dynamic script building, users receive real on-chain addresses capable of sending and receiving assets, but there is **no physically deployed contract** behind that address.
3. **Decoupled Validation & Execution**: The master contract strictly acts as a routing dispatcher. All signature validation (EVM/TEE) and risk control (limits/whitelists) are entirely delegated to independent, stateless plugin contracts.
4. **Intent & Batch Driven**: Breaking the single-invocation limit, the frontend can submit complex, batched transaction scripts directly.

---

## 2. System Topology

The ecosystem consists of **four core layers**:

### 1. Off-chain Infrastructure Layer
*   **Client / Frontend**: This can be Web3Auth (EVM private key), a Morpheus TEE node, or a fully on-chain gaming frontend. It is responsible for generating and signing the `UserOperation`.
*   **Bundler / Relayer**: Because virtual accounts have no native GAS, all transactions are initiated by a Bundler acting as the native Neo `Sender`. The Bundler pays the GAS fee and submits the user's `UserOperation` to the on-chain AA Gateway.

### 2. Core AA Gateway Contract
This is the only place in the entire system where user state is stored. It maintains a global registry: `Map<UInt160 AccountId, AccountState>`.
*   **AccountState Structure**:
    *   `Verifier ID` (Points to the active authentication plugin, e.g., TEE)
    *   `Hook ID` (Points to the active interceptor plugin)
    *   `Backup Owner` (L1 escape hatch cold-wallet address)
    *   `Escape State` (Escape hatch timelock state)
*   **Responsibilities**: Replay protection (Nonce tracking), lifecycle management, routing dispatch, and cross-contract context locking (`VerifyContext`).

### 3. Verifier Plugin Ecosystem
Officially pre-deployed **stateless** singleton smart contracts. The master contract passes signatures to them, and they simply return `True` or `False`.
*   `Web3AuthVerifier`: Contains `ecrecover` logic to parse EIP-712 signatures.
*   `TEEVerifier`: Parses specific hardware-environment proof signatures.
*   `SessionKeyVerifier`: Parses temporary session keys for high-frequency gaming scenarios.

### 4. Hook / Middleware Plugin Ecosystem
Officially pre-deployed stateless policy contracts invoked by the master contract before or after real execution.
*   `DailyLimitHook`: Checks if outgoing NEP-17 assets exceed daily limits.
*   `WhitelistHook`: Ensures the target DeFi contract is on an approved list.

---

## 3. Core Mechanism Design Details

### Mechanism 1: Zero-Deployment Proxy Script (Virtual Address)
How does an undeployed account pass `CheckWitness` authentication in N3?
1. **Address Generation**: The frontend concatenates a minimal NeoVM bytecode snippet: `[PUSH accountId] + [PUSH GatewayHash] + [SYSCALL Contract.Call "Verify"]`. The Hash160 of this bytecode becomes the user's "Virtual Wallet Address."
2. **Context Lock (VerifyContext)**: When a user initiates a transaction, the gateway contract first writes a lock to Storage: `"Allow [Virtual Address] to access [Target Flamingo Contract] in the current block."`
3. **The Perfect Illusion**: The gateway then dynamically invokes the target contract. The target contract internally calls `CheckWitness(Virtual Address)`. The Neo underlying engine triggers the virtual address's bytecode, which callbacks to the gateway's `Verify` interface. The gateway checks the context lock, finds a match, and returns `True`. Authentication passes flawlessly, and **deployment costs are 0**.

### Mechanism 2: Hybrid Replay Protection
To resolve Nonce collisions in distributed concurrent and high-frequency gaming scenarios, we define a global standard:
*   **Sequential Mode (2D Nonce)**: The frontend passes `<Channel ID, Sequence>`. Suitable for DeFi operations requiring strict ordering (e.g., must Approve before Swap).
*   **Unordered Mode (Random Salt)**: The frontend passes a massive random number (UUID). The gateway simply records on-chain that "this Salt has been used." This is extremely suitable for TEE nodes or full-chain game backends sending concurrent proxy requests, **completely eliminating head-of-line blocking**.

### Mechanism 3: L1 Native Escape Hatch (Deadman's Switch)
Abandoning the heavy Oracle deadman's switch, we adopt a minimalist **Time-locked Preemption Model**.
1. **Initiate**: If the TEE service goes down, the user initiates `InitiateEscape` via the gateway using their bound cold wallet, starting a 30-day countdown.
2. **Anti-Theft Cancel**: If the cold wallet is compromised and a hacker triggers the escape, the real user simply initiates **any routine transaction** via the TEE within those 30 days. The gateway silently zeros out the countdown in the background, instantly thwarting the hacker.
3. **Finalize**: After 30 days without interruption, the cold wallet takes full control of the account and can reset the Verifier plugin (e.g., swapping the TEE Verifier for a Native Neo Verifier).

### Mechanism 4: Intent & Batch Execution Engine
The `UserOperation` payload is not just a single `<Target, Method, Args>`. It supports three modes:
1. **Single Call**: A standard contract invocation.
2. **Batch Call**: An array invocation `[Call_1, Call_2, Call_3]` (e.g., Approve + Swap).
3. **Intent Script (The Ultimate Weapon)**: The frontend compiles a NeoVM execution script containing `if/else` logic and post-condition balance assertions. After validating the signature, the gateway uses `DelegateCall` or `System.Contract.Call` to execute this script directly. This represents the highest tier of composability.

---

## 4. End-to-End Transaction Lifecycle

Here is an example of **"A new user swapping NEO to FLM on Flamingo using Web3Auth (EVM Signature)"** to demonstrate the architectural flow:

**Phase 1: Lazy Initialization (Counterfactual Setup)**
1. The user logs into Web3Auth via Twitter, generating an Ethereum private key.
2. The frontend calculates the N3 `AccountId` from the public key and derives the "Virtual Account Address."
3. The user withdraws 100 NEO from an exchange to this "Virtual Account Address." At this point, **no contract or record exists on-chain for this account** (Frictionless Onboarding).

**Phase 2: Assembly & Signature (Client-side)**
1. The frontend constructs the `UserOperation`:
   * `Payload`: [Approve Flamingo, Swap NEO to FLM]
   * `Nonce`: UUID (Salt Mode)
   * `Deadline`: 5 minutes
2. The frontend signs this data (EIP-712) using the Web3Auth Ethereum private key.

**Phase 3: Relaying (Bundler-side)**
1. The frontend sends the signed `UserOp` to the official Bundler server.
2. The Bundler assembles a standard N3 transaction, paying 0.01 GAS as the `Sender`, and calls the gateway's `ExecuteUserOp`.

**Phase 4: Gateway Processing & Execution (On-chain)**
1. **Initialization Interception**: The gateway detects the `AccountId` is unregistered and automatically initializes its state (binding the Web3AuthVerifier and default Hooks).
2. **Replay Interception**: Checks that the UUID Salt is unused, then marks it as used.
3. **Authentication Routing**: The gateway passes the `UserOp` to the `Web3AuthVerifier` singleton. The Verifier runs `ecrecover` to confirm the signature and returns `True`.
4. **Escape Hatch Interception**: Confirms the account is not currently undergoing a cold-wallet takeover countdown.
5. **Policy Routing (Pre-execution)**: The gateway calls `DailyLimitHook` to ensure the transaction doesn't exceed daily withdrawal limits.
6. **Execution & Dispatch**:
   * The gateway locks the `VerifyContext`.
   * The gateway proxy-calls Flamingo for `Approve` and `Swap`.
   * Flamingo's reverse `CheckWitness` passes successfully (thanks to the N3 dynamic proxy script magic).
7. **Policy Routing (Post-execution)**: Execution finishes, the gateway clears the `VerifyContext`.

---

## 5. Architectural Summary & Advantages

This N3 AA architecture is a masterpiece that fully exploits the Neo underlying virtual machine:

* **For Users**: Utterly frictionless, identical to Web2 experiences. No seed phrases, zero deployment fees, supports multi-device concurrent operations (Salt Nonce), and features ultra-simple social/cold-wallet recovery.
* **For Developers/Protocols**: Extreme state consolidation. Once the master contract is deployed, it never needs upgrading (Immutable). To support a new login method (like Apple Passkeys), a developer simply writes a 50-line `PasskeyVerifier.cs`, deploys it, and adds it to the support list.
* **For the L1 Network**: By eliminating heavy Oracle parsing and hundreds of lines of dynamic N3 bytecode assembly, GAS consumption is compressed to the absolute physical limit.

This design serves as a definitive **NEP-level Account Abstraction standard for the Neo ecosystem**, directly rivaling and in some aspects (like zero-deployment and native context masking) surpassing Ethereum's ERC-4337.
