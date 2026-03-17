# Paymaster 实网验证

## 范围

本页汇总 `Neo Abstract Account + Morpheus Paymaster + Relay` 在 Neo N3 Testnet 上的实网验证结果。

已验证组件：

- Morpheus Paymaster policy：`testnet-aa`
- AA Core：`0xe24d2980d17d2580ff4ee8dc5dddaa20e3caec38`
- Web3Auth Verifier：`0xf2560a0db44bbb32d0a6919cf90a3d0643ad8e3d`
- Morpheus Test CVM App ID：`28294e89d490924b79c85cdee057ce55723b3d56`

## 已修复问题

此前 AA relay API 在构造 paymaster 请求时调用了 `sanitizeHex(...)`，但文件没有导入该函数。

影响：

- 所有带 `paymaster` 的 relay 请求都会在 `paymaster` 阶段失败
- 失败发生在真正请求 Morpheus 授权之前

修复后：

- Morpheus 授权可以正常返回
- relay 可以继续广播并在链上执行

## 验证结果

### 1. 直接 paymaster 授权成功

- 返回状态：`200`
- `approved = true`
- `policy_id = testnet-aa`

### 2. 直接 relay 提交成功

- 交易：`0xa8492f393bff2f1835cd58aa0117f5ea6594ad5aae71a1effb024899c5ab0022`
- 执行结果：`HALT`

### 3. 已在 allowlist 中的账户完整路径成功

- `accountId`：`0x0c3146e78efc42bfb7d4cc2e06e3efd063c01c56`
- relay 交易：`0x1d79429b9e8af4115845d7858ddaefcc575dafff2b14a37a000caaea58a0f0bb`
- `approval_digest`：`bb40b23016f702b3e7e084a977bcba02e595a3054095053294618cf65d630a3c`
- `attestation_hash`：`e352300442435c80478e09f27328150cdd50dd97e052865f39a410b5cfc5133f`
- 返回栈：`GAS`

### 4. 新账户完整路径成功

这条路径覆盖：

1. `registerAccount`
2. `updateVerifier`
3. 远端 paymaster allowlist 更新
4. Morpheus 授权
5. AA relay 广播
6. 链上 `executeUserOp` 成功执行

对应结果：

- `accountId`：`0x531a5f4d3a916dffbba3ea372317623fdbbb853c`
- register 交易：`0xf79d6a1d3012e9edc64c1a7e40abc932253c7f737873698055ad8f3df8a1869e`
- update verifier 交易：`0xed9c97801a757fb0e3d72d641d75a6659c1242c084134234b5e7cd1a81e903d8`
- relay 交易：`0x057d4a581efbe815fad0148a3766284da2a33335e72fb50e54d476078d8f40d4`
- `approval_digest`：`04111a96d6356231c45fdb033ddc91818856c1dc0ac0ce09677ecdb033cae92f`
- `attestation_hash`：`73849ae405db210d51c28ff63033bc4bb5f2f0886e1a7478c2557e1ac9c39886`
- 返回栈：`GAS`

## 结论

当前 `AA + Morpheus Paymaster` 在 Neo N3 Testnet 上已经完成完整实网验证，包含：

- 直接授权
- 直接 relay
- 旧账户回放
- 新账户注册到赞助执行的完整路径

这意味着用户在前端中启用 paymaster 后，当前服务端逻辑已经具备真实可用的 testnet 验证依据，而不只是本地模拟或单元测试。
