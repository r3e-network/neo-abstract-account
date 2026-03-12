# Morpheus 私密执行

本文说明 Neo 抽象账户如何使用 Morpheus NeoDID action ticket 实现隐私保护的委托执行。

## 目标

允许一个临时代理账户执行 AA 动作，而不把用户底层 Web2 身份或主钱包暴露到链上。

## 模型

推荐的链上组件是统一的 Morpheus verifier：

- `contracts/recovery/MorpheusSocialRecoveryVerifier.Fixed.cs`

专用的 `MorpheusProxySessionVerifier` 仍然可用，但如果同一个 AA 既要支持恢复又要支持私密会话，统一 Morpheus verifier 是更合适的生产方案。

## 流程

1. 账户 owner 部署或配置 `MorpheusProxySessionVerifier`
2. 通过 `setVerifierContract` 将 verifier 绑定到 AA 钱包
3. 临时执行者钱包请求 Morpheus action ticket
4. Morpheus Oracle 将请求路由到 `neodid_action_ticket`
5. verifier 以紧凑二进制 callback 形式接收结果
6. verifier 验证 Morpheus 签名并存储 active session：
   - executor
   - actionId
   - actionNullifier
   - expiry
7. 在过期前，临时执行者可以通过 `verify` / `verifyMetaTx` 授权 AA 动作
8. AA 仍然继续执行 whitelist、blacklist、method policy 与 transfer limit 检查

## 为什么这能保护隐私

链上可见的代理账户只是临时 executor。
底层社交 / 交易所身份被隐藏在以下边界之后：

- 加密的 Web3Auth `id_token` 或其他机密 provider 证据
- TEE 验证
- `action_nullifier`
- Morpheus 签名证据

无需把原始 Twitter handle、邮箱、交易所账户 ID 或 OAuth token 放到链上。

推荐身份源：

- 以 Web3Auth 作为 DID 根
- 在 Web3Auth 中关联 Google / Apple / email / SMS / 其他登录方式
- 把实时 Web3Auth `id_token` 作为加密输入提交给 NeoDID，让 TEE 内部导出稳定 provider root
- 对调用方自带的 `provider_uid` 只当作可选一致性提示
- 使用 `provider = "web3auth"` 请求 NeoDID action ticket
- 把 `did:morpheus:neo_n3:service:neodid` 作为 resolver 集成时的公共元数据锚点

## 安全边界

Morpheus 私密执行路径是有意收窄的：

- 不会绕过 AA 策略控制
- 不会永久替换 owner
- 每张 action ticket 都通过 `action_nullifier` 防重放
- 每次委托会话都必须带明确 expiry

## 推荐用例

- 通过一次性钱包参与匿名治理
- 保护隐私的 claim / 领取流程
- 在不暴露主 owner 地址的情况下短期委托操作
- 用热钱包实现隔离化执行

## 推荐运维模式

- 保持 AA whitelist mode 开启
- 只把需要的目标合约加入 whitelist
- 对代币转移目标配置 max-transfer 规则
- 使用较短的 session expiry
- 使用完毕后主动 revoke session

## 与恢复的关系

这不是账户恢复。

- `MorpheusSocialRecoveryVerifier` 用于 ownership recovery
- `MorpheusProxySessionVerifier` 用于临时私密执行授权

两者都使用同一套 Morpheus Oracle + NeoDID 栈，但解决的是不同的授权问题。
