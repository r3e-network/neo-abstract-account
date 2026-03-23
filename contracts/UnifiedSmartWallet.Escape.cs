using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        // ========================================================================
        // 6. L1 Escape Hatch (Native Fallback)
        // ========================================================================

        /// <summary>
        /// Starts the backup-owner escape flow for a compromised or unavailable verifier setup.
        /// </summary>
        public static void InitiateEscape(UInt160 accountId)
        {
            AccountState state = GetAccountState(accountId);
            AssertNoMarketEscrow(accountId);
            ExecutionEngine.Assert(state.BackupOwner != UInt160.Zero, "No backup owner");
            ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner), "Only backup owner can initiate");

            byte[] escapeKey = Helper.Concat(Prefix_EscapeLastInitiated, (byte[])accountId);
            ByteString? lastInitiated = Storage.Get(Storage.CurrentContext, escapeKey);
            if (lastInitiated != null)
            {
                BigInteger lastTime = (BigInteger)lastInitiated;
                ExecutionEngine.Assert(Runtime.Time >= lastTime + EscapeCooldownSeconds, "Escape cooldown active");
            }

            state.EscapeTriggeredAt = Runtime.Time;
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
            Storage.Put(Storage.CurrentContext, escapeKey, Runtime.Time);
        }

        /// <summary>
        /// Completes the escape flow after the configured timelock and rotates to a new verifier.
        /// </summary>
        public static void FinalizeEscape(UInt160 accountId, UInt160 newVerifier)
        {
            AccountState state = GetAccountState(accountId);
            AssertNoMarketEscrow(accountId);
            ExecutionEngine.Assert(state.EscapeTriggeredAt > 0, "Escape not initiated");
            ExecutionEngine.Assert(Runtime.Time >= state.EscapeTriggeredAt + state.EscapeTimelock, "Timelock active");
            ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner), "Only backup owner can finalize");

            state.Verifier = newVerifier;
            state.EscapeTriggeredAt = 0;
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));

            byte[] escapeKey = Helper.Concat(Prefix_EscapeLastInitiated, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, escapeKey);
        }
    }
}
