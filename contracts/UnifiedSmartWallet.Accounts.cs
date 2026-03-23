using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        // ========================================================================
        // 2. Account Initialization / Configuration
        // ========================================================================

        /// <summary>
        /// Creates a new deterministic AA account and optionally configures its initial verifier and hook.
        /// </summary>
        public static void RegisterAccount(UInt160 accountId, UInt160 verifier, ByteString verifierParams, UInt160 hookId, UInt160 backupOwner, uint escapeTimelock)
        {
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "Backup owner required");
            ExecutionEngine.Assert(Runtime.CheckWitness(backupOwner!), "Backup owner witness required");
            ExecutionEngine.Assert(escapeTimelock > 0, "Escape timelock required");

            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, key) == null, "Account already exists");

            AccountState state = new AccountState
            {
                Verifier = verifier!,
                HookId = hookId!,
                BackupOwner = backupOwner!,
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
        /// Initiates a hook plugin replacement with a timelock delay for security.
        /// If no hook is currently set, the hook is updated instantly.
        /// </summary>
        public static void UpdateHook(UInt160 accountId, UInt160 newHookId)
        {
            AssertBackupOwner(accountId);
            AssertNoMarketEscrow(accountId);

            AccountState state = GetAccountState(accountId);

            if (state.HookId == UInt160.Zero)
            {
                state.HookId = newHookId;
                byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
                Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
                return;
            }

            byte[] key2 = Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId);
            ByteString? existing = Storage.Get(Storage.CurrentContext, key2);
            if (existing != null)
            {
                PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(existing);
                ExecutionEngine.Assert(Runtime.Time >= pending.InitiatedAt + ConfigUpdateTimelockSeconds, "Pending update timelock active");
            }

            PendingConfigUpdate update = new PendingConfigUpdate
            {
                NewHookId = newHookId,
                InitiatedAt = Runtime.Time
            };
            Storage.Put(Storage.CurrentContext, key2, StdLib.Serialize(update));
        }

        /// <summary>
        /// Confirms a pending hook update after the timelock has elapsed.
        /// </summary>
        public static void ConfirmHookUpdate(UInt160 accountId)
        {
            AssertBackupOwner(accountId);
            AssertNoMarketEscrow(accountId);

            byte[] key = Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "No pending hook update");

            PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(data!);
            ExecutionEngine.Assert(Runtime.Time >= pending.InitiatedAt + ConfigUpdateTimelockSeconds, "Timelock not elapsed");

            AccountState state = GetAccountState(accountId);
            state.HookId = pending.NewHookId;
            byte[] stateKey = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, stateKey, StdLib.Serialize(state));
            Storage.Delete(Storage.CurrentContext, key);
        }

        /// <summary>
        /// Initiates a verifier plugin replacement with a timelock delay for security.
        /// If no verifier is currently set, the verifier is updated instantly.
        /// </summary>
        public static void UpdateVerifier(UInt160 accountId, UInt160 newVerifier, ByteString verifierParams)
        {
            AssertBackupOwner(accountId);
            AssertNoMarketEscrow(accountId);

            AccountState state = GetAccountState(accountId);

            if (state.Verifier == UInt160.Zero)
            {
                state.Verifier = newVerifier;
                byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
                Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));

                if (newVerifier != UInt160.Zero && verifierParams != null && verifierParams.Length > 0)
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
                return;
            }

            byte[] key2 = Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId);
            ByteString? existing = Storage.Get(Storage.CurrentContext, key2);
            if (existing != null)
            {
                PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(existing);
                ExecutionEngine.Assert(Runtime.Time >= pending.InitiatedAt + ConfigUpdateTimelockSeconds, "Pending update timelock active");
            }

            PendingConfigUpdate update = new PendingConfigUpdate
            {
                NewVerifier = newVerifier,
                VerifierParams = verifierParams,
                InitiatedAt = Runtime.Time
            };
            Storage.Put(Storage.CurrentContext, key2, StdLib.Serialize(update));
        }

        /// <summary>
        /// Confirms a pending verifier update after the timelock has elapsed.
        /// </summary>
        public static void ConfirmVerifierUpdate(UInt160 accountId)
        {
            AssertBackupOwner(accountId);
            AssertNoMarketEscrow(accountId);

            byte[] key = Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "No pending verifier update");

            PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(data!);
            ExecutionEngine.Assert(Runtime.Time >= pending.InitiatedAt + ConfigUpdateTimelockSeconds, "Timelock not elapsed");

            AccountState state = GetAccountState(accountId);
            state.Verifier = pending.NewVerifier;
            byte[] stateKey = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, stateKey, StdLib.Serialize(state));

            if (pending.NewVerifier != UInt160.Zero && pending.VerifierParams != null && pending.VerifierParams.Length > 0)
            {
                SetVerifierConfigContext(accountId, pending.NewVerifier);
                try
                {
                    Contract.Call(pending.NewVerifier, "setPublicKey", CallFlags.All, new object[] { accountId, pending.VerifierParams });
                }
                finally
                {
                    ClearVerifierConfigContext(accountId);
                }
            }

            Storage.Delete(Storage.CurrentContext, key);
        }

        /// <summary>
        /// Allows the backup owner to call an account verifier for configuration or maintenance tasks.
        /// </summary>
        public static object CallVerifier(UInt160 accountId, string method, object[] args)
        {
            AssertBackupOwner(accountId);
            AssertNoMarketEscrow(accountId);
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.Verifier != null && state.Verifier != UInt160.Zero, "Verifier not configured");

            SetVerifierConfigContext(accountId, state.Verifier!);
            try
            {
                return Contract.Call(state.Verifier!, method, CallFlags.All, args);
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
            AssertNoMarketEscrow(accountId);
            AccountState state = GetAccountState(accountId);
            ExecutionEngine.Assert(state.HookId != null && state.HookId != UInt160.Zero, "Hook not configured");

            SetHookConfigContext(accountId, state.HookId!);
            try
            {
                return Contract.Call(state.HookId!, method, CallFlags.All, args);
            }
            finally
            {
                ClearHookConfigContext(accountId);
            }
        }
    }
}
