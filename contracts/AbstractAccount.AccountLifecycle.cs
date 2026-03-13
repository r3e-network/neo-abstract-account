using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Lifecycle entrypoints define how a logical account is created, optionally bound to its deterministic proxy,
    // and later verified during either transaction verification or contract-to-contract application execution.
    public partial class UnifiedSmartWallet
    {
        /// <summary>
        /// Creates a logical account record keyed by <paramref name="accountId"/> and seeds its admin/manager quorums.
        /// At this stage the account may still be unbound from its deterministic proxy address.
        /// </summary>
        public static void CreateAccount(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> signers, int threshold)
        {
            CreateAccountInternal(accountId, signers, threshold);
        }

        /// <summary>
        /// Creates the account and immediately binds it to the deterministic proxy address derived from the same
        /// <paramref name="accountId"/>. This is the common happy-path used by the frontend and SDK.
        /// </summary>
        public static void CreateAccountWithAddress(
            ByteString accountId,
            UInt160 accountAddress,
            Neo.SmartContract.Framework.List<UInt160> signers,
            int threshold)
        {
            CreateAccountInternal(accountId, signers, threshold);
            BindAccountAddressInternal(accountId, accountAddress);
        }

        /// <summary>
        /// Creates multiple accounts in a single transaction with shared admin/manager configuration.
        /// If admins list is empty, the transaction sender becomes the sole admin for all accounts.
        /// </summary>
        public static void CreateAccountBatch(
            Neo.SmartContract.Framework.List<ByteString> accountIds,
            Neo.SmartContract.Framework.List<UInt160>? signers,
            int threshold)
        {
            ExecutionEngine.Assert(accountIds != null && accountIds.Count > 0, "Account IDs required");
            for (int i = 0; i < accountIds!.Count; i++)
            {
                CreateAccountInternal(accountIds[i], signers, threshold);
            }
        }

        [Safe]
        /// <summary>
        /// Verification entrypoint for the deterministic proxy witness associated with <paramref name="accountId"/>.
        /// 抽象账户的统一验证入口点，由确定性代理脚本调用。
        /// </summary>
        /// <remarks>
        /// During the Verification trigger the contract validates the transaction shape and checks native or custom
        /// verifier authorization. During the Application trigger it only returns true when an active AA execution path
        /// has pre-authorized the current target contract through SetVerifyContext.
        /// 
        /// 【验证架构说明】
        /// Neo VM 的验证分为两个阶段（Trigger）：
        /// 
        /// 1. Verification 阶段（交易验证阶段）：
        ///    - 发生时机：交易进入内存池时，Neo 节点调用所有 witness 的验证脚本
        ///    - 验证对象：交易本身的合法性和签名授权
        ///    - 验证方式：只能使用 Runtime.CheckWitness() 检查 N3 原生签名
        ///    - EVM 签名限制：无法在此阶段验证 EVM 签名，因为 EIP-712 签名数据在交易参数中，
        ///      而 Verification 阶段无法访问 Application 数据
        ///    - 本方法行为：检查交易形状是否为标准的 AA 包装调用，然后验证 N3 签名是否满足阈值
        /// 
        /// 2. Application 阶段（应用执行阶段）：
        ///    - 发生时机：交易执行时，目标合约调用 Runtime.CheckWitness(proxyAddress)
        ///    - 验证对象：当前执行路径是否有权代表该抽象账户
        ///    - 验证方式：检查 VerifyContext，确保只有 Execute/ExecuteMetaTx 设置的目标合约能通过
        ///    - 本方法行为：返回 true 当且仅当调用者是当前活跃执行路径预授权的目标合约
        /// 
        /// 【N3 与 EVM 签名的不同验证路径】
        /// - N3 签名：在 Verification 阶段通过 Runtime.CheckWitness() 验证
        /// - EVM 签名：在 Application 阶段通过 ExecuteMetaTx 中的 EIP-712 验证，
        ///   然后通过 CheckMixedSignatures 统一计数
        /// - 混合授权：CheckMixedSignatures 同时计数 EVM 签名（verifiedSigners）和 N3 签名（CheckWitness），
        ///   实现统一阈值检查
        /// </remarks>
        public static bool Verify(ByteString accountId)
        {
            AssertAccountExists(accountId);

            // Application-trigger verification happens when a downstream contract calls CheckWitness on the
            // deterministic proxy address. Only the currently active AA execution path is allowed to satisfy it.
            if (Runtime.Trigger == TriggerType.Application)
            {
                // Proxy-account verification is valid during application execution
                // if it's being called strictly by the target contract via CheckWitness.
                if (HasActiveVerifyContext(accountId, Runtime.CallingScriptHash)) return true;
                return false;
            }

            // ============================================================================
            // VERIFICATION PHASE: N3 NATIVE SIGNATURE VERIFICATION ONLY
            // ============================================================================
            // Verification-trigger execution happens on the outer transaction itself. The script must be the hardened
            // one-self-call AA wrapper shape, and authorization is then checked against custom verifier or admin rules.
            //
            // 【重要限制】此阶段只能验证 N3 原生签名，无法验证 EVM 签名
            // IMPORTANT: This phase can ONLY verify Neo native signatures, NOT EVM signatures
            //
            // 【为什么 EVM 签名无法在此验证】
            // Why EVM signatures cannot be verified here:
            // 1. EIP-712 签名数据在交易的 Application 参数中
            //    EIP-712 signature data is in the transaction's Application parameters
            // 2. Verification 阶段无法访问 Application 数据
            //    Verification phase cannot access Application data
            // 3. EVM 签名必须在 ExecuteMetaTx 方法中验证（Application 阶段）
            //    EVM signatures must be verified in ExecuteMetaTx method (Application phase)
            //
            // 【此方法的验证范围】
            // What this method verifies:
            // - N3 原生签名（通过 Runtime.CheckWitness）
            //   Neo native signatures (via Runtime.CheckWitness)
            // - 自定义验证器合约
            //   Custom verifier contracts
            // - Admin 角色的 N3 签名
            //   Admin roles with Neo signatures
            // ============================================================================
            if (Runtime.Trigger == TriggerType.Verification)
            {
                if (!IsAllowedProxyVerificationTransaction()) return false;

                // ========================================================================
                // CUSTOM VERIFIER: Delegate to external verification contract
                // 自定义验证器：委托给外部验证合约
                // ========================================================================
                UInt160 customVerifier = GetVerifierContract(accountId);
                if (customVerifier != null && customVerifier != UInt160.Zero)
                {
                    return (bool)Contract.Call(customVerifier, "verify", CallFlags.ReadOnly, new object[] { accountId });
                }

                // ========================================================================
                // N3 SIGNATURE VERIFICATION: Check Neo native witnesses
                // N3 签名验证：检查 Neo 原生见证
                // ========================================================================
                // 以下所有检查都使用 CheckNativeSignatures，只验证 N3 签名
                // All checks below use CheckNativeSignatures, verifying ONLY Neo signatures
                
                // Check Admin signatures (N3 only)
                // 检查 Admin 签名（仅 N3）
                bool isSigner = CheckNativeSignatures(GetSigners(accountId), GetThreshold(accountId));
                if (isSigner) return true;
                
                // ========================================================================
                // EVM SIGNATURE VERIFICATION: NOT POSSIBLE HERE
                // EVM 签名验证：此处无法进行
                // ========================================================================
                // EVM 签名在 ExecuteMetaTx/ExecuteMetaTxByAddress 方法中验证
                // EVM signatures are verified in ExecuteMetaTx/ExecuteMetaTxByAddress methods
                // 
                // 验证流程：
                // Verification flow:
                // 1. ExecuteMetaTx 接收 EIP-712 签名和公钥
                //    ExecuteMetaTx receives EIP-712 signatures and public keys
                // 2. 通过 CryptoLib.VerifyWithECDsa 验证签名（secp256k1/Keccak256）
                //    Verifies signatures via CryptoLib.VerifyWithECDsa (secp256k1/Keccak256)
                // 3. 从公钥恢复 EVM 地址
                //    Recovers EVM addresses from public keys
                // 4. 调用 CheckMixedSignatures 统一计数 N3 和 EVM 签名
                //    Calls CheckMixedSignatures to count both Neo and EVM signatures
                // ========================================================================
            }

            return false;
        }
    }
}
