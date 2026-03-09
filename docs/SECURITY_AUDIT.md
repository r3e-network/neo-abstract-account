# 社交恢复合约安全审计报告

**审计日期**: 2026-03-09  
**审计范围**: ArgentRecoveryVerifier, SafeRecoveryVerifier, LoopringRecoveryVerifier  
**严重等级**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | ℹ️ Info

---

## 执行摘要

本次审计发现 **12 个安全问题**，包括：
- 🔴 Critical: 3 个
- 🟠 High: 4 个
- 🟡 Medium: 3 个
- 🟢 Low: 2 个

**主要风险**：
1. 缺少重入保护
2. 签名重放攻击
3. 时间锁绕过可能
4. 访问控制不完整

---

## 1. ArgentRecoveryVerifier 审计

### 🔴 Critical Issues

#### C-1: 缺少重入保护

**位置**: `ExecuteRecovery()`, `InitiateRecovery()`

**问题**:
```csharp
public static void ExecuteRecovery(UInt160 accountId)
{
    var data = Storage.Get(...);
    var request = (RecoveryRequest)StdLib.Deserialize(data);
    
    // 在删除状态前更新所有者 - 重入风险
    Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), request.NewOwner);
    Storage.Delete(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
}
```

**影响**: 恶意合约可能在状态更新期间重入，导致双重恢复

**修复**:
```csharp
public static void ExecuteRecovery(UInt160 accountId)
{
    var data = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
    Assert(data != null, "No recovery request");
    
    var request = (RecoveryRequest)StdLib.Deserialize(data);
    Assert(Runtime.Time >= request.ExecutableAt, "Timelock not expired");
    
    // 先删除状态（Checks-Effects-Interactions 模式）
    Storage.Delete(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
    
    // 再更新所有者
    Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), request.NewOwner);
    
    OnRecoveryExecuted(accountId, request.NewOwner);
}
```

---

#### C-2: 签名重放攻击

**位置**: `InitiateRecovery()`

**问题**: 没有 nonce 或唯一标识符，同一组守护者可以重复发起恢复

**影响**: 攻击者可以重放旧的恢复请求

**修复**: 添加 nonce 机制
```csharp
private const byte PREFIX_NONCE = 0x05;

public static void InitiateRecovery(UInt160 accountId, UInt160 newOwner, UInt160[] approvers, BigInteger nonce)
{
    // 验证 nonce
    BigInteger currentNonce = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_NONCE, accountId));
    Assert(nonce == currentNonce, "Invalid nonce");
    
    // ... 其他验证 ...
    
    // 递增 nonce
    Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);
}
```

---

#### C-3: 缺少守护者签名验证

**位置**: `InitiateRecovery()`

**问题**: 只检查 approvers 是否是守护者，但没有验证他们的签名

**当前代码**:
```csharp
foreach (var approver in approvers)
{
    var isGuardian = Storage.Get(Storage.CurrentContext, Key(PREFIX_GUARDIAN, accountId, approver));
    Assert(isGuardian != null, "Invalid guardian");
}
```

**问题**: 任何人都可以代表守护者发起恢复

**修复**:
```csharp
public static void InitiateRecovery(
    UInt160 accountId, 
    UInt160 newOwner, 
    UInt160[] guardians,
    byte[][] signatures)
{
    BigInteger threshold = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId));
    Assert(guardians.Length >= threshold, "Not enough guardians");
    Assert(guardians.Length == signatures.Length, "Mismatched arrays");
    
    // 构建消息
    var message = Helper.Concat(Helper.Concat(accountId, newOwner), Runtime.Time.ToByteArray());
    var messageHash = CryptoLib.Sha256(message);
    
    // 验证每个守护者的签名
    for (int i = 0; i < guardians.Length; i++)
    {
        var isGuardian = Storage.Get(Storage.CurrentContext, Key(PREFIX_GUARDIAN, accountId, guardians[i]));
        Assert(isGuardian != null, "Invalid guardian");
        
        bool valid = CryptoLib.VerifyWithECDsa(
            messageHash, 
            guardians[i], 
            signatures[i], 
            NamedCurve.secp256r1
        );
        Assert(valid, "Invalid signature");
    }
    
    // ... 创建恢复请求 ...
}
```

---

### 🟠 High Issues

#### H-1: 时间锁可被操纵

**位置**: `InitiateRecovery()`

**问题**:
```csharp
ExecutableAt = Runtime.Time + 172800000 // 硬编码 48h
```

**影响**: 
- 无法根据风险级别调整时间锁
- 紧急情况无法加速恢复

**修复**: 使时间锁可配置
```csharp
private const byte PREFIX_TIMELOCK = 0x06;

[Safe]
public static void SetTimelock(UInt160 accountId, ulong timelockDuration)
{
    var owner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
    Assert(Runtime.CheckWitness(owner), "Not owner");
    Assert(timelockDuration >= 86400000, "Timelock too short"); // 最少 24h
    
    Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId), timelockDuration);
}
```

---

#### H-2: 缺少守护者数量限制

**位置**: `SetupRecovery()`

**问题**: 没有限制守护者数量上限

**影响**: 
- 过多守护者导致 Gas 耗尽
- DoS 攻击向量

**修复**:
```csharp
public static void SetupRecovery(UInt160 accountId, UInt160 owner, UInt160[] guardians, BigInteger threshold)
{
    Assert(guardians.Length >= 3, "Too few guardians");
    Assert(guardians.Length <= 10, "Too many guardians"); // 添加上限
    Assert(guardians.Length >= threshold, "Invalid threshold");
    Assert(threshold >= 2, "Threshold must >= 2");
    
    // ... 其他逻辑 ...
}
```

---


#### H-3: 守护者可以自我移除

**位置**: 缺少守护者管理函数

**问题**: 没有移除守护者的机制，且没有防止守护者自我移除

**修复**: 添加守护者管理
```csharp
public static void RemoveGuardian(UInt160 accountId, UInt160 guardian)
{
    var owner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
    Assert(Runtime.CheckWitness(owner), "Not owner");
    
    // 确保移除后仍满足阈值
    var threshold = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId));
    // 需要计数剩余守护者
    
    Storage.Delete(Storage.CurrentContext, Key(PREFIX_GUARDIAN, accountId, guardian));
}
```

---

#### H-4: 缺少恢复请求过期机制

**位置**: `ExecuteRecovery()`

**问题**: 恢复请求永不过期，可能在很久之后被执行

**修复**:
```csharp
public static void ExecuteRecovery(UInt160 accountId)
{
    var data = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
    Assert(data != null, "No recovery request");
    
    var request = (RecoveryRequest)StdLib.Deserialize(data);
    Assert(Runtime.Time >= request.ExecutableAt, "Timelock not expired");
    Assert(Runtime.Time <= request.ExecutableAt + 604800000, "Request expired"); // 7天过期
    
    // ... 执行恢复 ...
}
```

---

### 🟡 Medium Issues

#### M-1: 事件参数不完整

**位置**: 所有事件

**问题**: 事件缺少关键信息用于链下监控

**修复**:
```csharp
[DisplayName("RecoveryInitiated")]
public static event Action<UInt160, UInt160, UInt160[], BigInteger, ulong> OnRecoveryInitiated;
// 添加: accountId, newOwner, guardians, threshold, executeAt
```

---

#### M-2: 缺少紧急冻结机制

**问题**: 如果检测到恶意恢复，无法紧急冻结账户

**建议**: 添加紧急冻结
```csharp
private const byte PREFIX_FROZEN = 0x07;

public static void EmergencyFreeze(UInt160 accountId)
{
    var owner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
    Assert(Runtime.CheckWitness(owner), "Not owner");
    
    Storage.Put(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId), 1);
    OnEmergencyFreeze(accountId);
}
```

---

#### M-3: 守护者重复检查缺失

**位置**: `SetupRecovery()`

**问题**: 可以添加重复的守护者

**修复**:
```csharp
public static void SetupRecovery(UInt160 accountId, UInt160 owner, UInt160[] guardians, BigInteger threshold)
{
    // 检查重复
    for (int i = 0; i < guardians.Length; i++)
    {
        for (int j = i + 1; j < guardians.Length; j++)
        {
            Assert(!guardians[i].Equals(guardians[j]), "Duplicate guardian");
        }
    }
    
    // ... 其他逻辑 ...
}
```

---

## 2. SafeRecoveryVerifier 审计

### 🔴 Critical Issues

#### C-4: 签名验证完全缺失

**位置**: `ExecuteRecovery()`

**问题**:
```csharp
// 验证签名（简化版，实际需要验证每个签名）
Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), newOwner);
```

**影响**: 任何人都可以执行恢复，完全绕过守护者验证

**修复**: 实现完整签名验证
```csharp
public static void ExecuteRecovery(UInt160 accountId, UInt160 newOwner, byte[][] signatures)
{
    var moduleData = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY_MODULE, accountId));
    var module = (RecoveryModule)StdLib.Deserialize(moduleData);
    
    Assert(module.Enabled, "Module disabled");
    Assert(signatures.Length >= module.Threshold, "Not enough signatures");
    Assert(signatures.Length == module.Guardians.Length, "Mismatched arrays");
    
    // 构建消息
    var message = Helper.Concat(Helper.Concat(accountId, newOwner), Runtime.Time.ToByteArray());
    var messageHash = CryptoLib.Sha256(message);
    
    // 验证每个签名
    BigInteger validSigs = 0;
    for (int i = 0; i < signatures.Length; i++)
    {
        if (CryptoLib.VerifyWithECDsa(messageHash, module.Guardians[i], signatures[i], NamedCurve.secp256r1))
        {
            validSigs++;
        }
    }
    
    Assert(validSigs >= module.Threshold, "Invalid signatures");
    
    Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), newOwner);
    OnRecoveryExecuted(accountId, newOwner);
}
```

---

### 🟠 High Issues

#### H-5: 模块可被任意更新

**位置**: `UpdateModule()`

**问题**: 所有者可以在恢复过程中更改模块配置

**影响**: 可以在恢复进行时提高阈值或移除守护者

**修复**: 添加时间锁或禁止恢复期间更新
```csharp
private const byte PREFIX_PENDING_RECOVERY = 0x05;

public static void UpdateModule(UInt160 accountId, RecoveryModule newModule)
{
    var owner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
    Assert(Runtime.CheckWitness(owner), "Not owner");
    
    // 检查是否有进行中的恢复
    var pendingRecovery = Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId));
    Assert(pendingRecovery == null, "Recovery in progress");
    
    Storage.Put(Storage.CurrentContext, Key(PREFIX_RECOVERY_MODULE, accountId), StdLib.Serialize(newModule));
    OnModuleUpdated(accountId);
}
```

---


## 3. LoopringRecoveryVerifier 审计

### 🟠 High Issues

#### H-6: 守护者列表可被暴力破解

**位置**: `ExecuteRecovery()`

**问题**: 虽然存储哈希，但在恢复时需要提供明文守护者列表

**影响**: 隐私保护有限，攻击者可以通过观察链上交易获取守护者信息

**建议**: 使用零知识证明或承诺方案
```csharp
// 使用 Merkle 树而非简单哈希
private static bool VerifyGuardianMembership(
    UInt160 guardian,
    ByteString merkleRoot,
    byte[][] merkleProof)
{
    // 验证 guardian 在 Merkle 树中
    // 无需暴露完整守护者列表
}
```

---

#### H-7: 签名顺序依赖

**位置**: `ExecuteRecovery()`

**问题**:
```csharp
for (int i = 0; i < signatures.Length && i < guardians.Length; i++)
{
    if (CryptoLib.VerifyWithECDsa(messageHash, guardians[i], signatures[i], NamedCurve.secp256r1))
    {
        validSigs++;
    }
}
```

**影响**: 签名和守护者必须严格对应，容易出错

**修复**: 使用公钥恢复
```csharp
public static void ExecuteRecovery(
    UInt160 accountId, 
    UInt160 newOwner,
    byte[][] signatures)
{
    var storedHash = Storage.Get(Storage.CurrentContext, Key(PREFIX_GUARDIAN_HASH, accountId));
    BigInteger threshold = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId));
    
    var message = Helper.Concat(accountId, newOwner);
    var messageHash = CryptoLib.Sha256(message);
    
    // 从签名恢复公钥
    UInt160[] recoveredGuardians = new UInt160[signatures.Length];
    for (int i = 0; i < signatures.Length; i++)
    {
        recoveredGuardians[i] = RecoverPublicKey(messageHash, signatures[i]);
    }
    
    // 验证恢复的守护者列表哈希
    var computedHash = CryptoLib.Sha256(StdLib.Serialize(recoveredGuardians));
    Assert(storedHash.Equals(computedHash), "Invalid guardians");
    
    Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), newOwner);
}
```

---

### 🟡 Medium Issues

#### M-4: 缺少时间锁

**问题**: Loopring 模式完全没有时间锁保护

**影响**: 一旦守护者签名被收集，恢复立即执行，原所有者无法反应

**建议**: 添加可选时间锁
```csharp
private const byte PREFIX_TIMELOCK_ENABLED = 0x04;

public static void ExecuteRecovery(
    UInt160 accountId, 
    UInt160 newOwner,
    UInt160[] guardians,
    byte[][] signatures,
    ulong timestamp)
{
    // 如果启用时间锁，检查延迟
    var timelockEnabled = Storage.Get(Storage.CurrentContext, Key(PREFIX_TIMELOCK_ENABLED, accountId));
    if (timelockEnabled != null)
    {
        Assert(Runtime.Time >= timestamp + 86400000, "Timelock not expired"); // 24h
    }
    
    // ... 验证签名 ...
}
```

---

## 4. 跨合约一致性问题

### 🟡 Medium Issues

#### M-5: 接口不一致

**问题**: 三个合约的 `SetupRecovery()` 参数不同

```csharp
// Argent
SetupRecovery(UInt160 accountId, UInt160 owner, UInt160[] guardians, BigInteger threshold)

// Safe
SetupRecovery(UInt160 accountId, UInt160 owner, RecoveryModule module)

// Loopring
SetupRecovery(UInt160 accountId, UInt160 owner, ByteString guardiansHash, BigInteger threshold)
```

**影响**: 前端集成复杂，容易出错

**建议**: 统一接口或使用适配器模式

---

#### M-6: 事件命名不一致

**问题**:
- Argent: `OnRecoveryInitiated`, `OnRecoveryExecuted`, `OnRecoveryCancelled`
- Safe: `OnModuleUpdated`, `OnRecoveryExecuted`
- Loopring: `OnRecoveryExecuted`

**建议**: 统一事件命名规范

---

## 5. 通用安全建议

### 🟢 Low Issues

#### L-1: 缺少输入验证

**所有合约**: 缺少对 `UInt160` 参数的零地址检查

**修复**:
```csharp
private static void ValidateAddress(UInt160 address, string name)
{
    Assert(address != null, name + " is null");
    Assert(!address.IsZero, name + " is zero address");
}
```

---

#### L-2: 缺少版本控制

**建议**: 添加合约版本
```csharp
[Safe]
public static string Version() => "1.0.0";
```

---

## 6. Gas 优化建议

### ℹ️ Info

#### I-1: 存储优化

**当前**: 每个守护者单独存储
```csharp
foreach (var guardian in guardians)
{
    Storage.Put(Storage.CurrentContext, Key(PREFIX_GUARDIAN, accountId, guardian), 1);
}
```

**优化**: 批量存储
```csharp
Storage.Put(Storage.CurrentContext, Key(PREFIX_GUARDIAN, accountId), StdLib.Serialize(guardians));
```

---

#### I-2: 循环优化

**Loopring 合约**: 可以提前退出循环
```csharp
BigInteger validSigs = 0;
for (int i = 0; i < signatures.Length && validSigs < threshold; i++)
{
    if (CryptoLib.VerifyWithECDsa(...))
    {
        validSigs++;
        if (validSigs >= threshold) break; // 提前退出
    }
}
```

---


## 7. 修复优先级

### 立即修复（Critical）

1. **C-3**: ArgentRecoveryVerifier - 添加守护者签名验证
2. **C-4**: SafeRecoveryVerifier - 实现完整签名验证
3. **C-1**: 所有合约 - 添加重入保护
4. **C-2**: 添加 nonce 防止重放攻击

### 高优先级（High）

5. **H-4**: 添加恢复请求过期机制
6. **H-5**: SafeRecoveryVerifier - 防止恢复期间更新模块
7. **H-2**: 限制守护者数量上限
8. **H-1**: 使时间锁可配置

### 中优先级（Medium）

9. **M-2**: 添加紧急冻结机制
10. **M-5**: 统一接口设计
11. **M-4**: Loopring 添加可选时间锁

---

## 8. 测试建议

### 单元测试覆盖

```javascript
describe("ArgentRecoveryVerifier Security", () => {
  it("should prevent reentrancy attacks", async () => {
    // 测试重入攻击
  });
  
  it("should prevent signature replay", async () => {
    // 测试签名重放
  });
  
  it("should enforce timelock correctly", async () => {
    // 测试时间锁
  });
  
  it("should validate guardian signatures", async () => {
    // 测试签名验证
  });
  
  it("should allow owner to cancel recovery", async () => {
    // 测试取消恢复
  });
  
  it("should reject expired recovery requests", async () => {
    // 测试过期请求
  });
});
```

### 集成测试

```javascript
describe("Cross-Verifier Integration", () => {
  it("should work with AbstractAccount", async () => {
    // 测试与 AA 集成
  });
  
  it("should handle verifier switching", async () => {
    // 测试切换 verifier
  });
});
```

### 压力测试

```javascript
describe("Gas and Performance", () => {
  it("should handle max guardians efficiently", async () => {
    // 测试 10 个守护者的 Gas 消耗
  });
  
  it("should handle concurrent recovery attempts", async () => {
    // 测试并发恢复
  });
});
```

---

## 9. 审计结论

### 总体评估

| 合约 | 安全等级 | 主要问题 |
|-----|---------|---------|
| ArgentRecoveryVerifier | 🟡 Medium | 缺少签名验证、重入风险 |
| SafeRecoveryVerifier | 🔴 Critical | 签名验证完全缺失 |
| LoopringRecoveryVerifier | 🟠 High | 隐私保护有限、缺少时间锁 |

### 建议

1. **不要在生产环境部署当前版本**
2. **优先修复所有 Critical 和 High 级别问题**
3. **进行完整的单元测试和集成测试**
4. **考虑第三方安全审计**
5. **实施 Bug Bounty 计划**

### 后续步骤

1. 根据本报告修复所有 Critical 问题
2. 实现完整的测试套件
3. 进行代码审查
4. 部署到测试网进行实战测试
5. 邀请社区进行安全审查

---

## 10. 参考资料

- [Argent Wallet Security](https://github.com/argentlabs/argent-contracts/blob/develop/SECURITY.md)
- [Safe Contracts Audit](https://github.com/safe-global/safe-contracts/tree/main/docs/audits)
- [Neo Smart Contract Best Practices](https://docs.neo.org/docs/n3/develop/write/basics)
- [OWASP Smart Contract Security](https://owasp.org/www-project-smart-contract-top-10/)

---

**审计人员**: Claude (Anthropic)  
**审计工具**: 静态代码分析 + 手动审查  
**下次审计**: 修复后重新审计

