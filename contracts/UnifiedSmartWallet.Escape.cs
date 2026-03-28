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
            OnEscapeInitiated?.Invoke(accountId, state.BackupOwner);
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

            UInt160 previousVerifier = state.Verifier;
            state.Verifier = newVerifier;
            state.EscapeTriggeredAt = 0;
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));

            byte[] escapeKey = Helper.Concat(Prefix_EscapeLastInitiated, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, escapeKey);

            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId));
            if (previousVerifier != newVerifier)
            {
                if (newVerifier == UInt160.Zero)
                {
                    if (previousVerifier != UInt160.Zero)
                    {
                        OnModuleRemoved?.Invoke(accountId, ModuleTypeVerifier, previousVerifier);
                    }
                }
                else if (previousVerifier == UInt160.Zero)
                {
                    OnModuleInstalled?.Invoke(accountId, ModuleTypeVerifier, newVerifier);
                }
                else
                {
                    OnModuleUpdateConfirmed?.Invoke(accountId, ModuleTypeVerifier, newVerifier);
                }
            }
            OnEscapeFinalized?.Invoke(accountId, newVerifier);
        }
    }
}
