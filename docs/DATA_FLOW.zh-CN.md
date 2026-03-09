# 数据流与存储

Supabase 中保存的是协作草稿与前端辅助元数据，而真正的授权、阈值与策略仍在链上主合约中。

## 草稿记录包含什么

- `account`
- `operation_body`
- `transaction_body`
- `signer_requirements`
- `signatures`
- `metadata.activity`
- `metadata.submissionReceipts`
- `metadata.relayPreflight`

## 链接与权限

- `share_slug`：公开只读
- `collaboration_slug`：签名范围
- `operator_slug`：操作员范围

## 数据边界

- 操作员动作通过服务端签名变更执行
- 协作者无法伪造中继或广播类活动记录
- 前端活动与回执历史采用有界保留策略
