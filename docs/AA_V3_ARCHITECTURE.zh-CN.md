# 🚀 Neo N3 终极账户抽象 (AA) 与可信身份架构设计蓝图 V3

## 一、 系统宏观定位 (System Positioning)
本架构不仅是一个智能钱包底座，而是一个 **“多维身份与可信执行的统一聚合网关”**。
通过 Neo N3 的底层魔法，将异构身份（Web2 社交账号、Web3 DID）、异构签名（EVM、Passkey）与高隐私的计算环境（TEE）统一路由，实现**无私钥、无Gas、无感知的跨链级 Web3 体验**。

---

## 二、 核心生态矩阵 (The Ecosystem Matrix)

整个架构分为五大核心层域：

### 1. 多维身份层 (Identity & DID Layer)
解决“我是谁”的问题。该层不在链上做强绑定，而是通过密码学证明，将不同生态的身份映射到 Neo N3 的虚拟账户 (`AccountId`) 上。
* **NeoDID 集成**：将用户的 Neo N3 `AccountId` 与 W3C 标准的 `did:neo:xxx` 绑定。允许在账户状态中存储 DID 文档解析器的哈希，实现链上信誉、SBT（灵魂绑定代币）和 KYC 凭证的直接挂载。
* **Web2 身份映射**：通过 Web3Auth (MPC 机制) 或 OAuth，将 Twitter/Google 等身份对应到特定的 EVM 或 Passkey 公钥。
* **联邦身份证明 (Federated Proofs)**：无论是跨链地址还是社交媒体句柄，最终都收敛为一对可验证的公私钥体系，并以此控制 AA 账户。

### 2. 链下可信执行与代付层 (Off-chain Trusted & Relayer Layer)
解决“谁来证明、谁来付钱”的问题。
* **Morpheus TEE 节点 (可信执行环境)**：
  * **隐私策略计算**：用户的复杂“死人开关”条件（比如：检查某 API 确认我 180 天未活跃）或高频自动交易意图，均在 TEE 的 Intel SGX/TDX 飞地内运算。
  * **硬件级签名**：TEE 确认条件满足后，使用其硬件私钥签发指令。这意味着最复杂的逻辑不再需要消耗昂贵的链上 GAS。
* **Session Key 颁发者**：用户登录后，TEE 或前端签发一个高频临时会话密钥（限定 1 小时内在某全链游戏中无限砍怪）。
* **Bundler & Paymaster (中继与代付)**：
  * 官方或第三方运营的节点。它们接收用户的 `UserOperation`（含各类签名），将其打包成标准 N3 交易。
  * **Paymaster 逻辑**：如果该操作属于“官方空投”或“白名单 DApp 交互”，Bundler 直接使用自身账户的 GAS 为用户代付，实现完全免 Gas 的极致体验。

### 3. 核心网关引擎 (Core AA Gateway)
系统的心脏，唯一存储状态的 Neo N3 合约。采用**全局单例 (Global Singleton)** 模式，用户**零部署成本**。
* **虚拟账户 (Zero-Deployment Account)**：通过 Neo N3 独有的动态脚本和 `VerifyContext` 上下文锁机制，为每个用户生成一个可收款、能通过 `CheckWitness` 鉴权，但无需真实部署的虚拟地址。
* **状态极简存储**：仅存储该账户的 `Verifier ID`、`Hook ID` 和 L1 逃生舱状态。
* **混合防重放路由**：根据 Nonce 的大小，智能判断采用常规递增队列（适用于 DeFi）还是随机盐 Bitmap（适用于 TEE 高频并发）。
* **意图引擎 (Intent & Batch)**：支持单次调用、数组批处理，乃至直接下发一段包含逻辑的 NeoVM 字节码。

### 4. 异构鉴权插件生态 (Verifier Plugins)
解决“如何验证签名”的问题。它们是预部署的**无状态 (Stateless)** 纯计算单例合约。
* **EIP-712 Verifier (Web3Auth/EVM 兼容)**：
  * N3 上目前最杀手级的插件。
  * 直接接收以太坊标准的 EIP-712 Typed Data Hash 和 `v, r, s` 签名。
  * 内部使用 N3 底层的 `CryptoLib.VerifyWithECDsa`（针对 secp256k1 曲线）和自定义的 Keccak256，完美还原以太坊验签。使得 MetaMask 用户能无缝操控 N3 资产。
* **TEE Verifier**：
  * 绑定特定的硬件公钥。只要 `UserOperation` 带有 TEE 节点的签名，即认为通过（因为复杂的商业逻辑已经在 TEE 内完成了预审）。
* **Neo Native Verifier**：
  * 原生降级方案，只检查 `Runtime.CheckWitness`，给传统的 N3 软硬件钱包留有后路。

### 5. 策略与风控插件生态 (Hook / Middleware Plugins)
解决“能不能执行”的问题。执行操作前/后置的业务规则挂载点。
* **DailyLimit Hook**：单日大额转账风控。
* **NeoDID Credential Hook**：执行某些特定 DeFi 操作前，验证账户是否挂载了特定的 NeoDID KYC 凭证。
* **Whitelist Hook**：锁定账户只能与受信任的智能合约交互。

---

## 三、 极致安全架构：L1 原生逃生舱 (Escape Hatch)

考虑到 TEE 宕机、MPC 节点失效或 Web2 服务商倒闭的极端情况，必须保留非托管的底线。
本架构彻底抛弃了易遭攻击且极度耗费 GAS 的 Oracle 死人开关，改用**时间锁抢占模型**：

1. **绑定备份 (Setup)**：用户在 TEE/Web3Auth 中设定一个物理冷钱包地址（N3 原生地址）作为 `BackupOwner`，并设定 30 天的 `Timelock`。
2. **触发挂失 (Initiate)**：若 TEE/Web2 挂了，用户用冷钱包向网关发起 `InitiateEscape`，链上开始 30 天倒计时。
3. **防盗拦截 (Cancel)**：若冷钱包被盗，黑客触发挂失，用户会在手机 App 收到警报。只要用户在此期间通过 TEE 发起**任意一笔日常交易**，AA 网关会在底层**静默且自动地**打断逃生倒计时，黑客企图直接破灭（零操作摩擦）。
4. **主权接管 (Finalize)**：30 天期满且无日常活动打断，冷钱包直接获得最高权限，重置整个 AA 账户的 Verifier 插件，实现绝对的 L1 资产主权。

---

## 四、 核心工作流：多维协议的完美融合 (End-to-End Flow)

这里以**“Web2 玩家通过 TEE 代发，免 Gas 游玩 N3 全链游戏”**为例，展示各组件如何如齿轮般咬合：

**阶段 1：身份建立与授权 (NeoDID + Web3Auth + TEE)**
1. 用户在前端使用 Google 登录 (Web3Auth)，生成以太坊 EIP-712 密钥对。
2. 前端请求 NeoDID 注册服务，将该以太坊公钥与 `did:neo:xxx` 建立关联，并获取到对应的 N3 虚拟账户地址 (`AccountId`)。
3. 用户签署一份 EIP-712 授权：“我允许 TEE 节点 0xABC 在未来 24 小时内，每天最多动用 100 GAS 用于游戏”。

**阶段 2：高频游戏动作 (TEE + Salt Nonce)**
1. 玩家在游戏中点击“攻击”。
2. 请求发往 TEE 节点。TEE 节点在内存飞地中核对：授权有效、未超时、未超额。
3. TEE 节点使用自身的硬件私钥，构造一个 `UserOperation`，签发交易。
4. **关键优化**：为了防止高频点击导致 Nonce 冲突，TEE 在 `UserOp` 中填入 UUID 作为 **Salt Nonce**。

**阶段 3：免 Gas 上链 (Bundler + Paymaster)**
1. TEE 将签名打包给游戏的官方 Bundler。
2. Bundler 作为 N3 的真正发起方，自己支付 N3 的 NetworkFee/SystemFee，将 TEE 签名的操作推入 AA 网关。

**阶段 4：极简路由与执行 (AA Gateway + Hooks)**
1. **查验重放**：AA 网关检查该 UUID Salt 未被使用，随后标记为已使用。
2. **短路鉴权**：AA 网关将数据直接路由给 `TEE Verifier` 插件，硬件验签秒过。
3. **安全拦截**：AA 网关检查当前未处于 `Escape Hatch`（逃生舱）锁定状态。
4. **策略钩子**：调用 `NeoDID Credential Hook` 确保玩家信誉分正常。
5. **代理伪装**：挂载 `VerifyContext` 锁，动态调用目标游戏合约。
6. **成功**：游戏合约反向 `CheckWitness` 虚拟地址成功，记录玩家状态。

---

## 五、 架构定调：为什么这是 N3 的终极答案？

1. **融合而非排斥**：通过 `EIP-712 Verifier`，完美吸纳了以太坊生态的开发者和现有钱包工具链；通过 `TEE Verifier`，将复杂的业务逻辑（时间、限额、多签阈值）转移到链下，保持链上底座的绝对精简。
2. **N3 底层压榨**：极致利用了 NeoVM 的 `VerifyContext` 和动态脚本，实现了真正的**零部署费虚拟地址**。彻底解决了以太坊 ERC-4337 饱受诟病的 Proxy 部署成本过高问题。
3. **真正的模块化 (Modular Smart Accounts)**：主合约永不升级。无论是接入新的身份标准（如未来的 Apple Passkey），还是接入更复杂的 DID 风控逻辑，只需新增几百行代码的无状态插件合约并挂载即可。

这不仅是一个智能钱包，这是为 Neo N3 打造的**全景式可信交互网关基础设施**。