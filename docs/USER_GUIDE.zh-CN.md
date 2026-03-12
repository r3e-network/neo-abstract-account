# 用户指南

这是 `docs/HOW_IT_WORKS.zh-CN.md` 的实用补充，重点讲“怎么用”。

## 适合谁阅读

- 需要发起交易的操作员
- 只负责签名的协作者
- 想快速理解前端流程的开发者

## 最快使用路径

1. 打开首页工作区
2. 加载抽象账户
3. 选择预设或自定义调用
4. 持久化草稿
5. 分享正确权限范围的链接
6. 收集签名
7. 如有需要先做 relay preflight
8. 通过钱包或 relay 广播

## 角色说明

### 只读查看者
- 使用公开分享链接
- 可以查看草稿，但不能修改

### 协作者 / 签名者
- 使用 collaborator link
- 可以追加签名或批准
- 不能执行仅操作员可做的 relay / 广播动作

### 操作员
- 使用 operator link
- 可以做 relay 检查、写入回执、轮换链接、提交交易

## 推荐配套阅读

- `docs/HOW_IT_WORKS.zh-CN.md`
- `docs/WORKFLOWS.zh-CN.md`
- `docs/DATA_FLOW.zh-CN.md`
- `contracts/recovery/TESTNET_VALIDATION_2026-03-09.md`
- `docs/MORPHEUS_SOCIAL_RECOVERY.md`
- `docs/MORPHEUS_PRIVATE_ACTIONS.md`
