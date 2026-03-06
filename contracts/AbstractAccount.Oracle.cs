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
        private static readonly byte[] DomeOracleUrlPrefix = new byte[] { 0x20 };
        private static readonly byte[] DomeOracleUnlockPrefix = new byte[] { 0x21 };
        private static readonly byte[] DomeOracleRequestCounterPrefix = new byte[] { 0x22 };
        private static readonly byte[] DomeOraclePendingRequestPrefix = new byte[] { 0x23 };

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

            UInt160[] explicitSigners = GetMetaTxContextSigners(accountId);
            if (explicitSigners.Length > 0 && Runtime.CallingScriptHash == Runtime.ExecutingScriptHash)
            {
                bool metaAuthorized = CheckMixedSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), explicitSigners)
                    || CheckMixedSignatures(GetManagers(accountId), GetManagerThreshold(accountId), explicitSigners)
                    || CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners);
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
            ByteString? urlBytes = urlMap.Get(key);
            string? url = urlBytes == null ? null : (string)urlBytes!;
            ExecutionEngine.Assert(url != null && url != "", "Oracle URL not configured");
            string requestUrl = url!;
            ExecutionEngine.Assert(!IsDomeOracleUnlocked(accountId), "Dome account already unlocked");

            StorageMap pendingMap = new StorageMap(Storage.CurrentContext, DomeOraclePendingRequestPrefix);
            ExecutionEngine.Assert(pendingMap.Get(key) == null, "Dome activation already pending");

            StorageMap counterMap = new StorageMap(Storage.CurrentContext, DomeOracleRequestCounterPrefix);
            ByteString? counterBytes = counterMap.Get(key);
            BigInteger requestId = counterBytes == null ? 1 : (BigInteger)counterBytes + 1;
            counterMap.Put(key, requestId);
            pendingMap.Put(key, requestId);

            ByteString payload = StdLib.Serialize(new object[] { accountId, requestId, requestUrl });
            Oracle.Request(requestUrl, "", "DomeActivationCallback", payload, 10000000);
        }

        public static void RequestDomeActivationByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            RequestDomeActivation(accountId);
        }

        private static bool IsStrictTrue(byte[] result)
        {
            if (result == null || result.Length == 0) return false;

            int left = 0;
            int right = result.Length - 1;
            while (left <= right && IsWhitespace(result[left])) left++;
            while (right >= left && IsWhitespace(result[right])) right--;
            if (left > right) return false;

            if (right - left + 1 == 4)
            {
                return EqualsIgnoreCase(result[left], (byte)'t')
                    && EqualsIgnoreCase(result[left + 1], (byte)'r')
                    && EqualsIgnoreCase(result[left + 2], (byte)'u')
                    && EqualsIgnoreCase(result[left + 3], (byte)'e');
            }

            return false;
        }

        private static bool IsWhitespace(byte value)
        {
            return value == (byte)' ' || value == (byte)'\n' || value == (byte)'\r' || value == (byte)'\t';
        }

        private static bool EqualsIgnoreCase(byte value, byte expectedLowercase)
        {
            if (value >= (byte)'A' && value <= (byte)'Z')
            {
                value = (byte)(value + 32);
            }
            return value == expectedLowercase;
        }

        public static void DomeActivationCallback(string? url, object? userData, int responseCode, byte[]? result)
        {
            ExecutionEngine.Assert(Runtime.CallingScriptHash == Oracle.Hash, "Unauthorized");

            Neo.SmartContract.Framework.List<object>? payload =
                (Neo.SmartContract.Framework.List<object>)StdLib.Deserialize((ByteString)userData!);
            if (payload == null || payload.Count != 3) return;

            ByteString? accountId = (ByteString)payload[0];
            BigInteger requestId = (BigInteger)payload[1];
            string? expectedUrl = (string)payload[2];
            if (accountId == null || accountId.Length == 0 || expectedUrl == null || expectedUrl == "") return;

            ByteString key = GetStorageKey(accountId!);
            StorageMap pendingMap = new StorageMap(Storage.CurrentContext, DomeOraclePendingRequestPrefix);
            ByteString? pendingBytes = pendingMap.Get(key);
            if (pendingBytes == null || (BigInteger)pendingBytes != requestId) return;

            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            ByteString? configuredUrlBytes = urlMap.Get(key);
            string? configuredUrl = configuredUrlBytes == null ? null : (string)configuredUrlBytes!;
            if (configuredUrl == null || configuredUrl == "" || configuredUrl != expectedUrl || configuredUrl != url)
            {
                pendingMap.Delete(key);
                return;
            }

            if (responseCode == (int)OracleResponseCode.Success && result != null && IsStrictTrue(result))
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
            ByteString? urlBytes = urlMap.Get(GetStorageKey(accountId));
            string? url = urlBytes == null ? null : (string)urlBytes!;
            if (url == null || url == "") return true; // If no oracle configured, it's implicitly unlocked

            StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
            ByteString? unlocked = unlockMap.Get(GetStorageKey(accountId));
            return unlocked != null && unlocked == (ByteString)new byte[] { 1 };
        }
    }
}
