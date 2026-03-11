# Neo Abstract Account Transaction Execution Flow
# Neo 抽象账户交易执行流程

## Complete Flow: From Verify to ExecuteUnified
## 完整流程：从 Verify 到 ExecuteUnified

### Phase 1: Transaction Construction (Frontend/SDK)
### 阶段1：交易构造（前端/SDK）

**Step 1: User Signs EIP-712 Typed Data**
**步骤1：用户签署 EIP-712 类型化数据**

```javascript
// Frontend code (metaTx.js:156-184)
const typedData = buildMetaTransactionTypedData({
  chainId: 894710606,
  verifyingContract: aaContractHash,
  accountAddressScriptHash,
  targetContract,
  method,
  argsHashHex,
  nonce,
  deadline
});

// User signs with EVM wallet (MetaMask, etc.)
const signature = await walletService.signTypedDataWithEvm(typedData);
const publicKey = recoverPublicKeyFromTypedDataSignature({ typedData, signature });
```

**Step 2: Build Transaction Script**
**步骤2：构造交易脚本**

The transaction script is built to call `ExecuteUnifiedByAddress`:

```javascript
const invocation = buildExecuteUnifiedByAddressInvocation({
  aaContractHash,
  accountAddressScriptHash,
  evmPublicKeyHex: publicKey,
  targetContract,
  method,
  methodArgs,
  argsHashHex,
  nonce,
  deadline,
  signatureHex: signature
});

// This creates a script that calls:
// AAContract.ExecuteUnifiedByAddress(
//   accountAddress,      // Hash160
//   [publicKey],         // Array of ByteArray (uncompressed EVM public keys)
//   targetContract,      // Hash160
//   method,              // String
//   methodArgs,          // Array
//   argsHash,            // ByteArray (32 bytes)
//   nonce,               // Integer
//   deadline,            // Integer
//   [signature]          // Array of ByteArray (64-byte ECDSA signatures)
// )
```

**Step 3: Add Neo Witness (Optional - for Relayer)**
**步骤3：添加 Neo 见证（可选 - 用于中继器）**

If using a relayer to pay gas fees, add Neo witness:

```javascript
transaction.signers = [
  { account: relayerScriptHash, scopes: 'CalledByEntry' }
];
transaction.witnesses = [
  { invocationScript: relayerSignature, verificationScript: relayerScript }
];
```


### Phase 2: Verification Phase (Transaction Validation)
### 阶段2：Verification 阶段（交易验证）

**When**: Transaction enters the memory pool
**何时**：交易进入内存池时

**What Happens**:
**发生了什么**：

1. **Neo Node Calls Verify Method**
   **Neo 节点调用 Verify 方法**
   
   - If transaction has Neo witnesses (e.g., relayer signature), Neo node calls the verification script
   - For Abstract Account, the deterministic proxy script calls `Verify(accountId)`
   - 如果交易有 Neo 见证（例如中继器签名），Neo 节点调用验证脚本
   - 对于抽象账户，确定性代理脚本调用 `Verify(accountId)`

2. **Verify Method Checks Neo Signatures ONLY**
   **Verify 方法只检查 Neo 签名**
   
   ```csharp
   // AbstractAccount.AccountLifecycle.cs:66-113
   public static bool Verify(ByteString accountId)
   {
       if (Runtime.Trigger == TriggerType.Verification)
       {
           // Check if relayer has valid Neo signature
           // 检查中继器是否有有效的 Neo 签名
           bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
           if (isAdmin) return true;
           
           // ... check managers, dome accounts
       }
       return false;
   }
   ```

3. **IMPORTANT: EVM Signatures Are NOT Verified Here**
   **重要：EVM 签名不在此处验证**
   
   - EVM signatures are in the transaction script parameters (Application data)
   - Verification phase cannot access Application data
   - EVM 签名在交易脚本参数中（Application 数据）
   - Verification 阶段无法访问 Application 数据

4. **Two Scenarios**:
   **两种场景**：
   
   **Scenario A: With Relayer (Recommended)**
   **场景 A：使用中继器（推荐）**
   - Relayer's Neo signature satisfies `CheckNativeSignatures`
   - Verify returns `true`
   - Transaction enters memory pool
   - 中继器的 Neo 签名满足 `CheckNativeSignatures`
   - Verify 返回 `true`
   - 交易进入内存池
   
   **Scenario B: Pure EVM (No Relayer)**
   **场景 B：纯 EVM（无中继器）**
   - No Neo witnesses attached
   - Verify returns `false`
   - Transaction is REJECTED from memory pool
   - 没有附加 Neo 见证
   - Verify 返回 `false`
   - 交易被拒绝进入内存池
   
   **Solution**: Must use a relayer or add the account address itself as a signer with a custom verification script
   **解决方案**：必须使用中继器或将账户地址本身作为签名者添加自定义验证脚本


### Phase 3: Application Phase (Transaction Execution)
### 阶段3：Application 阶段（交易执行）

**When**: Transaction is included in a block and executed
**何时**：交易被打包到区块并执行时

**What Happens**:
**发生了什么**：

**Step 1: Transaction Script Executes**
**步骤1：交易脚本执行**

```
Transaction Script:
  PUSH accountAddress
  PUSH [evmPublicKey]
  PUSH targetContract
  PUSH method
  PUSH methodArgs
  PUSH argsHash
  PUSH nonce
  PUSH deadline
  PUSH [signature]
  PUSH "executeUnifiedByAddress"
  PUSH aaContractHash
  SYSCALL System.Contract.Call
```

This calls: `AAContract.ExecuteUnifiedByAddress(...)`

**Step 2: ExecuteUnified Verifies EVM Signatures**
**步骤2：ExecuteUnified 验证 EVM 签名**

```csharp
// AbstractAccount.ExecutionAndPermissions.cs / AbstractAccount.MetaTx.cs unified runtime path
public static object ExecuteUnifiedByAddress(
    UInt160 accountAddress,
    List<ByteString> uncompressedPubKeys,  // EVM public keys
    UInt160 targetContract,
    string method,
    object[] args,
    ByteString argsHash,
    BigInteger nonce,
    BigInteger deadline,
    List<ByteString> signatures)           // EVM signatures
{
    ByteString accountId = ResolveAccountIdByAddress(accountAddress);
    return ExecuteUnified(accountId, targetContract, 
                                 method, args, argsHash, nonce, deadline, signatures);
}
```


**Step 3: ExecuteUnifiedInternal - EIP-712 Signature Verification**
**步骤3：ExecuteUnifiedInternal - EIP-712 签名验证**

```csharp
// AbstractAccount.MetaTx.cs:105-186
private static object ExecuteMetaTxInternal(...)
{
    // 1. Validate inputs
    AssertAccountExists(accountId);
    ExecutionEngine.Assert(uncompressedPubKeys.Count == signatures.Count, "Mismatched pubkeys and signatures");
    
    // 2. Rebuild EIP-712 typed data digest
    byte[] domainSeparator = BuildDomainSeparator(Runtime.GetNetwork(), Runtime.ExecutingScriptHash);
    byte[] structHash = BuildMetaTxStructHash(accountAddress, targetContract, method, argsHash, nonce, deadline);
    byte[] typedDataPayload = ConcatBytes(new byte[] { 0x19, 0x01 }, domainSeparator, structHash);
    
    // 3. Verify each EVM signature using ECDSA (secp256k1/Keccak256)
    UInt160[] recoveredSigners = new UInt160[signatures.Count];
    for (int i = 0; i < signatures.Count; i++)
    {
        ECPoint compressedPubKey = CompressPubKey(uncompressedPubKeys[i]);
        
        // THIS IS WHERE EVM SIGNATURE VERIFICATION HAPPENS
        // 这里是 EVM 签名验证发生的地方
        bool isValid = CryptoLib.VerifyWithECDsa(
            typedDataPayload,
            compressedPubKey,
            signatures[i],
            NamedCurveHash.secp256k1Keccak256  // EVM curve
        );
        ExecutionEngine.Assert(isValid, "Invalid EIP-712 signature");
        
        // Recover EVM address from public key
        // 从公钥恢复 EVM 地址
        recoveredSigners[i] = DeriveEthAddress(uncompressedPubKeys[i]);
    }
    
    // 4. Increment nonce to prevent replay
    IncrementNonce(accountId);
    
    // 5. Check permissions using CheckMixedSignatures
    // 使用 CheckMixedSignatures 检查权限
    CheckPermissionsAndExecute(accountId, recoveredSigners, targetContract, method, args);
    
    // ... continue to actual contract call
}
```


**Step 4: CheckPermissionsAndExecute Calls CheckMixedSignatures**
**步骤4：CheckPermissionsAndExecute 调用 CheckMixedSignatures**

```csharp
// AbstractAccount.ExecutionAndPermissions.cs:95-120
private static void CheckPermissionsAndExecute(
    ByteString accountId, 
    UInt160[] verifiedSigners,  // EVM addresses recovered from signatures
    UInt160 targetContract, 
    string method, 
    object[] args)
{
    // Get meta-tx context (EVM signers)
    UInt160[] explicitSigners = verifiedSigners;
    
    if (explicitSigners != null && explicitSigners.Length > 0)
    {
        // THIS IS WHERE CHECKMIXEDSIGNATURES IS CALLED
        // 这里是 CheckMixedSignatures 被调用的地方
        
        // Check if EVM signers + Neo witnesses satisfy admin threshold
        // 检查 EVM 签名者 + Neo 见证是否满足 admin 阈值
        bool isAdmin = CheckMixedSignatures(
            GetAdmins(accountId), 
            GetAdminThreshold(accountId), 
            verifiedSigners  // Pass recovered EVM addresses
        );
        
        // Check managers
        bool isManager = CheckMixedSignatures(
            GetManagers(accountId), 
            GetManagerThreshold(accountId), 
            verifiedSigners
        );
        
        if (isAdmin || isManager)
        {
            UpdateLastActiveTimestamp(accountId);
            return;  // Authorization successful
        }
        
        // ... check dome accounts
    }
    
    ExecutionEngine.Assert(false, "Unauthorized");
}
```


**Step 5: CheckMixedSignatures - Unified Threshold Check**
**步骤5：CheckMixedSignatures - 统一阈值检查**

```csharp
// AbstractAccount.ExecutionAndPermissions.cs:281-315
private static bool CheckMixedSignatures(
    List<UInt160> roles,      // [N3_Admin, EVM_Admin]
    int threshold,            // 2
    UInt160[] verifiedSigners // [0x1234...EVM_address]
)
{
    int count = 0;
    for (int i = 0; i < roles.Count; i++)
    {
        bool matched = false;
        
        // 1. Check if role is an EVM signer (from ExecuteUnified)
        // 检查角色是否为 EVM 签名者（来自 ExecuteUnified）
        if (verifiedSigners != null)
        {
            foreach (var signer in verifiedSigners)
            {
                if (roles[i] == signer)  // EVM_Admin matched
                {
                    count++;  // count = 1
                    matched = true;
                    break;
                }
            }
        }
        
        // 2. Check if role has Neo witness (from transaction)
        // 检查角色是否有 Neo 见证（来自交易）
        if (!matched && Runtime.CheckWitness(roles[i]))
        {
            count++;  // If N3_Admin signed transaction, count = 2
        }
    }
    
    return count >= threshold;  // 2 >= 2 → true
}
```

**Example: Mixed Authorization (threshold=2)**
**示例：混合授权（阈值=2）**

- Roles: [N3_Admin, EVM_Admin]
- Threshold: 2
- EVM_Admin signs EIP-712 → verifiedSigners = [EVM_Admin] → count = 1
- N3_Admin signs transaction → Runtime.CheckWitness(N3_Admin) = true → count = 2
- Result: count >= threshold → AUTHORIZED


---

## Complete Flow Summary
## 完整流程总结

### The Key Connection: Transaction Script Bridges Verify and ExecuteUnified
### 关键连接：交易脚本连接 Verify 和 ExecuteUnified

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Transaction Construction (Frontend)                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. User signs EIP-712 with EVM wallet                          │
│ 2. Build transaction script calling ExecuteUnifiedByAddress     │
│ 3. Add relayer's Neo witness (optional)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Verification Phase (Memory Pool Entry)                │
├─────────────────────────────────────────────────────────────────┤
│ Neo Node → Verify(accountId)                                   │
│   ├─ Check relayer's Neo signature (CheckNativeSignatures)    │
│   ├─ EVM signatures NOT verified here (in script params)      │
│   └─ Return: true (if relayer signed) or false (rejected)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Application Phase (Block Execution)                   │
├─────────────────────────────────────────────────────────────────┤
│ Transaction Script Executes:                                   │
│   PUSH params... → CALL ExecuteUnifiedByAddress                │
│                              ↓                                  │
│ ExecuteUnifiedInternal:                                         │
│   ├─ Rebuild EIP-712 digest                                   │
│   ├─ Verify EVM signatures (CryptoLib.VerifyWithECDsa)       │
│   ├─ Recover EVM addresses → verifiedSigners[]               │
│   └─ Call CheckPermissionsAndExecute                          │
│                              ↓                                  │
│ CheckPermissionsAndExecute:                                    │
│   └─ Call CheckMixedSignatures(roles, threshold, verifiedSigners)│
│                              ↓                                  │
│ CheckMixedSignatures:                                          │
│   ├─ Count EVM signatures (from verifiedSigners)             │
│   ├─ Count Neo witnesses (Runtime.CheckWitness)              │
│   └─ Return: (count >= threshold)                            │
└─────────────────────────────────────────────────────────────────┘

```

### Key Insights
### 关键要点

1. **Verify and ExecuteUnified are SEPARATE phases**
   **Verify 和 ExecuteUnified 是分离的阶段**
   - Verify runs in Verification phase (memory pool entry)
   - ExecuteUnified runs in Application phase (block execution)
   - They are connected by the transaction script

2. **Transaction Script is the Bridge**
   **交易脚本是桥梁**
   - Script contains the call to ExecuteUnifiedByAddress
   - Script parameters include EVM signatures and public keys
   - Script execution happens AFTER Verify passes

3. **Two-Layer Signature Verification**
   **两层签名验证**
   - Layer 1 (Verify): Neo signatures only (for memory pool entry)
   - Layer 2 (ExecuteMetaTx): EVM signatures (for authorization)

4. **CheckMixedSignatures Unifies Both**
   **CheckMixedSignatures 统一两者**
   - Counts EVM signatures from ExecuteUnified (verifiedSigners)
   - Counts Neo witnesses from transaction (Runtime.CheckWitness)
   - Single threshold check for both signature types

