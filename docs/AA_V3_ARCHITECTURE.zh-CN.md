# 🚀 Neo N3 终极抽象账户 (AA) 架构设计蓝图 V3

## 一、 核心设计哲学 (Design Philosophy)
1. **全局单例模式 (Global Singleton)**：绝不让用户承担 10 NEO 的合约部署费。整个协议只有 1 个主核心网关合约。
2. **虚拟账户 (Virtual Account)**：利用 NeoVM 的动态脚本构建技术，让用户拥有真实的链上地址和收发资产能力，但该地址背后**没有实体部署的合约**。
3. **彻底解耦验证与执行 (Decoupled Validation & Execution)**：主合约只做“路由调度”，所有的“验签（EVM/TEE）”和“风控（限额/白名单）”全部交给独立的单例插件合约。
4. **意图与批处理驱动 (Intent & Batch Driven)**：打破单次调用的限制，支持前端直接下发复合交易脚本。

---

## 二、 系统拓扑架构 (System Topology)

整个生态由 **四个核心层** 组成：

### 1. 链下基础设施层 (Off-chain Infrastructure)
*   **客户端/前端 (Client)**：可以是 Web3Auth (EVM 私钥)、Morpheus TEE 节点或全链游戏前端。负责生成 `UserOperation`（用户操作指令）并签名。
*   **中继器/打包者 (Bundler/Relayer)**：由于虚拟账户没有原生 GAS，所有的交易由 Bundler 作为 N3 原生 `Sender` 发起，代付 GAS，并将用户的 `UserOperation` 提交给链上的 AA 网关。

### 2. 核心网关层 (Core AA Gateway Contract)
这是整个系统唯一存储用户状态的地方。它维护着一个全局的注册表：`Map<UInt160 AccountId, AccountState>`。
*   **AccountState 结构**：
    *   `Verifier ID` (标识使用哪个鉴权插件，如 TEE)
    *   `Hook ID` (标识使用哪个拦截器插件)
    *   `Backup Owner` (L1 逃生冷钱包地址)
    *   `Escape State` (逃生舱时间锁状态)
*   **职责**：防重放检查、生命周期管理、路由分发、跨合约上下文锁（VerifyContext）。

### 3. 验证器插件生态 (Verifier Plugins)
官方预先部署好的**无状态 (Stateless)** 单例智能合约。主合约将签名透传给它们，它们只返回 `True` 或 `False`。
*   `Web3AuthVerifier`：包含 `ecrecover` 逻辑，解析 EIP-712 签名。
*   `TEEVerifier`：解析特定的硬件环境证明签名。
*   `SessionKeyVerifier`：解析游戏高频场景下的临时会话密钥。

### 4. 拦截器插件生态 (Hook / Middleware Plugins)
官方预部署的无状态策略合约，在执行真实操作前/后被主合约调用。
*   `DailyLimitHook`：检查今天转出的 NEP-17 资产是否超限。
*   `WhitelistHook`：检查目标 DeFi 合约是否在安全名单内。

---

## 三、 核心机制设计细节 (Key Mechanisms)

### 机制一：免部署虚拟账户地址 (Zero-Deployment Proxy Script)
在 N3 中如何让一个没有部署的账户通过 `CheckWitness` 鉴权？
1. **地址生成**：前端拼接一段极简的 NeoVM 字节码 `[PUSH accountId] + [PUSH GatewayHash] + [SYSCALL Contract.Call "Verify"]`。这段字节码的 Hash160 就是用户的“虚拟钱包地址”。
2. **上下文锁 (VerifyContext)**：当用户发起交易时，网关合约会先在 Storage 中写入一个锁：`"允许 [虚拟地址] 在当前区块内访问 [目标Flamingo合约]"`。
3. **完美欺骗**：随后网关通过动态调用执行目标合约。目标合约内部调用 `CheckWitness(虚拟地址)`。Neo 底层会触发虚拟地址的字节码，回调网关的 `Verify` 接口。网关检查上下文锁匹配，返回 `True`。鉴权完美通过，且**全程 0 部署费**！

### 机制二：混合防重放机制 (Hybrid Replay Protection)
为了解决分布式并发和高频游戏场景的 Nonce 冲突，定义全局标准：
*   **常规模式 (2D Nonce)**：前端传入 `<Channel ID, Sequence>`。适用于对顺序要求严格的 DeFi 操作（如：必须先 Approve，再 Swap）。
*   **无序模式 (Random Salt)**：前端传入一个极大随机数（UUID）。网关只在链上记录“该 Salt 已被使用”。极其适合 TEE 节点或全链游戏后台并发代发，**彻底消灭队头阻塞**。

### 机制三：L1 原生逃生舱 (Deadman's Switch / Escape Hatch)
摒弃繁重的 Oracle 预言机死人开关，采用极简的 **时间锁抢占模型**。
1. **触发 (Initiate)**：若 TEE 服务停摆，用户用绑定的冷钱包向网关发起 `InitiateEscape`，开启 30 天倒计时。
2. **防盗打断 (Cancel)**：如果冷钱包被盗，黑客触发了逃生。只要真正的用户在这 30 天内通过 TEE 发起了**任意一笔日常交易**，网关会在底层静默清零倒计时，黑客企图直接破灭。
3. **完成 (Finalize)**：30 天期满且未被打断，冷钱包直接接管账户，可重置 Verifier 插件（例如将 TEE Verifier 换成原生 Neo Verifier）。

### 机制四：意图与批处理执行引擎 (Intent & Batch Engine)
`UserOperation` 的 `Payload` 不仅仅是单一的 `<Target, Method, Args>`。
它支持三种模式：
1. **Single Call**：单次合约调用。
2. **Batch Call**：数组调用 `[Call_1, Call_2, Call_3]`（例如 Approve + Swap）。
3. **Intent Script (终极杀手锏)**：前端直接编译一段包含了 `if/else` 甚至余额断言（Post-condition）的 NeoVM 执行脚本。网关验证签名后，直接 `DelegateCall` 或 `System.Contract.Call` 顺着这段脚本跑。这是最高级别的可组合性。

---

## 四、 交易生命周期 (End-to-End Flow)

这里以**“新用户用 Web3Auth (EVM签名) 在 N3 上的 Flamingo 交换代币”**为例，展示架构的完美流转：

**阶段 1：懒加载初始化 (Counterfactual Setup)**
1. 用户在前端用 Twitter 登录 Web3Auth，生成以太坊私钥。
2. 前端根据私钥公钥计算出在 N3 上的 `AccountId`，并推导出“虚拟账户地址”。
3. 用户从交易所往这个“虚拟账户地址”提现 100 NEO。此时链上**没有任何该账户的合约或记录**（无感 Onboarding）。

**阶段 2：组装与签名 (Client-side)**
1. 前端构造 `UserOperation`：
   * `Payload`: [Approve Flamingo, Swap NEO to FLM]
   * `Nonce`: UUID (Salt 模式)
   * `Deadline`: 5 分钟后
2. 前端使用 Web3Auth 生成的以太坊私钥对上述数据进行 EIP-712 签名。

**阶段 3：中继与上链 (Relayer-side)**
1. 前端将带有签名的 `UserOp` 发给官方的 Bundler 服务器。
2. Bundler 组装一笔标准的 N3 交易，自己作为 `Sender` 支付 0.01 GAS，调用网关的 `ExecuteUserOp`。

**阶段 4：网关处理与执行 (On-chain Gateway)**
1. **初始化拦截**：网关发现 `AccountId` 还未注册，立刻自动初始化其状态（绑定 Web3AuthVerifier 和默认 Hook）。
2. **防重放拦截**：检查 UUID Salt 未被使用，并将其标记为已使用。
3. **鉴权路由**：网关将 `UserOp` 原封不动抛给 `Web3AuthVerifier` 单例合约。Verifier 内部执行 `ecrecover` 确认签名无误，返回 `True`。
4. **逃生舱拦截**：确认当前账户没有处于“被冷钱包挂失”的倒计时中。
5. **策略路由 (预处理)**：网关调用 `DailyLimitHook`，确认这笔交易不会超出用户的单日限额。
6. **执行与发散**：
   * 网关锁定 `VerifyContext`。
   * 网关代虚拟账户依次向 Flamingo 发起 `Approve` 和 `Swap`。
   * Flamingo 内部反向 `CheckWitness` 顺利通过（多亏了 N3 的动态代理脚本魔法）。
7. **策略路由 (后处理)**：执行完毕，清理 `VerifyContext`。

---

## 五、 架构总结与优势

这套 N3 AA 架构可以说是完全吃透了 Neo 底层虚拟机特性的“艺术品”：

* **对用户**：极致丝滑，完全等同于 Web2 体验。无助记词、无部署费、支持多端并发操作（Salt Nonce）、支持社交/冷钱包极简恢复。
* **对开发者/项目方**：状态极度收敛。主合约一旦部署，永不需要升级（Immutable）。想要支持新的登录方式（比如苹果 Passkey），只需要新写一个 50 行的 `PasskeyVerifier.cs` 部署上去，加进支持列表即可。
* **对底层**：由于干掉了繁重的 Oracle 解析和几百行的 N3 字节码动态拼接，GAS 消耗被压缩到了物理极限。

这套设计完全可以作为 **Neo 生态 NEP 级别的账户抽象标准**，直接对标甚至在某些特性（如免部署、原生级上下文伪装）上超越以太坊的 ERC-4337。