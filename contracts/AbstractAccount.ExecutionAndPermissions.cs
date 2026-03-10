using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Execution helpers are the contract's main runtime gate. They authenticate the caller, enforce policy
    // restrictions, open a tightly scoped verification window for the downstream contract, and finally dispatch the
    // call with read-only or mutating flags based on the method being invoked.
    public partial class UnifiedSmartWallet
    {
        // Calls that only inspect state are dispatched with ReadOnly flags; state-changing calls keep full flags.
        private static readonly CallFlags MutatingExecutionCallFlags = CallFlags.All;
        private static readonly CallFlags ReadOnlyExecutionCallFlags = CallFlags.ReadOnly;

        /// <summary>
        /// Native Neo execution path. This is the core AA wrapper used by wallets once they have assembled a standard
        /// transaction with the deterministic proxy witness.
        /// </summary>
        public static object Execute(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            // 1. Authenticate signer(s) and enforce whitelist / blacklist / transfer policies.
            CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);
            // 2. Lock execution and expose a verify context so only this target contract can consume CheckWitness(proxy).
            EnterExecution(accountId);
            SetVerifyContext(accountId, targetContract);
            try
            {
                OnExecute(accountId, targetContract, method, args);
                return DispatchContractCall(targetContract, method, args);
            }
            finally
            {
                ClearVerifyContext(accountId);
                ExitExecution(accountId);
            }
        }

        /// <summary>
        /// Address-based convenience wrapper for Execute. Frontends usually prefer this form once the logical account has
        /// been bound to its deterministic verify-proxy address.
        /// </summary>
        public static object ExecuteByAddress(UInt160 accountAddress, UInt160 targetContract, string method, object[] args)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return Execute(accountId, targetContract, method, args);
        }

        private static bool CallCustomVerifierNative(UInt160 customVerifier, ByteString accountId)
        {
            return (bool)Contract.Call(customVerifier, "verify", CallFlags.ReadOnly, new object[] { accountId });
        }

        private static bool CallCustomVerifierMetaTx(UInt160 customVerifier, ByteString accountId, UInt160[] verifiedSigners)
        {
            ExecutionEngine.Assert(verifiedSigners != null && verifiedSigners.Length > 0, "Missing verified signers");
            return (bool)Contract.Call(customVerifier, "verifyMetaTx", CallFlags.ReadOnly, new object[] { accountId, verifiedSigners });
        }

        private static void CheckPermissionsAndExecuteNative(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);

            // Authorization order is: custom verifier (if configured), then native admin/manager quorum, then dome
            // signers subject to timeout + oracle unlock. Only after authorization do we evaluate target restrictions.
            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                bool isAuthorized = CallCustomVerifierNative(customVerifier, accountId);
                ExecutionEngine.Assert(isAuthorized, "Unauthorized by custom verifier");
                UpdateLastActiveTimestamp(accountId);
            }
            else
            {
                bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
                bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
                if (isAdmin || isManager)
                {
                    UpdateLastActiveTimestamp(accountId);
                }
                else
                {
                    bool isDome = CheckNativeSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId));
                    ExecutionEngine.Assert(isDome, "Unauthorized");

                    BigInteger timeout = GetDomeTimeout(accountId);
                    ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

                    BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                    ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");
                    ExecutionEngine.Assert(IsDomeOracleUnlocked(accountId), "Dome account not unlocked by oracle");
                    UpdateLastActiveTimestamp(accountId);
                }
            }
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecute(ByteString accountId, UInt160[] verifiedSigners, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);

            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                bool isAuthorized = CallCustomVerifierMetaTx(customVerifier, accountId, verifiedSigners);
                ExecutionEngine.Assert(isAuthorized, "Unauthorized by custom verifier");
                UpdateLastActiveTimestamp(accountId);
            }
            else
            {
                bool isAdmin = CheckMixedSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), verifiedSigners);
                bool isManager = CheckMixedSignatures(GetManagers(accountId), GetManagerThreshold(accountId), verifiedSigners);
                if (isAdmin || isManager)
                {
                    UpdateLastActiveTimestamp(accountId);
                }
                else
                {
                    bool isDome = CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), verifiedSigners);
                    ExecutionEngine.Assert(isDome, "Unauthorized");

                    BigInteger timeout = GetDomeTimeout(accountId);
                    ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

                    BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                    ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");
                    ExecutionEngine.Assert(IsDomeOracleUnlocked(accountId), "Dome account not unlocked by oracle");
                    UpdateLastActiveTimestamp(accountId);
                }
            }
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        // Policy enforcement is intentionally centralized so every execution path—native and meta-tx—runs through the
        // same whitelist, blacklist, method-allowlist, and max-transfer rules.
        private static void EnforceRestrictions(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertMethodAllowedByPolicy(targetContract, method);

            StorageMap blacklistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)));
            ByteString? isBlacklisted = blacklistMap.Get(targetContract);
            ExecutionEngine.Assert(isBlacklisted == null || isBlacklisted != (ByteString)new byte[] { 1 }, "Target is blacklisted");

            StorageMap whitelistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)));
            StorageMap whitelistEnabledMap = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            ByteString? whitelistOnly = whitelistEnabledMap.Get(GetStorageKey(accountId));
            if (whitelistOnly != null && whitelistOnly == (ByteString)new byte[] { 1 })
            {
                ByteString? isWhitelisted = whitelistMap.Get(targetContract);
                ExecutionEngine.Assert(isWhitelisted != null && isWhitelisted == (ByteString)new byte[] { 1 }, "Target is not in whitelist");
            }

            if (method == "transfer" || method == "approve")
            {
                if (targetContract != Runtime.ExecutingScriptHash)
                {
                    ByteString? isWhitelisted = whitelistMap.Get(targetContract);
                    ExecutionEngine.Assert(isWhitelisted != null && isWhitelisted == (ByteString)new byte[] { 1 }, "Asset-moving target is not in whitelist");
                }

                StorageMap maxMap = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, GetStorageKey(accountId)));
                ByteString? maxValBytes = maxMap.Get(targetContract);
                if (maxValBytes != null)
                {
                    BigInteger amount = GetRestrictedAmount(method, args);
                    BigInteger maxVal = (BigInteger)maxValBytes;
                    ExecutionEngine.Assert(maxVal <= 0 || amount <= maxVal, "Amount exceeds max limit");
                }
            }
        }

        private static bool IsReadOnlyMethod(string method)
        {
            return method == "balanceOf"
                || method == "symbol"
                || method == "decimals"
                || method == "totalSupply"
                || method == "allowance"
                || method == "getNonce"
                || method == "getNonceForAccount"
                || method == "getNonceForAddress";
        }

        private static CallFlags ResolveCallFlags(string method)
        {
            return IsReadOnlyMethod(method) ? ReadOnlyExecutionCallFlags : MutatingExecutionCallFlags;
        }

        private static object DispatchContractCall(UInt160 targetContract, string method, object[] args)
        {
            return Contract.Call(targetContract, method, ResolveCallFlags(method), args);
        }

        private static BigInteger GetRestrictedAmount(string method, object[] args)
        {
            ExecutionEngine.Assert(args != null, "Invalid args");
            object[] validatedArgs = args!;

            if (method == "transfer")
            {
                ExecutionEngine.Assert(validatedArgs.Length >= 3 && validatedArgs[2] is BigInteger, "Invalid transfer amount");
                return (BigInteger)validatedArgs[2];
            }

            // Common signatures:
            // - ERC20-like approve(spender, amount) => args[1]
            // - Neo-style approve(from, spender, amount) => args[2]
            if (validatedArgs.Length >= 2 && validatedArgs[1] is BigInteger) return (BigInteger)validatedArgs[1];
            if (validatedArgs.Length >= 3 && validatedArgs[2] is BigInteger) return (BigInteger)validatedArgs[2];

            ExecutionEngine.Assert(false, "Invalid approve amount");
            return 0;
        }

        private static void AssertMethodAllowedByPolicy(UInt160 targetContract, string method)
        {
            ExecutionEngine.Assert(method != null && method.Length > 0, "Invalid method");
            bool isSelfTarget = targetContract == Runtime.ExecutingScriptHash;

            if (method == "transfer") return;
            if (method == "balanceOf") return;
            if (method == "symbol") return;
            if (method == "decimals") return;
            if (method == "totalSupply") return;
            if (method == "allowance") return;
            if (method == "approve") return;

            if (method == "getNonce" ||
                method == "getNonceForAccount" ||
                method == "getNonceForAddress" ||
                method == "setWhitelistByAddress" ||
                method == "setWhitelistModeByAddress" ||
                method == "setWhitelist" ||
                method == "setWhitelistMode" ||
                method == "setBlacklistByAddress" ||
                method == "setBlacklist" ||
                method == "setMaxTransferByAddress" ||
                method == "setMaxTransfer" ||
                method == "setAdminsByAddress" ||
                method == "setAdmins" ||
                method == "setManagersByAddress" ||
                method == "setManagers" ||
                method == "bindAccountAddress" ||
                method == "setDomeAccountsByAddress" ||
                method == "setDomeAccounts" ||
                method == "setDomeOracleByAddress" ||
                method == "setDomeOracle" ||
                method == "setVerifierContractByAddress" ||
                method == "setVerifierContract" ||
                method == "requestDomeActivationByAddress" ||
                method == "requestDomeActivation" ||
                method == "domeActivationCallback")
            {
                ExecutionEngine.Assert(isSelfTarget, "Internal method requires self target");
                return;
            }

            ExecutionEngine.Assert(false, "Method not allowed by policy");
        }

        /// <summary>
        /// 纯 N3 签名验证：只检查 Runtime.CheckWitness，用于 Verification 阶段。
        /// Pure N3 signature verification: only checks Runtime.CheckWitness, used in Verification phase.
        /// </summary>
        /// <remarks>
        /// 【使用场景】
        /// 1. Verify 方法在 Verification 阶段调用（交易验证阶段）
        /// 2. Execute/ExecuteByAddress 在 Application 阶段调用（纯 N3 执行路径）
        /// 3. 任何只需要 N3 原生签名的授权检查
        /// 
        /// 【与 CheckMixedSignatures 的区别】
        /// - CheckNativeSignatures：只检查 N3 签名，无法处理 EVM 签名
        /// - CheckMixedSignatures：同时检查 N3 和 EVM 签名，用于混合授权
        /// 
        /// 【Runtime.CheckWitness 工作原理】
        /// - 检查交易的 Signers 字段是否包含指定地址
        /// - 验证对应的 Witnesses 字段中的签名是否有效
        /// - 只能在 Verification 和 Application 阶段使用
        /// - 无法验证 EIP-712 签名（因为 EVM 签名在交易参数中，不在 Witnesses 中）
        /// </remarks>
        private static bool CheckNativeSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                if (Runtime.CheckWitness(roles[i])) count++;
            }
            return count >= threshold;
        }

        private static bool CheckExplicitSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold, UInt160[] verifiedSigners)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                foreach (var signer in verifiedSigners)
                {
                    if (roles[i] == signer)
                    {
                        count++;
                        break;
                    }
                }
            }
            return count >= threshold;
        }

        /// <summary>
        /// 统一阈值算法：同时计数 EVM 签名和 N3 签名，实现混合授权。
        /// Unified threshold algorithm: counts both EVM and N3 signatures for mixed authorization.
        /// </summary>
        /// <remarks>
        /// 【核心设计理念】
        /// CheckMixedSignatures 是抽象账户混合授权的核心算法，它统一处理三种授权场景：
        /// 1. 纯 N3 账户：threshold=1, 只有 N3 签名者，只通过 Runtime.CheckWitness 计数
        /// 2. 纯 EVM 账户：threshold=1, 只有 EVM 签名者，只通过 verifiedSigners 计数
        /// 3. 混合账户：threshold=2, N3+EVM 签名者，两种签名方式都计数，达到阈值即通过
        /// 
        /// 【两阶段验证模型】
        /// - Verification 阶段：只能验证 N3 签名（通过 Verify 方法 + CheckNativeSignatures）
        /// - Application 阶段：可以验证 EVM 签名（通过 ExecuteMetaTx + CheckMixedSignatures）
        /// 
        /// 【为什么需要 CheckMixedSignatures】
        /// 1. EVM 签名无法在 Verification 阶段验证（EIP-712 数据在交易参数中）
        /// 2. 需要在 Application 阶段同时支持 N3 和 EVM 签名
        /// 3. 实现统一的阈值检查，无论签名来源
        /// 
        /// 【verifiedSigners 参数的来源】
        /// - 由 ExecuteMetaTx/ExecuteMetaTxByAddress 方法生成
        /// - 通过 EIP-712 签名验证后，从 uncompressedPubKeys 恢复出 EVM 地址
        /// - 这些地址已经过密码学验证，可以安全地用于授权检查
        /// 
        /// 【计数逻辑】
        /// 对于 roles 列表中的每个角色地址：
        /// 1. 先检查是否在 verifiedSigners 中（EVM 签名）
        /// 2. 如果不在，再检查 Runtime.CheckWitness（N3 签名）
        /// 3. 任一匹配则 count++
        /// 4. 最终返回 count >= threshold
        /// 
        /// 【与 CheckNativeSignatures 的区别】
        /// - CheckNativeSignatures：只检查 Runtime.CheckWitness，用于 Verification 阶段
        /// - CheckMixedSignatures：同时检查 verifiedSigners 和 CheckWitness，用于 Application 阶段
        /// </remarks>
        private static bool CheckMixedSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold, UInt160[] verifiedSigners)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                bool matched = false;

                // 1. 检查是否为已验证的 EVM 签名
                // Check if it's an explicitly verified EVM signature
                // 
                // 【EVM 签名验证路径】
                // - ExecuteMetaTx 已通过 EIP-712 验证了签名的密码学有效性
                // - verifiedSigners 数组包含从签名恢复的 EVM 地址（通过 DeriveEthAddress）
                // - 这里只需检查角色列表中是否包含这些已验证的地址
                // 
                // This handles Meta-Transactions where an Ethereum user has signed an EIP-712 payload.
                // The signature is passed in the args, recovered via ecrecover in ExecuteMetaTx, and passed here.
                if (verifiedSigners != null)
                {
                    foreach (var signer in verifiedSigners)
                    {
                        if (roles[i] == signer)
                        {
                            count++;
                            matched = true;
                            break;
                        }
                    }
                }

                // 2. 如果未匹配 EVM 签名，检查是否有 N3 原生见证
                // If not matched explicitly, check if a native Neo witness is attached
                // 
                // 【N3 签名验证路径】
                // - Runtime.CheckWitness 检查交易的 Signers 和 Witnesses 字段
                // - 这允许中继器或第二个管理员使用 Neo 钱包附加原生签名
                // - 实现在同一执行过程中安全聚合 N3 和 EVM 签名，满足 threshold > 1 的场景
                // 
                // 【混合授权示例】
                // 假设 threshold=2, roles=[N3_Admin, EVM_Admin]
                // - EVM_Admin 通过 EIP-712 签名 → verifiedSigners 包含 EVM_Admin → count=1
                // - N3_Admin 附加交易签名 → Runtime.CheckWitness(N3_Admin)=true → count=2
                // - count >= threshold → 授权通过
                // 
                // This allows a Relayer or a secondary Admin using a Neo wallet to attach their native
                // signature to the transaction wrapper, securely aggregating N3 and EVM signatures 
                // in the same execution pass to meet thresholds > 1.
                if (!matched && Runtime.CheckWitness(roles[i]))
                {
                    count++;
                }
            }
            return count >= threshold;
        }
    }
}
