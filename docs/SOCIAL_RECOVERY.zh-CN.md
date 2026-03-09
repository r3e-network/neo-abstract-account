# 社交恢复概览

本文件是 recovery verifier 的中文概览说明。

## 当前支持的恢复验证器

- Argent 风格恢复验证器
- Safe 风格恢复验证器
- Loopring 风格恢复验证器

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
