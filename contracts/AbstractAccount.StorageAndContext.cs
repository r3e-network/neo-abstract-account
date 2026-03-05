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
        private static void AssertValidAccountId(ByteString accountId)
        {
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0 && accountId.Length <= 128, "Invalid accountId");
        }

        private static ByteString GetStorageKey(ByteString accountId)
        {
            if (accountId.Length <= 63) return accountId;
            return CryptoLib.Sha256(accountId);
        }

        private static void AssertValidAccountAddress(UInt160 accountAddress)
        {
            ExecutionEngine.Assert(accountAddress != null && accountAddress != UInt160.Zero, "Invalid accountAddress");
        }

        private static void AssertAccountExists(ByteString accountId)
        {
            AssertValidAccountId(accountId);
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ExecutionEngine.Assert(adminsMap.Get(GetStorageKey(accountId)) != null, "Account does not exist");
        }

        private static ByteString ResolveAccountIdByAddress(UInt160 accountAddress)
        {
            AssertValidAccountAddress(accountAddress);
            StorageMap map = new StorageMap(Storage.CurrentContext, AccountAddressToIdPrefix);
            ByteString accountId = map.Get(accountAddress);
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0, "Account address not registered");
            AssertAccountExists(accountId);
            return accountId;
        }

        private static void CreateAccountInternal(
            ByteString accountId,
            Neo.SmartContract.Framework.List<UInt160> admins,
            int adminThreshold,
            Neo.SmartContract.Framework.List<UInt160> managers,
            int managerThreshold)
        {
            AssertValidAccountId(accountId);
            AssertBootstrapAuthorization(admins, adminThreshold, managers, managerThreshold);

            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ByteString existing = adminsMap.Get(GetStorageKey(accountId));
            ExecutionEngine.Assert(existing == null, "Account already exists");

            SetAdminsInternal(accountId, admins, adminThreshold);
            SetManagersInternal(accountId, managers, managerThreshold);
            UpdateLastActiveTimestamp(accountId);

            var tx = (Transaction)Runtime.Transaction;
            OnAccountCreated(accountId, tx.Sender);
        }

        private static void BindAccountAddressInternal(ByteString accountId, UInt160 accountAddress)
        {
            AssertAccountExists(accountId);
            AssertValidAccountAddress(accountAddress);

            StorageMap addrToIdMap = new StorageMap(Storage.CurrentContext, AccountAddressToIdPrefix);
            ByteString existingId = addrToIdMap.Get(accountAddress);
            if (existingId != null)
            {
                ExecutionEngine.Assert(existingId == accountId, "Account address already bound");
            }

            StorageMap idToAddrMap = new StorageMap(Storage.CurrentContext, AccountIdToAddressPrefix);
            ByteString existingAddress = idToAddrMap.Get(GetStorageKey(accountId));
            if (existingAddress != null)
            {
                ExecutionEngine.Assert((UInt160)existingAddress == accountAddress, "Account already bound to different address");
            }

            addrToIdMap.Put(accountAddress, accountId);
            idToAddrMap.Put(GetStorageKey(accountId), accountAddress);
        }

        private static void AssertBootstrapAuthorization(
            Neo.SmartContract.Framework.List<UInt160> admins,
            int adminThreshold,
            Neo.SmartContract.Framework.List<UInt160> managers,
            int managerThreshold)
        {
            bool adminAuthorized = CheckNativeSignatures(admins, adminThreshold);
            bool managerAuthorized = CheckNativeSignatures(managers, managerThreshold);
            ExecutionEngine.Assert(adminAuthorized || managerAuthorized, "Unauthorized account initialization");
        }

        private static void SetVerifyContext(ByteString accountId, UInt160 targetContract)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifyContextPrefix);
            map.Put(GetStorageKey(accountId), targetContract);
        }

        private static bool HasActiveVerifyContext(ByteString accountId, UInt160 callingScriptHash)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifyContextPrefix);
            ByteString expectedTarget = map.Get(GetStorageKey(accountId));
            if (expectedTarget == null || callingScriptHash == null) return false;
            return (UInt160)expectedTarget == callingScriptHash;
        }

        private static void ClearVerifyContext(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifyContextPrefix);
            map.Delete(GetStorageKey(accountId));
        }

        private static void SetMetaTxContext(ByteString accountId, UInt160 signerHash)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            map.Put(GetStorageKey(accountId), signerHash);
        }

        private static ByteString GetMetaTxContext(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            return map.Get(GetStorageKey(accountId));
        }

        private static void ClearMetaTxContext(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            map.Delete(GetStorageKey(accountId));
        }

        private static void EnterExecution(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            ByteString key = GetStorageKey(accountId);
            ByteString active = map.Get(key);
            ExecutionEngine.Assert(active == null, "Execution in progress");
            map.Put(key, (ByteString)new byte[] { 1 });
        }

        private static void ExitExecution(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            map.Delete(GetStorageKey(accountId));
        }

        private static bool IsExecutionActive(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            return map.Get(GetStorageKey(accountId)) != null;
        }

        private static void UpdateLastActiveTimestamp(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, LastActivePrefix);
            map.Put(GetStorageKey(accountId), Runtime.Time);
            ResetDomeOracleState(accountId);
        }

        private static BigInteger GetLastActiveTimestampForAuth(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, LastActivePrefix);
            ByteString key = GetStorageKey(accountId);
            ByteString data = map.Get(key);
            if (data != null) return (BigInteger)data;

            // Legacy accounts may not have an initialized timestamp; start inactivity window now.
            BigInteger now = Runtime.Time;
            map.Put(key, now);
            return now;
        }

        [Safe]
        public static BigInteger GetLastActiveTimestamp(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, LastActivePrefix);
            ByteString data = map.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetLastActiveTimestampByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastActiveTimestamp(accountId);
        }

        private static void AssertNoExternalMutationDuringExecution(ByteString accountId)
        {
            if (!IsExecutionActive(accountId)) return;
            ExecutionEngine.Assert(Runtime.CallingScriptHash == Runtime.ExecutingScriptHash, "External mutation blocked during execute");
        }

        private static void SetVerifierContractInternal(ByteString accountId, UInt160 verifierContract)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifierContractPrefix);
            if (verifierContract == null || verifierContract == UInt160.Zero)
            {
                map.Delete(GetStorageKey(accountId));
            }
            else
            {
                map.Put(GetStorageKey(accountId), verifierContract);
            }
        }

        [Safe]
        public static UInt160 GetVerifierContract(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifierContractPrefix);
            ByteString data = map.Get(GetStorageKey(accountId));
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        [Safe]
        public static UInt160 GetVerifierContractByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetVerifierContract(accountId);
        }
    }
}
