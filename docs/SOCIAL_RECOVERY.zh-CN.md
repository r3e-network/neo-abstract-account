# 社交恢复概览

本文件是 recovery verifier 的中文概览说明。

## 当前支持的恢复验证器

- Argent 风格恢复验证器
- Safe 风格恢复验证器
- Loopring 风格恢复验证器
- Morpheus NeoDID / 隐私预言机恢复验证器

## 当前状态

这些恢复验证器已经在 Neo N3 测试网完成部署和基础验证，详细结果请见：

- `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md`

## 关键特性

- 守护者 / guardian 模型
- 阈值控制
- `setupRecovery(...)` 初始化
- `getOwner(...)` / `getNonce(...)` 查询
- 针对不同恢复模型的独立验证脚本

## 推荐阅读

- `contracts/recovery/README.md`
- `contracts/recovery/PRE_DEPLOYMENT_CHECKLIST.md`
- `contracts/recovery/TEST_STATUS.md`
- `docs/MORPHEUS_SOCIAL_RECOVERY.md`

## Morpheus 集成说明

当前仓库已加入 `MorpheusSocialRecoveryVerifier`，用于接收 Morpheus 侧签发的恢复票据。
同时也加入了 `MorpheusProxySessionVerifier`，用于接收 Morpheus 的 action ticket 并激活短期匿名代理执行会话。

推荐模式：

1. 用户通过 Morpheus `neodid_recovery_ticket` 流程获取 TEE 签名的恢复票据
2. 将票据提交到 `MorpheusSocialRecoveryVerifier`
3. 验证器完成阈值和 timelock 检查后切换 verifier owner
4. 新 owner 再通过 AA 的 admin 接口轮换原生 admins / managers

同时，AA 的 `AssertIsAdmin` 现在也会尊重已配置的 `custom verifier`。
这意味着恢复完成后，新 owner 可以真正接管治理配置，而不只是调用普通执行路径。

如果你需要“隐私行权 / 代理执行”，请看：

- `docs/MORPHEUS_PRIVATE_ACTIONS.md`
