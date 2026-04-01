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
            ExecutionEngine.Assert(accountId != null && accountId != UInt160.Zero, "Account id required");
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "Backup owner required");
            ExecutionEngine.Assert(Runtime.CheckWitness(backupOwner), "Backup owner witness required");
            ExecutionEngine.Assert(escapeTimelock >= 604800, "Escape timelock must be at least 7 days");
            ExecutionEngine.Assert(escapeTimelock <= 7776000, "Escape timelock must not exceed 90 days");

            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId!);
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
            OnAccountRegistered(accountId, backupOwner!, verifier, hookId);
            if (verifier != UInt160.Zero)
            {
                OnModuleInstalled(accountId, ModuleTypeVerifier, verifier);
            }
            if (hookId != UInt160.Zero)
            {
                OnModuleInstalled(accountId, ModuleTypeHook, hookId);
            }

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
                if (newHookId != UInt160.Zero)
                {
                    OnModuleInstalled(accountId, ModuleTypeHook, newHookId);
                }
                OnHookUpdateConfirmed(accountId, newHookId);
                return;
            }

            byte[] key2 = Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId);
            ByteString? existing = Storage.Get(Storage.CurrentContext, key2);
            ExecutionEngine.Assert(existing == null, "Cancel or confirm pending update first");

            PendingConfigUpdate update = new PendingConfigUpdate
            {
                NewHookId = newHookId,
                InitiatedAt = Runtime.Time
            };
            Storage.Put(Storage.CurrentContext, key2, StdLib.Serialize(update));
            OnModuleUpdateInitiated(accountId, ModuleTypeHook, newHookId);
            OnHookUpdateInitiated(accountId, newHookId);
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
            UInt160 previousHook = state.HookId;

            // Clear old plugin's per-account state before replacing it
            // Must set config context so the plugin's ValidateConfigCaller succeeds
            if (previousHook != UInt160.Zero)
            {
                SetHookConfigContext(accountId, previousHook);
                try { Contract.Call(previousHook, "clearAccount", CallFlags.All, new object[] { accountId }); }
                catch { } // Plugin may not implement clearAccount
                finally { ClearHookConfigContext(accountId); }
            }

            state.HookId = pending.NewHookId;
            byte[] stateKey = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, stateKey, StdLib.Serialize(state));
            Storage.Delete(Storage.CurrentContext, key);
            if (pending.NewHookId == UInt160.Zero)
            {
                if (previousHook != UInt160.Zero)
                {
                    OnModuleRemoved(accountId, ModuleTypeHook, previousHook);
                }
            }
            else
            {
                OnModuleUpdateConfirmed(accountId, ModuleTypeHook, pending.NewHookId);
            }
            OnHookUpdateConfirmed(accountId, pending.NewHookId);
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
                if (newVerifier != UInt160.Zero)
                {
                    OnModuleInstalled(accountId, ModuleTypeVerifier, newVerifier);
                }
                OnVerifierUpdateConfirmed(accountId, newVerifier);
                return;
            }

            byte[] key2 = Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId);
            ByteString? existing = Storage.Get(Storage.CurrentContext, key2);
            ExecutionEngine.Assert(existing == null, "Cancel or confirm pending update first");

            PendingConfigUpdate update = new PendingConfigUpdate
            {
                NewVerifier = newVerifier,
                VerifierParams = verifierParams,
                InitiatedAt = Runtime.Time
            };
            Storage.Put(Storage.CurrentContext, key2, StdLib.Serialize(update));
            OnModuleUpdateInitiated(accountId, ModuleTypeVerifier, newVerifier);
            OnVerifierUpdateInitiated(accountId, newVerifier);
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
            UInt160 previousVerifier = state.Verifier;

            // Clear old plugin's per-account state before replacing it
            // Must set config context so the plugin's ValidateConfigCaller succeeds
            if (previousVerifier != UInt160.Zero)
            {
                SetVerifierConfigContext(accountId, previousVerifier);
                try { Contract.Call(previousVerifier, "clearAccount", CallFlags.All, new object[] { accountId }); }
                catch { } // Plugin may not implement clearAccount
                finally { ClearVerifierConfigContext(accountId); }
            }

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
            if (pending.NewVerifier == UInt160.Zero)
            {
                if (previousVerifier != UInt160.Zero)
                {
                    OnModuleRemoved(accountId, ModuleTypeVerifier, previousVerifier);
                }
            }
            else
            {
                OnModuleUpdateConfirmed(accountId, ModuleTypeVerifier, pending.NewVerifier);
            }
            OnVerifierUpdateConfirmed(accountId, pending.NewVerifier);
        }

        private static readonly string[] AllowedVerifierMethods = new string[]
        {
            "setPublicKey",
            "clearAccount",
            "setSessionKey",
            "clearSessionKey",
            "setConfig",
            "createSubscription",
            "setDKIMRegistry"
        };

        private static readonly string[] AllowedHookMethods = new string[]
        {
            "setDailyLimit",
            "setWhitelist",
            "setRestrictedToken",
            "requireCredentialForContract",
            "setRegistry",
            "setHooks",
            "setConfig",
            "clearAccount"
        };

        private static bool IsMethodAllowed(string method, string[] allowlist)
        {
            for (int i = 0; i < allowlist.Length; i++)
            {
                if (method == allowlist[i]) return true;
            }
            return false;
        }

        /// <summary>
        /// Allows the backup owner to call an account verifier for configuration or maintenance tasks.
        /// Only methods in the allowlist may be called to prevent timelock bypass.
        /// </summary>
        public static object CallVerifier(UInt160 accountId, string method, object[] args)
        {
            ExecutionEngine.Assert(IsMethodAllowed(method, AllowedVerifierMethods), "Verifier method not allowed");
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
        /// Only methods in the allowlist may be called to prevent timelock bypass.
        /// </summary>
        public static object CallHook(UInt160 accountId, string method, object[] args)
        {
            ExecutionEngine.Assert(IsMethodAllowed(method, AllowedHookMethods), "Hook method not allowed");
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
