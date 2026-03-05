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
        private static readonly byte[] DomeOracleUrlPrefix = new byte[] { 0x12 };
        private static readonly byte[] DomeOracleUnlockPrefix = new byte[] { 0x13 };
        private static readonly byte[] DomeOracleRequestCounterPrefix = new byte[] { 0x14 };
        private static readonly byte[] DomeOraclePendingRequestPrefix = new byte[] { 0x15 };

        private static void ResetDomeOracleState(ByteString accountId)
        {
            ByteString key = GetStorageKey(accountId);
            StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
            StorageMap pendingMap = new StorageMap(Storage.CurrentContext, DomeOraclePendingRequestPrefix);
            unlockMap.Delete(key);
            pendingMap.Delete(key);
        }

        private static void AssertCanRequestDomeActivation(ByteString accountId)
        {
            bool nativeAuthorized = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId))
                || CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId))
                || CheckNativeSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId));
            if (nativeAuthorized) return;

            ByteString metaSignerBytes = GetMetaTxContext(accountId);
            if (metaSignerBytes != null && Runtime.CallingScriptHash == Runtime.ExecutingScriptHash)
            {
                UInt160 metaSigner = (UInt160)metaSignerBytes;
                UInt160[] explicitSigners = new UInt160[] { metaSigner };

                bool metaAuthorized = CheckExplicitSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), explicitSigners)
                    || CheckExplicitSignatures(GetManagers(accountId), GetManagerThreshold(accountId), explicitSigners)
                    || CheckExplicitSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners);
                if (metaAuthorized) return;
            }

            ExecutionEngine.Assert(false, "Unauthorized");
        }

        public static void SetDomeOracle(ByteString accountId, string url)
        {
            AssertIsAdmin(accountId);
            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            ByteString key = GetStorageKey(accountId);
            if (url == null || url == "")
            {
                urlMap.Delete(key);
            }
            else
            {
                urlMap.Put(key, url);
            }
            ResetDomeOracleState(accountId);
        }

        public static void SetDomeOracleByAddress(UInt160 accountAddress, string url)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            SetDomeOracle(accountId, url);
        }

        public static void RequestDomeActivation(ByteString accountId)
        {
            AssertAccountExists(accountId);
            AssertCanRequestDomeActivation(accountId);

            BigInteger timeout = GetDomeTimeout(accountId);
            ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

            BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
            ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");

            ByteString key = GetStorageKey(accountId);
            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            string url = urlMap.Get(key);
            ExecutionEngine.Assert(url != null && url != "", "Oracle URL not configured");
            ExecutionEngine.Assert(!IsDomeOracleUnlocked(accountId), "Dome account already unlocked");

            StorageMap pendingMap = new StorageMap(Storage.CurrentContext, DomeOraclePendingRequestPrefix);
            ExecutionEngine.Assert(pendingMap.Get(key) == null, "Dome activation already pending");

            StorageMap counterMap = new StorageMap(Storage.CurrentContext, DomeOracleRequestCounterPrefix);
            ByteString counterBytes = counterMap.Get(key);
            BigInteger requestId = counterBytes == null ? 1 : (BigInteger)counterBytes + 1;
            counterMap.Put(key, requestId);
            pendingMap.Put(key, requestId);

            ByteString payload = StdLib.Serialize(new object[] { accountId, requestId, url });
            Oracle.Request(url, "", "DomeActivationCallback", payload, 10000000);
        }

        public static void RequestDomeActivationByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            RequestDomeActivation(accountId);
        }

        private static bool ContainsTrue(byte[] result)
        {
            if (result == null || result.Length < 4) return false;
            byte[] trueBytes = new byte[] { (byte)'t', (byte)'r', (byte)'u', (byte)'e' };
            for (int i = 0; i <= result.Length - 4; i++)
            {
                if (result[i] == trueBytes[0] &&
                    result[i + 1] == trueBytes[1] &&
                    result[i + 2] == trueBytes[2] &&
                    result[i + 3] == trueBytes[3]) return true;
            }
            return false;
        }

        public static void DomeActivationCallback(string url, object userData, int responseCode, byte[] result)
        {
            ExecutionEngine.Assert(Runtime.CallingScriptHash == Oracle.Hash, "Unauthorized");

            Neo.SmartContract.Framework.List<object> payload =
                (Neo.SmartContract.Framework.List<object>)StdLib.Deserialize((ByteString)userData);
            if (payload == null || payload.Count != 3) return;

            ByteString accountId = (ByteString)payload[0];
            BigInteger requestId = (BigInteger)payload[1];
            string expectedUrl = (string)payload[2];
            if (accountId == null || accountId.Length == 0) return;

            ByteString key = GetStorageKey(accountId);
            StorageMap pendingMap = new StorageMap(Storage.CurrentContext, DomeOraclePendingRequestPrefix);
            ByteString pendingBytes = pendingMap.Get(key);
            if (pendingBytes == null || (BigInteger)pendingBytes != requestId) return;

            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            string configuredUrl = urlMap.Get(key);
            if (configuredUrl == null || configuredUrl == "" || configuredUrl != expectedUrl || configuredUrl != url)
            {
                pendingMap.Delete(key);
                return;
            }

            if (responseCode == (int)OracleResponseCode.Success && ContainsTrue(result))
            {
                StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
                unlockMap.Put(key, (ByteString)new byte[] { 1 });
            }

            pendingMap.Delete(key);
        }

        [Safe]
        public static bool IsDomeOracleUnlocked(ByteString accountId)
        {
            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            string url = urlMap.Get(GetStorageKey(accountId));
            if (url == null || url == "") return true; // If no oracle configured, it's implicitly unlocked

            StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
            ByteString unlocked = unlockMap.Get(GetStorageKey(accountId));
            return unlocked != null && unlocked == (ByteString)new byte[] { 1 };
        }
    }
}
