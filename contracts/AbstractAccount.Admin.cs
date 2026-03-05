using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private static void AssertIsAdmin(ByteString accountId)
        {
            AssertAccountExists(accountId);
            AssertNoExternalMutationDuringExecution(accountId);

            // For Neo native signers
            if (CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId)))
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
                    if (Runtime.Time >= lastActive + timeout && IsDomeOracleUnlocked(accountId)) return;
                }
            }

            // MetaTx admin context is only valid for internal self-calls from ExecuteMetaTx.
            ByteString metaSignerBytes = GetMetaTxContext(accountId);
            if (metaSignerBytes != null && Runtime.CallingScriptHash == Runtime.ExecutingScriptHash)
            {
                UInt160 metaSigner = (UInt160)metaSignerBytes;
                UInt160[] explicitSigners = new UInt160[] { metaSigner };
                if (CheckExplicitSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), explicitSigners))
                {
                    UpdateLastActiveTimestamp(accountId);
                    return;
                }
                
                // MetaTx Dome Check
                bool metaDome = CheckExplicitSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners);
                if (metaDome)
                {
                    BigInteger timeout = GetDomeTimeout(accountId);
                    if (timeout > 0)
                    {
                        BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                        if (Runtime.Time >= lastActive + timeout && IsDomeOracleUnlocked(accountId)) return;
                    }
                }
            }

            ExecutionEngine.Assert(false, "Unauthorized admin");
        }

        public static void SetAdmins(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> admins, int threshold)
        {
            AssertIsAdmin(accountId);
            SetAdminsInternal(accountId, admins, threshold);
        }

        public static void SetAdminsByAddress(UInt160 accountAddress, Neo.SmartContract.Framework.List<UInt160> admins, int threshold)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetAdmins(accountId, admins, threshold);
        }

        private static void SetAdminsInternal(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> admins, int threshold)
        {
            ExecutionEngine.Assert(admins != null && admins.Count > 0, "Admins are mandatory");
            AssertUniqueAccounts(admins);
            ExecutionEngine.Assert(threshold <= admins.Count && threshold > 0, "Invalid threshold");
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            StorageMap tMap = new StorageMap(Storage.CurrentContext, AdminThresholdPrefix);
            adminsMap.Put(GetStorageKey(accountId), StdLib.Serialize(admins));
            tMap.Put(GetStorageKey(accountId), threshold);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetAdmins(ByteString accountId)
        {
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ByteString data = adminsMap.Get(GetStorageKey(accountId));
            if (data == null) return new Neo.SmartContract.Framework.List<UInt160>();
            return (Neo.SmartContract.Framework.List<UInt160>)StdLib.Deserialize(data);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetAdminsByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetAdmins(accountId);
        }

        [Safe]
        public static int GetAdminThreshold(ByteString accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, AdminThresholdPrefix);
            ByteString data = tMap.Get(GetStorageKey(accountId));
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        [Safe]
        public static int GetAdminThresholdByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetAdminThreshold(accountId);
        }

        public static void SetManagers(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> managers, int threshold)
        {
            AssertIsAdmin(accountId);
            SetManagersInternal(accountId, managers, threshold);
        }

        public static void SetManagersByAddress(UInt160 accountAddress, Neo.SmartContract.Framework.List<UInt160> managers, int threshold)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetManagers(accountId, managers, threshold);
        }

        private static void SetManagersInternal(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> managers, int threshold)
        {
            if (managers == null)
            {
                managers = new Neo.SmartContract.Framework.List<UInt160>();
            }
            AssertUniqueAccounts(managers);
            if (managers.Count == 0)
            {
                ExecutionEngine.Assert(threshold == 0, "Invalid threshold");
            }
            else
            {
                ExecutionEngine.Assert(threshold <= managers.Count && threshold > 0, "Invalid threshold");
            }
            StorageMap mMap = new StorageMap(Storage.CurrentContext, ManagersPrefix);
            StorageMap tMap = new StorageMap(Storage.CurrentContext, ManagerThresholdPrefix);
            mMap.Put(GetStorageKey(accountId), StdLib.Serialize(managers));
            tMap.Put(GetStorageKey(accountId), threshold);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetManagers(ByteString accountId)
        {
            StorageMap mMap = new StorageMap(Storage.CurrentContext, ManagersPrefix);
            ByteString data = mMap.Get(GetStorageKey(accountId));
            if (data == null) return new Neo.SmartContract.Framework.List<UInt160>();
            return (Neo.SmartContract.Framework.List<UInt160>)StdLib.Deserialize(data);
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetManagersByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetManagers(accountId);
        }

        [Safe]
        public static int GetManagerThreshold(ByteString accountId)
        {
            StorageMap tMap = new StorageMap(Storage.CurrentContext, ManagerThresholdPrefix);
            ByteString data = tMap.Get(GetStorageKey(accountId));
            if (data == null) return 1;
            return (int)(BigInteger)data;
        }

        [Safe]
        public static int GetManagerThresholdByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetManagerThreshold(accountId);
        }

        public static void SetDomeAccounts(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> domes, int threshold, BigInteger timeoutPeriod)
        {
            AssertIsAdmin(accountId);
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
        }

        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetDomeAccounts(ByteString accountId)
        {
            StorageMap dMap = new StorageMap(Storage.CurrentContext, DomePrefix);
            ByteString data = dMap.Get(GetStorageKey(accountId));
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
            ByteString data = tMap.Get(GetStorageKey(accountId));
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
            ByteString data = toMap.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetDomeTimeoutByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetDomeTimeout(accountId);
        }

        public static void SetBlacklist(ByteString accountId, UInt160 target, bool isBlacklisted)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)));
            if (isBlacklisted) map.Put(target, (ByteString)new byte[] { 1 });
            else map.Delete(target);
        }

        public static void SetBlacklistByAddress(UInt160 accountAddress, UInt160 target, bool isBlacklisted)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetBlacklist(accountId, target, isBlacklisted);
        }

        public static void SetWhitelistMode(ByteString accountId, bool enabled)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            if (enabled) map.Put(GetStorageKey(accountId), (ByteString)new byte[] { 1 });
            else map.Delete(GetStorageKey(accountId));
        }

        public static void SetWhitelistModeByAddress(UInt160 accountAddress, bool enabled)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetWhitelistMode(accountId, enabled);
        }

        public static void SetWhitelist(ByteString accountId, UInt160 target, bool isWhitelisted)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)));
            if (isWhitelisted) map.Put(target, (ByteString)new byte[] { 1 });
            else map.Delete(target);
        }

        public static void SetWhitelistByAddress(UInt160 accountAddress, UInt160 target, bool isWhitelisted)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetWhitelist(accountId, target, isWhitelisted);
        }

        public static void SetMaxTransfer(ByteString accountId, UInt160 token, BigInteger maxAmount)
        {
            AssertIsAdmin(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, GetStorageKey(accountId)));
            if (maxAmount > 0) map.Put(token, (ByteString)maxAmount);
            else map.Delete(token);
        }

        public static void SetMaxTransferByAddress(UInt160 accountAddress, UInt160 token, BigInteger maxAmount)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetMaxTransfer(accountId, token, maxAmount);
        }

        public static void BindAccountAddress(ByteString accountId, UInt160 accountAddress)
        {
            AssertIsAdmin(accountId);
            BindAccountAddressInternal(accountId, accountAddress);
        }

        [Safe]
        public static ByteString GetAccountIdByAddress(UInt160 accountAddress)
        {
            AssertValidAccountAddress(accountAddress);
            StorageMap map = new StorageMap(Storage.CurrentContext, AccountAddressToIdPrefix);
            return map.Get(accountAddress);
        }

        [Safe]
        public static UInt160 GetAccountAddress(ByteString accountId)
        {
            AssertAccountExists(accountId);
            StorageMap map = new StorageMap(Storage.CurrentContext, AccountIdToAddressPrefix);
            ByteString data = map.Get(GetStorageKey(accountId));
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        private static void AssertUniqueAccounts(Neo.SmartContract.Framework.List<UInt160> accounts)
        {
            if (accounts == null) return;
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
