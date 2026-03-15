# Neo N3 抽象账户

这是仓库 `README.md` 的中文入口版，帮助中文读者快速找到当前可用的文档和工作流。

## 项目内容

本项目包含：

- Neo N3 抽象账户主合约
- 前端操作工作区与协作草稿流
- JavaScript SDK 与测试网验证脚本

## 建议阅读顺序

1. `README.md`
2. `docs/HOW_IT_WORKS.zh-CN.md`
3. `docs/WORKFLOWS.zh-CN.md`
4. `docs/DATA_FLOW.zh-CN.md`
5. `docs/architecture.zh-CN.md`
6. `docs/AA_V3_ARCHITECTURE.zh-CN.md`
7. `docs/reports/2026-03-13-v3-testnet-plugin-matrix.md`

## 说明

本文件是中文导航入口。英文 README 仍然是仓库的主事实来源。

当前状态补充：

- V3 插件矩阵已在 Neo N3 testnet 实际验证，报告见 `docs/reports/2026-03-13-v3-testnet-plugin-matrix.md`
- 已验证的 verifier / hook 包括 Web3Auth、TEE、WebAuthn、SessionKey、MultiSig、Subscription、Whitelist、DailyLimit、TokenRestricted、MultiHook、NeoDIDCredentialHook
- `ZKEmailVerifier` 当前被明确禁用，直到真实 proof verifier 实现完成
