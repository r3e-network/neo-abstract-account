# 安全审计

本页是主仓库安全审计报告的中文导读版本。

完整英文报告来源：

- `docs/SECURITY_AUDIT.md`

## 重点结论

- AA 核心执行路径是策略门控的，不能通过确定性代理地址直接绕过。
- 自定义 verifier 现在同时适用于执行路径和管理路径，恢复后的 owner 可以真正接管账户治理配置。
- recovery verifier 统一对齐了 AA 需要的接口：
  - `verify(ByteString accountId)`
  - `verifyMetaTx(ByteString accountId, UInt160[] signerHashes)`

## 与 Morpheus 集成后的新增边界

- `MorpheusSocialRecoveryVerifier`
  - 用于 NeoDID / TEE 恢复票据
  - 支持 threshold、timelock、nonce、expiry、nullifier 防重放
- `MorpheusProxySessionVerifier`
  - 用于 NeoDID action ticket
  - 支持短期匿名代理执行
  - 不会绕过 AA 原有 whitelist / blacklist / method policy / max-transfer

## 操作建议

- 高价值账户不要使用单因子恢复。
- 推荐用 Web3Auth 作为 DID 根身份，再通过 NeoDID 统一生成恢复票据和代理票据。
- Email / SMS 通知只能作为提醒层，不能作为链上授权真值来源。
- 生产环境应为 Morpheus Oracle、Web3Auth、通知 webhook 分别配置独立的密钥和监控。
