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
    [DisplayName("UnifiedSmartWalletV3")]
    [ManifestExtra("Description", "ERC-4337 Aligned Minimalist AA Engine for Neo N3")]
    public class UnifiedSmartWalletV3 : SmartContract
    {
        // 极致收敛的存储前缀
        private static readonly byte[] Prefix_AccountState = new byte[] { 0x01 };
        private static readonly byte[] Prefix_VerifyContext = new byte[] { 0x02 };
        private static readonly byte[] Prefix_Nonce = new byte[] { 0x03 };
        
        // ========================================================================
        // 1. 数据结构 (对齐 ERC-4337 UserOperation)
        // ========================================================================
        public class AccountState
        {
            // 对应 ERC-4337 中的 Account 自身的权限验证器 (如 Web3Auth, TEE)
            public UInt160 Verifier;         
            
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
        public static void RegisterAccount(UInt160 accountId, UInt160 verifier, UInt160 backupOwner, uint escapeTimelock)
        {
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, key) == null, "Account already exists");

            AccountState state = new AccountState
            {
                Verifier = verifier,
                BackupOwner = backupOwner,
                EscapeTimelock = escapeTimelock,
                EscapeTriggeredAt = 0
            };
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
        }

        private static AccountState GetAccountState(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "Account not found");
            return (AccountState)StdLib.Deserialize(data!);
        }

        // ========================================================================
        // 3. 核心路由: 验证与执行 (对齐 4337 的 Validate & Call)
        // ========================================================================
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
                // 无插件时，退化为纯 N3 见证验证
                ExecutionEngine.Assert(Runtime.CheckWitness(accountId), "Native witness failed");
            }

            // 安全防御：如果该账户正处于被盗逃生状态，正常主权操作直接打断逃生
            if (state.EscapeTriggeredAt > 0)
            {
                state.EscapeTriggeredAt = 0;
                byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
                Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
            }

            // [Execution 阶段] 
            // 写入上下文锁，允许 TargetContract 进行反向 CheckWitness 验证
            SetVerifyContext(accountId, op.TargetContract);
            try
            {
                // 动态调用目标合约
                return Contract.Call(op.TargetContract, op.Method, CallFlags.All, op.Args);
            }
            finally
            {
                ClearVerifyContext(accountId);
            }
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

        // ========================================================================
        // 6. L1 逃生舱 (Native 兜底)
        // ========================================================================
        public static void InitiateEscape(UInt160 accountId)
        {
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.BackupOwner != UInt160.Zero, "No backup owner");
            ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner), "Only backup owner can initiate");
            
            state.EscapeTriggeredAt = Runtime.Time;
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
        }

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
