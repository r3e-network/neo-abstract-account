using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Admin helpers mutate the durable account configuration: signer sets, thresholds, target policies, verifier
    // hooks, and deterministic address binding. All of these methods eventually funnel through AssertIsSigner so the
    // same authorization rules apply to native, dome, and meta-transaction initiated configuration changes.
    public partial class UnifiedSmartWallet
    {
        // An "admin-capable" caller can be: (1) a native admin quorum, (2) a dome signer after timeout + oracle
        // unlock, or (3) a recovered meta-tx signer set carried through the temporary execution context.
        private static void AssertIsSigner(ByteString accountId)
        {
            AssertAccountExists(accountId);
            AssertNoExternalMutationDuringExecution(accountId);

            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                bool isAuthorized = (bool)Contract.Call(
                    customVerifier,
                    "verifySigner",
                    CallFlags.ReadOnly,
                    new object[] { accountId });
                if (isAuthorized)
                {
                    UpdateLastActiveTimestamp(accountId);
                    return;
                }

                UInt160[] verifierMetaSigners = GetMetaTxContextSigners(accountId);
                if (verifierMetaSigners.Length > 0 && Runtime.CallingScriptHash == Runtime.ExecutingScriptHash)
                {
                    isAuthorized = (bool)Contract.Call(
                        customVerifier,
                        "verifySignerMetaTx",
                        CallFlags.ReadOnly,
                        new object[] { accountId, verifierMetaSigners });
                    if (isAuthorized)
                    {
                        UpdateLastActiveTimestamp(accountId);
                        return;
                    }
                }

                ExecutionEngine.Assert(false, "Unauthorized by custom verifier");
            }

            // For Neo native signers
            int threshold = GetThreshold(accountId);
            ExecutionEngine.Assert(threshold > 0, "Admin threshold must be > 0 to modify configurations");

            if (CheckNativeSignatures(GetSigners(accountId), threshold))
            {
                UpdateLastActiveTimestamp(accountId);
                return;
            }

            // Check if Dome conditions are met
            bool isDome = CheckNativeSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId));
            if (isDome)
            {
                BigInteger timeout = GetDomeTimeout(accountId);
                if (timeout > 0)
                {
                    BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                    if (Runtime.Time >= lastActive + timeout && IsDomeOracleUnlocked(accountId))
                    {
                        UpdateLastActiveTimestamp(accountId);
                        return;
                    }
                }
            }

            // MetaTx admin context is only valid for internal self-calls from ExecuteMetaTx.
            UInt160[] explicitSigners = GetMetaTxContextSigners(accountId);
            if (explicitSigners.Length > 0 && Runtime.CallingScriptHash == Runtime.ExecutingScriptHash)
            {
                if (CheckMixedSignatures(GetSigners(accountId), threshold, explicitSigners))
                {
                    UpdateLastActiveTimestamp(accountId);
                    return;
                }
                
                // MetaTx Dome Check
                bool metaDome = CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners);
                if (metaDome)
                {
                    BigInteger timeout = GetDomeTimeout(accountId);
                    if (timeout > 0)
                    {
                        BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                        if (Runtime.Time >= lastActive + timeout && IsDomeOracleUnlocked(accountId))
                        {
                            UpdateLastActiveTimestamp(accountId);
                            return;
                        }
                    }
                }
            }

            ExecutionEngine.Assert(false, "Unauthorized admin");
        }

        /// <summary>
        /// Replaces the admin signer set and threshold for the account. Admins are the highest-privilege group and can
        /// reconfigure every other policy surface on the wallet.
        /// </summary>
        public static void SetSigners(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> signers, int threshold)
        {
            AssertIsSigner(accountId);
            SetSignersInternal(accountId, signers, threshold);
        }

        public static void SetSignersByAddress(UInt160 accountAddress, Neo.SmartContract.Framework.List<UInt160> signers, int threshold)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetSigners(accountId, signers, threshold);
        }

        private static void SetSignersInternal(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> signers, int threshold)
        {
            ExecutionEngine.Assert(signers != null && signers.Count > 0, "Admins are mandatory");
            Neo.SmartContract.Framework.List<UInt160> validatedSigners = signers!;
            AssertUniqueAccounts(validatedSigners);
            ExecutionEngine.Assert(threshold <= validatedSigners.Count && threshold >= 0, "Invalid threshold");

            Neo.SmartContract.Framework.List<UInt160> oldSigners = GetSigners(accountId);
            for (int i = 0; i < oldSigners.Count; i++)
            {
                RemoveFromSignerIndex(oldSigners[i], accountId);
            }

            for (int i = 0; i < validatedSigners.Count; i++)
            {
                AddToSignerIndex(validatedSigners[i], accountId);
            }

            StorageMap signersMap = new StorageMap(Storage.CurrentContext, SignersPrefix);
            StorageMap tMap = new StorageMap(Storage.CurrentContext, ThresholdPrefix);
            signersMap.Put(GetStorageKey(accountId), StdLib.Serialize(validatedSigners));
            tMap.Put(GetStorageKey(accountId), threshold);
            OnRoleUpdated(accountId, "Signers", validatedSigners, threshold);
        }

        /// <summary>
        /// Returns the current admin signer set for the account.
        /// </summary>
        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetSigners(ByteString accountId)
        {
            StorageMap signersMap = new StorageMap(Storage.CurrentContext, SignersPrefix);
            ByteString? data = signersMap.Get(GetStorageKey(accountId));
            if (data == null) return new Neo.SmartContract.Framework.List<UInt160>();
            return (Neo.SmartContract.Framework.List<UInt160>)StdLib.Deserialize(data);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetSignersByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetSigners(accountId);
        }

        [Safe]
        public static int GetThreshold(ByteString accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, ThresholdPrefix);
            ByteString? data = tMap.Get(GetStorageKey(accountId));
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        [Safe]
        public static int GetThresholdByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetThreshold(accountId);
        }

        

        /// <summary>
        /// Configures the optional dome signer set used for inactivity recovery. Dome signers only become valid after the
        /// configured timeout has elapsed and the oracle path has explicitly unlocked the account.
        /// </summary>
        public static void SetDomeAccounts(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> domes, int threshold, BigInteger timeoutPeriod)
        {
            AssertIsSigner(accountId);
            SetDomeAccountsInternal(accountId, domes, threshold, timeoutPeriod);
        }

        public static void SetDomeAccountsByAddress(UInt160 accountAddress, Neo.SmartContract.Framework.List<UInt160> domes, int threshold, BigInteger timeoutPeriod)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetDomeAccounts(accountId, domes, threshold, timeoutPeriod);
        }

        private static void SetDomeAccountsInternal(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> domes, int threshold, BigInteger timeoutPeriod)
        {
            if (domes == null)
            {
                domes = new Neo.SmartContract.Framework.List<UInt160>();
            }
            AssertUniqueAccounts(domes);
            if (domes.Count == 0)
            {
                ExecutionEngine.Assert(threshold == 0, "Invalid threshold");
                ExecutionEngine.Assert(timeoutPeriod == 0, "Invalid timeout");
            }
            else
            {
                ExecutionEngine.Assert(threshold <= domes.Count && threshold > 0, "Invalid threshold");
                ExecutionEngine.Assert(timeoutPeriod > 0, "Invalid timeout");
            }

            StorageMap dMap = new StorageMap(Storage.CurrentContext, DomePrefix);
            StorageMap tMap = new StorageMap(Storage.CurrentContext, DomeThresholdPrefix);
            StorageMap toMap = new StorageMap(Storage.CurrentContext, DomeTimeoutPrefix);

            dMap.Put(GetStorageKey(accountId), StdLib.Serialize(domes));
            tMap.Put(GetStorageKey(accountId), threshold);
            toMap.Put(GetStorageKey(accountId), timeoutPeriod);
            ResetDomeOracleState(accountId);
            OnRoleUpdated(accountId, "Dome", domes, threshold);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetDomeAccounts(ByteString accountId)
        {
            StorageMap dMap = new StorageMap(Storage.CurrentContext, DomePrefix);
            ByteString? data = dMap.Get(GetStorageKey(accountId));
            if (data == null) return new Neo.SmartContract.Framework.List<UInt160>();
            return (Neo.SmartContract.Framework.List<UInt160>)StdLib.Deserialize(data);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetDomeAccountsByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetDomeAccounts(accountId);
        }

        [Safe]
        public static int GetDomeThreshold(ByteString accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, DomeThresholdPrefix);
            ByteString? data = tMap.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (int)(BigInteger)data;
        }

        [Safe]
        public static int GetDomeThresholdByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetDomeThreshold(accountId);
        }

        [Safe]
        public static BigInteger GetDomeTimeout(ByteString accountId)
        {
            StorageMap toMap = new StorageMap(Storage.CurrentContext, DomeTimeoutPrefix);
            ByteString? data = toMap.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetDomeTimeoutByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetDomeTimeout(accountId);
        }

        /// <summary>
        /// Blocks or unblocks a target contract completely for this account. Blacklist checks run before any downstream
        /// dispatch regardless of whether the call comes from native or meta-transaction execution.
        /// </summary>
        public static void SetBlacklist(ByteString accountId, UInt160 target, bool isBlacklisted)
        {
            AssertIsSigner(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)));
            if (isBlacklisted) map.Put(target, (ByteString)new byte[] { 1 });
            else map.Delete(target);
            OnPolicyUpdated(accountId, "Blacklist", target, isBlacklisted ? (ByteString)new byte[] { 1 } : (ByteString)new byte[] { 0 });
        }

        public static void SetBlacklistByAddress(UInt160 accountAddress, UInt160 target, bool isBlacklisted)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetBlacklist(accountId, target, isBlacklisted);
        }

        /// <summary>
        /// Enables or disables whitelist-only mode. When enabled, targets must be explicitly whitelisted before they can
        /// be called through the wallet.
        /// </summary>
        public static void SetWhitelistMode(ByteString accountId, bool enabled)
        {
            AssertIsSigner(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            if (enabled) map.Put(GetStorageKey(accountId), (ByteString)new byte[] { 1 });
            else map.Delete(GetStorageKey(accountId));
            OnPolicyUpdated(accountId, "WhitelistMode", UInt160.Zero, enabled ? (ByteString)new byte[] { 1 } : (ByteString)new byte[] { 0 });
        }

        public static void SetWhitelistModeByAddress(UInt160 accountAddress, bool enabled)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetWhitelistMode(accountId, enabled);
        }

        /// <summary>
        /// Adds or removes a target from the account's allowlist. Asset-moving calls also require the target to be
        /// whitelisted even when whitelist-only mode is disabled.
        /// </summary>
        public static void SetWhitelist(ByteString accountId, UInt160 target, bool isWhitelisted)
        {
            AssertIsSigner(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)));
            if (isWhitelisted) map.Put(target, (ByteString)new byte[] { 1 });
            else map.Delete(target);
            OnPolicyUpdated(accountId, "Whitelist", target, isWhitelisted ? (ByteString)new byte[] { 1 } : (ByteString)new byte[] { 0 });
        }

        public static void SetWhitelistByAddress(UInt160 accountAddress, UInt160 target, bool isWhitelisted)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetWhitelist(accountId, target, isWhitelisted);
        }

        /// <summary>
        /// Caps the amount that can move through token <c>transfer</c> or <c>approve</c> calls for this account. A non-
        /// positive limit means no cap is enforced for that token.
        /// </summary>
        public static void SetMaxTransfer(ByteString accountId, UInt160 token, BigInteger maxAmount)
        {
            AssertIsSigner(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, GetStorageKey(accountId)));
            if (maxAmount > 0) map.Put(token, (ByteString)maxAmount);
            else map.Delete(token);
            OnPolicyUpdated(accountId, "MaxTransfer", token, (ByteString)maxAmount);
        }

        public static void SetMaxTransferByAddress(UInt160 accountAddress, UInt160 token, BigInteger maxAmount)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetMaxTransfer(accountId, token, maxAmount);
        }

        /// <summary>
        /// Binds the logical account to its deterministic proxy address so address-based entrypoints and witness checks
        /// resolve to the same stored account state.
        /// </summary>
        public static void BindAccountAddress(ByteString accountId, UInt160 accountAddress)
        {
            AssertIsSigner(accountId);
            BindAccountAddressInternal(accountId, accountAddress);
        }

        /// <summary>
        /// Installs or clears a custom verifier contract. When set, authorization delegates to that verifier instead of
        /// directly checking native role signatures.
        /// </summary>
        public static void SetVerifierContract(ByteString accountId, UInt160 verifierContract)
        {
            AssertIsSigner(accountId);
            SetVerifierContractInternal(accountId, verifierContract);
        }

        public static void SetVerifierContractByAddress(UInt160 accountAddress, UInt160 verifierContract)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetVerifierContract(accountId, verifierContract);
        }

        /// <summary>
        /// Resolves the logical account id currently bound to a deterministic proxy address.
        /// </summary>
        [Safe]
        public static ByteString GetAccountIdByAddress(UInt160 accountAddress)
        {
            AssertValidAccountAddress(accountAddress);
            StorageMap map = new StorageMap(Storage.CurrentContext, AccountAddressToIdPrefix);
            return map.Get(accountAddress)!;
        }

        /// <summary>
        /// Returns the bound deterministic proxy address for a logical account id.
        /// </summary>
        [Safe]
        public static UInt160 GetAccountAddress(ByteString accountId)
        {
            AssertAccountExists(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, AccountIdToAddressPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        private static void AssertUniqueAccounts(Neo.SmartContract.Framework.List<UInt160>? accounts)
        {
            if (accounts == null) return;
            ExecutionEngine.Assert(accounts.Count <= 20, "Too many role accounts");
            for (int i = 0; i < accounts.Count; i++)
            {
                UInt160 current = accounts[i];
                ExecutionEngine.Assert(current != null && current != UInt160.Zero, "Invalid role account");
                for (int j = i + 1; j < accounts.Count; j++)
                {
                    ExecutionEngine.Assert(current != accounts[j], "Duplicate role member");
                }
            }
        }
    }
}
