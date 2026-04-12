# Neo Abstract Account Transaction Layouts
# Neo 抽象账户交易布局

## Overview: Three Transaction Types
## 概述：三种交易类型

This document shows the exact structure of transactions that invoke runtime verification in the Abstract Account system.

本文档展示了在抽象账户系统中调用运行时验证的交易的确切结构。

---

## Type 1: Pure Neo Transaction (Native Execution)
## 类型1：纯 Neo 交易（原生执行）

**Use Case**: Neo wallet user executes a contract call through their Abstract Account
**使用场景**：Neo 钱包用户通过其抽象账户执行合约调用

### Transaction Structure
### 交易结构

```json
{
  "version": 0,
  "nonce": 123456789,
  "systemFee": "1000000",
  "networkFee": "2000000",
  "validUntilBlock": 5000000,
  
  "signers": [
    {
      "account": "0xabcd...1234",  // Neo user's address (Admin of AA)
      "scopes": "CalledByEntry"
    }
  ],
  
  "script": "0c14...1400...",  // Calls: AAContract.Execute(accountId, targetContract, method, args)
  
  "witnesses": [
    {
      "invocationScript": "0c40...",    // Neo user's ECDSA signature (secp256r1)
      "verificationScript": "0c21...ac" // Neo user's verification script
    }
  ]
}
```

### Script Breakdown (Hex → OpCodes)
### 脚本分解（十六进制 → 操作码）

```
Script calls: AAContract.Execute(accountId, targetContract, method, args)

Hex:
  14 abcd...1234           PUSH accountId (20 bytes)
  14 5678...efgh           PUSH targetContract (20 bytes)
  0c 08 7472616e73666572   PUSH "transfer" (method name)
  11                       PUSH1 (start array)
  14 9999...aaaa           PUSH recipient address
  02 e803                  PUSH 1000 (amount)
  13                       PACK (create args array)
  0c 07 657865637574       PUSH "execute"
  14 aaaa...bbbb           PUSH AA contract hash
  41 627d5b52              SYSCALL System.Contract.Call
```


### Runtime Verification Flow
### 运行时验证流程

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Verification (Transaction enters mempool)         │
│ 阶段1：验证（交易进入内存池）                                │
├─────────────────────────────────────────────────────────────┤
│ 1. Neo VM validates witness[0] (RELAYER's signature)       │
│    → Standard Neo witness verification                     │
│    → NO Abstract Account verification at this stage        │
│                                                             │
│ 2. Relayer is just a courier paying gas fees               │
│    → No Verify() call for the Abstract Account             │
│                                                             │
│ Result: Transaction accepted (relayer signature valid)      │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Application (Transaction executes)                │
│ 阶段2：应用（交易执行）                                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Script executes: AAContract.executeUnifiedByAddress(...) │
│                                                             │
│ 2. Calls ExecuteUnifiedInternal()                           │
│    ┌─────────────────────────────────────────────────┐    │
│    │ EIP-712 Signature Verification                  │    │
│    ├─────────────────────────────────────────────────┤    │
│    │ a) Reconstruct EIP-712 typed data hash:        │    │
│    │    - Domain: chainId, verifyingContract         │    │
│    │    - Message: accountAddress, targetContract,   │    │
│    │      methodHash, argsHash, nonce, deadline      │    │
│    │                                                  │    │
│    │ b) Compute digest = keccak256(typedDataHash)    │    │
│    │                                                  │    │
│    │ c) Recover EVM address:                         │    │
│    │    ECDsaSecp256k1.Verify(digest, signature)     │    │
│    │    → Returns recovered public key               │    │
│    │    → Compute address = keccak256(pubkey)[12:32] │    │
│    │                                                  │    │
│    │ d) Add recovered address to verifiedSigners[]   │    │
│    └─────────────────────────────────────────────────┘    │
│                                                             │
│ 3. Calls CheckMixedSignatures(admins, threshold,           │
│                                verifiedSigners)            │
│    ┌─────────────────────────────────────────────────┐    │
│    │ Unified Threshold Algorithm                     │    │
│    ├─────────────────────────────────────────────────┤    │
│    │ count = 0                                        │    │
│    │ foreach (admin in admins):                       │    │
│    │   if (admin in verifiedSigners):                │    │
│    │     count++  // EVM signature verified          │    │
│    │                                                  │    │
│    │ return (count >= threshold)                      │    │
│    └─────────────────────────────────────────────────┘    │
│                                                             │
│ 4. If authorized, calls Contract.Call(targetContract)      │
│                                                             │
│ Result: Target contract method executed                     │
└─────────────────────────────────────────────────────────────┘
```

**Key Difference**: EVM signatures are verified INSIDE the contract using EIP-712 + secp256k1, NOT via Neo's witness mechanism.

**关键区别**：EVM 签名在合约内部使用 EIP-712 + secp256k1 验证，而不是通过 Neo 的见证机制。

---

## Type 3: Mixed N3+EVM Transaction
## 类型3：混合 N3+EVM 交易

**Use Case**: Abstract Account requires BOTH N3 and EVM signatures (threshold=2)
**使用场景**：抽象账户需要 N3 和 EVM 签名（阈值=2）

### Transaction Structure
### 交易结构

```json
{
  "version": 0,
  "nonce": 555555555,
  "systemFee": "3000000",
  "networkFee": "4000000",
  "validUntilBlock": 5000200,

  "signers": [
    {
      "account": "0xrelayer...hash",  // Relayer (pays gas)
      "scopes": "CalledByEntry"
    },
    {
      "account": "0xneo_admin...hash", // N3 Admin signature
      "scopes": "CalledByEntry"
    }
  ],

  "script": "0c14...1400...",  // Calls: AAContract.executeUnifiedByAddress(...)

  "witnesses": [
    {
      "invocationScript": "0c40...",    // Relayer's signature
      "verificationScript": "0c21...ac"
    },
    {
      "invocationScript": "0c40...",    // N3 Admin's signature
      "verificationScript": "0c21...ac"
    }
  ]
}
```


### Script Breakdown (Hex → OpCodes)
### 脚本分解（十六进制 → 操作码）

```
Script calls: AAContract.executeUnifiedByAddress(
  accountAddressScriptHash,
  evmPublicKeys[],      // Contains EVM public key
  targetContract,
  method,
  args[],
  argsHashHex,
  nonce,
  deadline,
  signatures[]          // Contains EVM signature only
)

Hex:
  14 abcd...1234           PUSH accountAddressScriptHash (20 bytes)

  11                       PUSH1 (array with 1 element - EVM key only)
  0c 41 04aabb...6677      PUSH evmPublicKey (65 bytes)
  13                       PACK

  14 5678...efgh           PUSH targetContract (20 bytes)
  0c 08 7472616e73666572   PUSH "transfer"

  12                       PUSH2
  14 9999...aaaa           PUSH recipient
  02 e803                  PUSH 1000
  13                       PACK

  0c 20 keccak...hash      PUSH argsHashHex (32 bytes)
  02 2a00                  PUSH 42 (nonce)
  03 d2029649              PUSH 1678901234 (deadline)

  11                       PUSH1 (array with 1 element - EVM sig only)
  0c 41 evm...sig          PUSH evmSignature (65 bytes)
  13                       PACK

  0c 16 657865637574654d657461547842794164647265737320
                           PUSH "executeUnifiedByAddress"
  14 aaaa...bbbb           PUSH AA contract hash
  41 627d5b52              SYSCALL System.Contract.Call
```

**Note**: The N3 signature is NOT in the script parameters - it's in witnesses[1].
**注意**：N3 签名不在脚本参数中 - 它在 witnesses[1] 中。


### Runtime Verification Flow
### 运行时验证流程

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Verification (Transaction enters mempool)         │
│ 阶段1：验证（交易进入内存池）                                │
├─────────────────────────────────────────────────────────────┤
│ 1. Neo VM validates witnesses[0] (relayer)                 │
│    → Standard Neo witness verification                     │
│                                                             │
│ 2. Neo VM validates witnesses[1] (N3 Admin)                │
│    → Standard Neo witness verification                     │
│    → N3 signature verified via secp256r1/SHA256            │
│                                                             │
│ Result: Transaction accepted (both N3 signatures valid)     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Application (Transaction executes)                │
│ 阶段2：应用（交易执行）                                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Script executes: AAContract.executeUnifiedByAddress(...) │
│                                                             │
│ 2. Calls ExecuteUnifiedInternal()                           │
│    ┌─────────────────────────────────────────────────┐    │
│    │ EIP-712 Signature Verification                  │    │
│    ├─────────────────────────────────────────────────┤    │
│    │ - Reconstruct typed data hash                   │    │
│    │ - Recover EVM address via secp256k1/Keccak256   │    │
│    │ - Add to verifiedSigners[]                      │    │
│    └─────────────────────────────────────────────────┘    │
│                                                             │
│ 3. Calls CheckMixedSignatures(admins, threshold=2,         │
│                                verifiedSigners)            │
│    ┌─────────────────────────────────────────────────┐    │
│    │ Unified Threshold Algorithm                     │    │
│    ├─────────────────────────────────────────────────┤    │
│    │ count = 0                                        │    │
│    │                                                  │    │
│    │ foreach (admin in admins):                       │    │
│    │   // Check EVM signature                        │    │
│    │   if (admin in verifiedSigners):                │    │
│    │     count++  // EVM Admin found → count=1       │    │
│    │     continue                                     │    │
│    │                                                  │    │
│    │   // Check N3 signature                         │    │
│    │   if (Runtime.CheckWitness(admin)):             │    │
│    │     count++  // N3 Admin found → count=2        │    │
│    │                                                  │    │
│    │ return (count >= 2)  // TRUE: 2 >= 2            │    │
│    └─────────────────────────────────────────────────┘    │
│                                                             │
│ 4. Authorization successful, execute target contract       │
│                                                             │
│ Result: Target contract method executed                     │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight**: CheckMixedSignatures() unifies both verification methods:
- EVM signatures verified via EIP-712 → added to verifiedSigners[]
- N3 signatures verified via Runtime.CheckWitness() → checked against transaction witnesses

**关键洞察**：CheckMixedSignatures() 统一了两种验证方法：
- EVM 签名通过 EIP-712 验证 → 添加到 verifiedSigners[]
- N3 签名通过 Runtime.CheckWitness() 验证 → 对照交易见证检查


---

## Summary Comparison Table
## 总结对比表

| Transaction Type | Verification Phase | Application Phase | Signature Verification Method |
|------------------|-------------------|-------------------|-------------------------------|
| **Type 1: Pure Neo** | Verify() checks N3 witness via Runtime.CheckWitness() | ExecuteUnified() checks N3 witness again | secp256r1 + SHA256 (Neo native) |
| **Type 2: Pure EVM** | Relayer's witness only (no AA verification) | executeUnifiedByAddress() verifies EIP-712 signature | secp256k1 + Keccak256 (EVM) |
| **Type 3: Mixed N3+EVM** | Relayer + N3 Admin witnesses verified | executeUnifiedByAddress() verifies EIP-712 + checks N3 witness | Both methods unified in CheckMixedSignatures() |

| 交易类型 | 验证阶段 | 应用阶段 | 签名验证方法 |
|---------|---------|---------|-------------|
| **类型1：纯 Neo** | Verify() 通过 Runtime.CheckWitness() 检查 N3 见证 | ExecuteUnified() 再次检查 N3 见证 | secp256r1 + SHA256（Neo 原生） |
| **类型2：纯 EVM** | 仅中继器见证（无 AA 验证） | executeUnifiedByAddress() 验证 EIP-712 签名 | secp256k1 + Keccak256（EVM） |
| **类型3：混合 N3+EVM** | 中继器 + N3 管理员见证被验证 | executeUnifiedByAddress() 验证 EIP-712 + 检查 N3 见证 | 两种方法在 CheckMixedSignatures() 中统一 |

---

## Verification Script Generation
## 验证脚本生成

**Question**: How does the user know how to construct the verification script?
**问题**：用户如何知道如何构造验证脚本？

**Answer**: The verification script is **deterministically generated** by the Abstract Account contract when an account is registered. Users don't construct it manually.
**答案**：验证脚本在注册账户时由抽象账户合约**确定性生成**。用户不需要手动构造。

### Proxy Script Template
### 代理脚本模板

From `AbstractAccount.AccountLifecycle.cs:RegisterAccount()`:

```csharp
// Generate deterministic proxy script
byte[] verifyScript = new byte[]
{
    (byte)OpCode.PUSHDATA1, 0x14,  // Push 20 bytes
    // ... accountId bytes (20 bytes) ...
    (byte)OpCode.PUSHDATA1, 0x14,  // Push 20 bytes
    // ... AA contract hash (20 bytes) ...
    (byte)OpCode.SYSCALL,
    // ... System.Contract.Call("verify") ...
};

// Deploy proxy contract at deterministic address
UInt160 accountAddress = Helper.GetContractHash(
    UInt160.Zero,
    nefCheckSum,
    contractName
);
```


### How Users Access Verification Scripts
### 用户如何访问验证脚本

**Method 1: Query from blockchain**
**方法1：从区块链查询**

```javascript
// Query the proxy contract address for an accountId
const accountAddress = await rpcClient.invokeFunction(
  aaContractHash,
  'getAccountAddress',
  [{ type: 'Hash160', value: accountId }]
);

// Get the proxy contract's verification script
const contractState = await rpcClient.getContractState(accountAddress);
const verificationScript = contractState.manifest.abi.methods
  .find(m => m.name === 'verify').script;
```

**Method 2: Use frontend helper**
**方法2：使用前端辅助函数**

The frontend provides `buildExecuteUnifiedByAddressInvocation()` which constructs the entire transaction script automatically.

前端提供 `buildExecuteUnifiedByAddressInvocation()` 函数，自动构造整个交易脚本。

---

## Frontend Helper: buildExecuteUnifiedByAddressInvocation
## 前端辅助函数：buildExecuteUnifiedByAddressInvocation

From `frontend/src/features/operations/metaTx.js`:

```javascript
export function buildExecuteUnifiedByAddressInvocation({
  aaContractHash,
  accountAddressScriptHash,
  evmPublicKeyHex,
  targetContract,
  method,
  methodArgs = [],
  argsHashHex,
  nonce,
  deadline,
  signatureHex,
} = {}) {
  return {
    scriptHash: sanitizeHex(aaContractHash),
    operation: 'executeUnifiedByAddress',
    args: [
      { type: 'Hash160', value: `0x${sanitizeHex(accountAddressScriptHash)}` },
      { type: 'Array', value: [
        { type: 'ByteArray', value: `0x${sanitizeHex(evmPublicKeyHex)}` }
      ]},
      { type: 'Hash160', value: `0x${sanitizeHex(targetContract)}` },
      { type: 'String', value: String(method || '') },
      { type: 'Array', value: methodArgs },
      { type: 'ByteArray', value: `0x${sanitizeHex(argsHashHex)}` },
      { type: 'Integer', value: String(nonce) },
      { type: 'Integer', value: String(deadline) },
      { type: 'Array', value: [
        { type: 'ByteArray', value: `0x${sanitizeHex(signatureHex)}` }
      ]},
    ],
  };
}
```

**Usage Example**:

```javascript
// 1. User signs EIP-712 typed data with MetaMask
const typedData = buildMetaTransactionTypedData({
  chainId: 894710606,
  verifyingContract: aaContractHash,
  accountAddressScriptHash,
  targetContract,
  method: 'transfer',
  argsHashHex,
  nonce: 42,
  deadline: Math.floor(Date.now() / 1000) + 3600,
});

const signature = await ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [evmAddress, JSON.stringify(typedData)],
});

// 2. Build transaction invocation
const invocation = buildExecuteUnifiedByAddressInvocation({
  aaContractHash,
  accountAddressScriptHash,
  evmPublicKeyHex: recoveredPublicKey,
  targetContract,
  method: 'transfer',
  methodArgs: [
    { type: 'Hash160', value: recipientAddress },
    { type: 'Integer', value: '1000' },
  ],
  argsHashHex,
  nonce: 42,
  deadline: typedData.message.deadline,
  signatureHex: signature,
});

// 3. Relayer submits transaction
const tx = await relayer.submitTransaction(invocation);
```


---

## Key Architectural Insights
## 关键架构洞察

### 1. Two-Phase Verification Model
### 1. 两阶段验证模型

```
Verification Phase (Mempool)     Application Phase (Execution)
验证阶段（内存池）                应用阶段（执行）
        │                                │
        ├─ Pure Neo: Verify()            ├─ ExecuteUnified()
        │  checks N3 witness             │  checks N3 witness again
        │                                │
        ├─ Pure EVM: Relayer only        ├─ executeUnifiedByAddress()
        │  (no AA verification)          │  verifies EIP-712 signature
        │                                │
        └─ Mixed: Relayer + N3           └─ executeUnifiedByAddress()
           witnesses verified               verifies EIP-712 + checks N3
```

### 2. Unified Threshold Algorithm (CheckMixedSignatures)
### 2. 统一阈值算法（CheckMixedSignatures）

```csharp
private static bool CheckMixedSignatures(
    List<UInt160> roles,
    int threshold,
    UInt160[] verifiedSigners)
{
    int count = 0;
    foreach (var role in roles)
    {
        // Count EVM signatures (from verifiedSigners[])
        if (verifiedSigners.Contains(role))
        {
            count++;
            continue;
        }
        
        // Count N3 signatures (from transaction witnesses)
        if (Runtime.CheckWitness(role))
        {
            count++;
        }
    }
    return count >= threshold;
}
```

**This single function handles all three transaction types:**
**这个单一函数处理所有三种交易类型：**

- **Pure Neo**: `verifiedSigners[]` is empty, only N3 witnesses counted
- **Pure EVM**: Only `verifiedSigners[]` counted, no N3 witnesses
- **Mixed**: Both `verifiedSigners[]` and N3 witnesses counted

### 3. Cryptographic Separation
### 3. 密码学分离

| Signature Type | Curve | Hash Function | Verification Location |
|----------------|-------|---------------|----------------------|
| **N3 Native** | secp256r1 | SHA256 | Neo VM (Runtime.CheckWitness) |
| **EVM Meta** | secp256k1 | Keccak256 | Contract (ECDsaSecp256k1.Verify) |

| 签名类型 | 曲线 | 哈希函数 | 验证位置 |
|---------|------|---------|---------|
| **N3 原生** | secp256r1 | SHA256 | Neo VM（Runtime.CheckWitness） |
| **EVM 元交易** | secp256k1 | Keccak256 | 合约（ECDsaSecp256k1.Verify） |

---

## Complete Transaction Flow Example
## 完整交易流程示例

### Scenario: Mixed N3+EVM Transaction (threshold=2)
### 场景：混合 N3+EVM 交易（阈值=2）

```
Step 1: User Preparation
步骤1：用户准备
├─ N3 Admin: Has private key for secp256r1 signature
├─ EVM Admin: Has MetaMask wallet for secp256k1 signature
└─ Relayer: Will pay gas fees

Step 2: EVM Signature Collection
步骤2：EVM 签名收集
├─ Frontend calls computeArgsHash(args) → argsHashHex
├─ Frontend builds EIP-712 typed data
├─ EVM Admin signs with MetaMask → signature (65 bytes)
└─ Frontend recovers public key from signature

Step 3: Transaction Construction
步骤3：交易构造
├─ Relayer creates transaction with:
│  ├─ signers[0]: Relayer (pays gas)
│  ├─ signers[1]: N3 Admin (provides N3 signature)
│  ├─ script: executeUnifiedByAddress(...)
│  ├─ witnesses[0]: Relayer's N3 signature
│  └─ witnesses[1]: N3 Admin's N3 signature
└─ EVM signature embedded in script parameters

Step 4: Mempool Validation (Verification Phase)
步骤4：内存池验证（验证阶段）
├─ Neo VM validates witnesses[0] (relayer) ✓
├─ Neo VM validates witnesses[1] (N3 Admin) ✓
└─ Transaction accepted into mempool

Step 5: Execution (Application Phase)
步骤5：执行（应用阶段）
├─ Script calls executeUnifiedByAddress(...)
├─ Contract verifies EIP-712 signature:
│  ├─ Reconstructs typed data hash
│  ├─ Recovers EVM address via secp256k1
│  └─ Adds to verifiedSigners[] → [evmAdminAddress]
├─ Contract calls CheckMixedSignatures(admins=[neoAdmin, evmAdmin], threshold=2):
│  ├─ Check evmAdmin in verifiedSigners[] → count=1 ✓
│  ├─ Check Runtime.CheckWitness(neoAdmin) → count=2 ✓
│  └─ Return true (2 >= 2)
├─ Authorization successful
└─ Execute target contract method

Step 6: Result
步骤6：结果
└─ Transaction confirmed, target contract executed
```

---

## Document Complete
## 文档完成

This document provides complete transaction layouts for all three verification types in the Neo Abstract Account system. Users can reference these structures when constructing transactions or debugging verification issues.

本文档为 Neo 抽象账户系统中的所有三种验证类型提供了完整的交易布局。用户可以在构造交易或调试验证问题时参考这些结构。

**Related Files**:
- Contract: `contracts/AbstractAccount.cs`
- Frontend: `frontend/src/features/operations/metaTx.js`
- Flow Documentation: `docs/TRANSACTION_FLOW.md`
