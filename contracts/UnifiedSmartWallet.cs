using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount
{
    /// <summary>
    /// Canonical Neo N3 AA core for the V3 runtime.
    /// </summary>
    /// <remarks>
    /// This contract owns account state, nonce management, verifier and hook routing,
    /// backup-owner recovery, and the final target-contract execution path. Users normally:
    /// 1. register an account with <c>RegisterAccount</c>,
    /// 2. optionally bind verifier and hook plugins,
    /// 3. submit one or more <c>UserOperation</c> payloads through <c>ExecuteUserOp</c>.
    /// Security-sensitive configuration changes are always gated by the backup owner witness.
    /// </remarks>
    [DisplayName("UnifiedSmartWalletV3")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "ERC-4337 Aligned Minimalist AA Engine for Neo N3")]
    public class UnifiedSmartWallet : SmartContract
    {
        // 极致收敛的存储前缀
        private static readonly byte[] Prefix_AccountState = new byte[] { 0x01 };
        private static readonly byte[] Prefix_VerifyContext = new byte[] { 0x02 };
        private static readonly byte[] Prefix_Nonce = new byte[] { 0x03 };
        private static readonly byte[] Prefix_VerifierConfigContext = new byte[] { 0x04 };
        private static readonly byte[] Prefix_HookConfigContext = new byte[] { 0x05 };
        
        // ========================================================================
        // 1. 数据结构 (对齐 ERC-4337 UserOperation)
        // ========================================================================
        public class AccountState
        {
            // 对应 ERC-4337 中的 Account 自身的权限验证器 (如 Web3Auth, TEE)
            public UInt160 Verifier;         
            public UInt160 HookId;           // 策略与风控插件生态 (Hook / Middleware Plugins)
            
            // --- L1 Native 逃生舱 ---
            public UInt160 BackupOwner;      // 绑定的底层 N3 EOA 钱包 (必须是合法公钥的Hash)
            public uint EscapeTimelock;      // 逃生锁定时间(秒)
            public BigInteger EscapeTriggeredAt; 
        }

        // 相当于 ERC-4337 的 UserOperation 结构体
        public class UserOperation
        {
            public UInt160 TargetContract;   // 对应 callData 里的 to
            public string Method;            // 对应 callData 里的 method
            public object[] Args;            // 对应 callData 里的 params
            public BigInteger Nonce;         // 2D Nonce or Salt
            public BigInteger Deadline;      // 防重放过期时间
            public ByteString Signature;     // EIP-712 / TEE 签名
        }

        // ========================================================================
        // 2. 账户初始化 (Factory 模式的雏形)
        // ========================================================================
        /// <summary>
        /// Creates a new deterministic AA account and optionally configures its initial verifier and hook.
        /// </summary>
        public static void RegisterAccount(UInt160 accountId, UInt160 verifier, ByteString verifierParams, UInt160 hookId, UInt160 backupOwner, uint escapeTimelock)
        {
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "Backup owner required");
            ExecutionEngine.Assert(Runtime.CheckWitness(backupOwner), "Backup owner witness required");
            ExecutionEngine.Assert(escapeTimelock > 0, "Escape timelock required");

            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, key) == null, "Account already exists");

            AccountState state = new AccountState
            {
                Verifier = verifier,
                HookId = hookId,
                BackupOwner = backupOwner,
                EscapeTimelock = escapeTimelock,
                EscapeTriggeredAt = 0
            };
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
            
            if (verifier != UInt160.Zero && verifierParams != null && verifierParams.Length > 0)
            {
                SetVerifierConfigContext(accountId, verifier);
                try
                {
                    Contract.Call(verifier, "setPublicKey", CallFlags.All, new object[] { accountId, verifierParams });
                }
                finally
                {
                    ClearVerifierConfigContext(accountId);
                }
            }
        }

        /// <summary>
        /// Replaces the hook plugin bound to an account.
        /// </summary>
        public static void UpdateHook(UInt160 accountId, UInt160 newHookId)
        {
            AssertBackupOwner(accountId);
            AccountState state = GetAccountState(accountId);
            state.HookId = newHookId;
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
        }

        /// <summary>
        /// Replaces the verifier plugin bound to an account and optionally pushes verifier setup data.
        /// </summary>
        public static void UpdateVerifier(UInt160 accountId, UInt160 newVerifier, ByteString verifierParams)
        {
            AssertBackupOwner(accountId);

            AccountState state = GetAccountState(accountId);
            state.Verifier = newVerifier;

            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));

            if (newVerifier != null && newVerifier != UInt160.Zero && verifierParams != null && verifierParams.Length > 0)
            {
                SetVerifierConfigContext(accountId, newVerifier);
                try
                {
                    Contract.Call(newVerifier, "setPublicKey", CallFlags.All, new object[] { accountId, verifierParams });
                }
                finally
                {
                    ClearVerifierConfigContext(accountId);
                }
            }
        }

        /// <summary>
        /// Allows the backup owner to call an account verifier for configuration or maintenance tasks.
        /// </summary>
        public static object CallVerifier(UInt160 accountId, string method, object[] args)
        {
            AssertBackupOwner(accountId);
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.Verifier != null && state.Verifier != UInt160.Zero, "Verifier not configured");

            SetVerifierConfigContext(accountId, state.Verifier);
            try
            {
                return Contract.Call(state.Verifier, method, CallFlags.All, args);
            }
            finally
            {
                ClearVerifierConfigContext(accountId);
            }
        }

        /// <summary>
        /// Allows the backup owner to call an account hook for configuration or maintenance tasks.
        /// </summary>
        public static object CallHook(UInt160 accountId, string method, object[] args)
        {
            AssertBackupOwner(accountId);
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.HookId != null && state.HookId != UInt160.Zero, "Hook not configured");

            SetHookConfigContext(accountId, state.HookId);
            try
            {
                return Contract.Call(state.HookId, method, CallFlags.All, args);
            }
            finally
            {
                ClearHookConfigContext(accountId);
            }
        }

        private static AccountState GetAccountState(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "Account not found");
            return (AccountState)StdLib.Deserialize(data!);
        }

        [Safe]
        public static UInt160 GetVerifier(UInt160 accountId)
        {
            return GetAccountState(accountId).Verifier;
        }

        [Safe]
        public static UInt160 GetHook(UInt160 accountId)
        {
            return GetAccountState(accountId).HookId;
        }

        [Safe]
        public static UInt160 GetBackupOwner(UInt160 accountId)
        {
            return GetAccountState(accountId).BackupOwner;
        }

        [Safe]
        public static uint GetEscapeTimelock(UInt160 accountId)
        {
            return GetAccountState(accountId).EscapeTimelock;
        }

        [Safe]
        public static BigInteger GetEscapeTriggeredAt(UInt160 accountId)
        {
            return GetAccountState(accountId).EscapeTriggeredAt;
        }

        [Safe]
        public static bool IsEscapeActive(UInt160 accountId)
        {
            return GetAccountState(accountId).EscapeTriggeredAt > 0;
        }

        [Safe]
        public static BigInteger GetNonce(UInt160 accountId, BigInteger channel)
        {
            byte[] key = Helper.Concat(Prefix_Nonce, (byte[])accountId);
            key = Helper.Concat(key, channel.ToByteArray());

            ByteString? currentData = Storage.Get(Storage.CurrentContext, key);
            return currentData == null ? 0 : (BigInteger)currentData;
        }

        [Safe]
        public static ByteString ComputeArgsHash(object[] args)
        {
            ByteString serialized = (ByteString)StdLib.Serialize(args);
            return (ByteString)Contract.Call(
                Neo.SmartContract.Framework.Native.CryptoLib.Hash,
                "keccak256",
                CallFlags.ReadOnly,
                new object[] { serialized });
        }

        // ========================================================================
        // 3. 核心路由: 验证与执行 (对齐 4337 的 Validate & Call)
        // ========================================================================
        /// <summary>
        /// Canonical execution entrypoint for a single V3 user operation.
        /// </summary>
        /// <remarks>
        /// This path consumes the nonce, checks the verifier or backup-owner witness,
        /// runs the pre-hook, executes the target contract call, and then runs the post-hook.
        /// </remarks>
        public static object ExecuteUserOp(UInt160 accountId, UserOperation op)
        {
            AccountState state = GetAccountState(accountId);

            // [ValidateUserOp 阶段]
            ExecutionEngine.Assert(Runtime.Time <= op.Deadline, "UserOp expired");
            ConsumeNonce(accountId, op.Nonce);

            if (state.Verifier != UInt160.Zero)
            {
                // 委托给插件验签 (如 ecrecover 或 TEE 硬件验签)
                bool isValid = (bool)Contract.Call(state.Verifier, "validateSignature", CallFlags.ReadOnly, new object[] { accountId, op });
                ExecutionEngine.Assert(isValid, "Verifier rejected signature");
            }
            else
            {
                // 无插件时，退化为备份钱包直接授权。accountId 仍作为虚拟账户身份使用，
                // 但实际控制权来自 BackupOwner 的原生 N3 见证。
                ExecutionEngine.Assert(state.BackupOwner != null && state.BackupOwner != UInt160.Zero, "Native fallback requires backup owner");
                ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner), "Native witness failed");
            }

            // 安全防御：如果该账户正处于被盗逃生状态，正常主权操作直接打断逃生
            if (state.EscapeTriggeredAt > 0)
            {
                state.EscapeTriggeredAt = 0;
                byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
                Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
            }

            // [Hook 阶段] pre-execution hook
            if (state.HookId != UInt160.Zero)
            {
                Contract.Call(state.HookId, "preExecute", CallFlags.All, new object[] { accountId, op });
            }

            // [Execution 阶段] 
            // 写入上下文锁，允许 TargetContract 进行反向 CheckWitness 验证
            SetVerifyContext(accountId, op.TargetContract);
            try
            {
                // 动态调用目标合约
                object result = Contract.Call(op.TargetContract, op.Method, CallFlags.All, op.Args);
                
                // [Hook 阶段] post-execution hook
                if (state.HookId != UInt160.Zero)
                {
                    Contract.Call(state.HookId, "postExecute", CallFlags.All, new object[] { accountId, op, result });
                }
                
                return result;
            }
            finally
            {
                ClearVerifyContext(accountId);
            }
        }

        // ========================================================================
        // 3.1 意图引擎: 批量执行 (Intent & Batch)
        // ========================================================================
        /// <summary>
        /// Executes multiple user operations in sequence under the same account context.
        /// </summary>
        public static object[] ExecuteUserOps(UInt160 accountId, UserOperation[] ops)
        {
            object[] results = new object[ops.Length];
            for (int i = 0; i < ops.Length; i++)
            {
                results[i] = ExecuteUserOp(accountId, ops[i]);
            }
            return results;
        }

        // ========================================================================
        // 4. 防重放机制 (ERC-4337 的 2D Nonce 规范)
        // ========================================================================
        private static void ConsumeNonce(UInt160 accountId, BigInteger nonce)
        {
            BigInteger MAX_2D_NONCE = 1_000_000_000_000_000_000; 
            
            if (nonce >= MAX_2D_NONCE)
            {
                // UUID / 随机盐模式
                byte[] key = Helper.Concat(Prefix_Nonce, (byte[])accountId);
                key = Helper.Concat(key, nonce.ToByteArray());
                ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, key) == null, "Salt already used");
                Storage.Put(Storage.CurrentContext, key, new byte[] { 1 });
            }
            else
            {
                // 严格遵守 ERC-4337 的通道递增模式 (Key = Channel, Seq = Sequence)
                BigInteger channel = nonce >> 64;           
                BigInteger sequence = nonce & 0xFFFFFFFFFFFFFFFF; 
                
                byte[] key = Helper.Concat(Prefix_Nonce, (byte[])accountId);
                key = Helper.Concat(key, channel.ToByteArray());
                
                ByteString? currentData = Storage.Get(Storage.CurrentContext, key);
                BigInteger currentSeq = currentData == null ? 0 : (BigInteger)currentData;
                
                ExecutionEngine.Assert(sequence == currentSeq, "Invalid sequence for channel");
                Storage.Put(Storage.CurrentContext, key, currentSeq + 1);
            }
        }

        // ========================================================================
        // 5. N3 魔法：代理验证脚本支持 (保持 N3 特色)
        // ========================================================================
        // 允许外部 DeFi 合约在执行 `ExecuteUserOp` 期间，调用 CheckWitness(accountId)
        [Safe]
        /// <summary>
        /// Temporary witness bridge that lets the target contract recognize the active AA context.
        /// </summary>
        public static bool Verify(UInt160 accountId)
        {
            if (Runtime.Trigger == TriggerType.Application)
            {
                byte[] key = Helper.Concat(Prefix_VerifyContext, (byte[])accountId);
                ByteString? expectedTarget = Storage.Get(Storage.CurrentContext, key);
                return expectedTarget != null && (UInt160)expectedTarget == Runtime.CallingScriptHash;
            }
            return false;
        }

        [Safe]
        public static bool CanConfigureVerifier(UInt160 accountId, UInt160 verifierContract)
        {
            byte[] key = Helper.Concat(Prefix_VerifierConfigContext, (byte[])accountId);
            ByteString? expectedVerifier = Storage.Get(Storage.CurrentContext, key);
            return expectedVerifier != null
                && Runtime.CallingScriptHash == verifierContract
                && (UInt160)expectedVerifier == verifierContract;
        }

        [Safe]
        public static bool CanConfigureHook(UInt160 accountId, UInt160 hookContract)
        {
            byte[] key = Helper.Concat(Prefix_HookConfigContext, (byte[])accountId);
            ByteString? expectedHook = Storage.Get(Storage.CurrentContext, key);
            return expectedHook != null
                && Runtime.CallingScriptHash == hookContract
                && (UInt160)expectedHook == hookContract;
        }

        private static void SetVerifyContext(UInt160 accountId, UInt160 targetContract)
        {
            byte[] key = Helper.Concat(Prefix_VerifyContext, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, (byte[])targetContract);
        }

        private static void ClearVerifyContext(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_VerifyContext, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, key);
        }

        private static void SetVerifierConfigContext(UInt160 accountId, UInt160 verifierContract)
        {
            byte[] key = Helper.Concat(Prefix_VerifierConfigContext, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, (byte[])verifierContract);
        }

        private static void ClearVerifierConfigContext(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_VerifierConfigContext, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, key);
        }

        private static void SetHookConfigContext(UInt160 accountId, UInt160 hookContract)
        {
            byte[] key = Helper.Concat(Prefix_HookConfigContext, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, (byte[])hookContract);
        }

        private static void ClearHookConfigContext(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_HookConfigContext, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, key);
        }

        private static void AssertBackupOwner(UInt160 accountId)
        {
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.BackupOwner != null && state.BackupOwner != UInt160.Zero, "No backup owner");
            ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner), "Unauthorized");
        }

        // ========================================================================
        // 6. L1 逃生舱 (Native 兜底)
        // ========================================================================
        /// <summary>
        /// Starts the backup-owner escape flow for a compromised or unavailable verifier setup.
        /// </summary>
        public static void InitiateEscape(UInt160 accountId)
        {
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.BackupOwner != UInt160.Zero, "No backup owner");
            ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner), "Only backup owner can initiate");
            
            state.EscapeTriggeredAt = Runtime.Time;
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
        }

        /// <summary>
        /// Completes the escape flow after the configured timelock and rotates to a new verifier.
        /// </summary>
        public static void FinalizeEscape(UInt160 accountId, UInt160 newVerifier)
        {
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.EscapeTriggeredAt > 0, "Escape not initiated");
            ExecutionEngine.Assert(Runtime.Time >= state.EscapeTriggeredAt + state.EscapeTimelock, "Timelock active");
            ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner), "Only backup owner can finalize");

            state.Verifier = newVerifier;
            state.EscapeTriggeredAt = 0;
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
        }
    }
}
