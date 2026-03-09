using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Dome/oracle helpers implement the inactivity-recovery flow. Dome signers cannot act immediately; they first wait
    // for the configured timeout, then request an oracle callback, and only after a truthy oracle response does the
    // dome signer path unlock for admin/execution actions.
    public partial class UnifiedSmartWallet
    {
        // These prefixes store oracle configuration plus the last request/response diagnostics so operators can inspect
        // why a dome activation succeeded or failed without replaying the request off-chain.
        private static readonly byte[] DomeOracleUrlPrefix = new byte[] { 0x20 };
        private static readonly byte[] DomeOracleUnlockPrefix = new byte[] { 0x21 };
        private static readonly byte[] DomeOracleRequestCounterPrefix = new byte[] { 0x22 };
        private static readonly byte[] DomeOraclePendingRequestPrefix = new byte[] { 0x23 };
        private static readonly byte[] DomeOracleLastResponseCodePrefix = new byte[] { 0x24 };
        private static readonly byte[] DomeOracleLastResponseUrlPrefix = new byte[] { 0x25 };
        private static readonly byte[] DomeOracleLastResponseBodyPrefix = new byte[] { 0x26 };
        private static readonly byte[] DomeOracleLastUrlMatchedPrefix = new byte[] { 0x27 };
        private static readonly byte[] DomeOracleLastTruthAcceptedPrefix = new byte[] { 0x28 };
        private static readonly byte[] DomeOracleLastUnlockAppliedPrefix = new byte[] { 0x29 };
        private static readonly byte[] DomeOracleLastExpectedUrlPrefix = new byte[] { 0x2A };
        private static readonly byte[] DomeOracleLastConfiguredUrlPrefix = new byte[] { 0x2B };

        private static void ResetDomeOracleState(ByteString accountId)
        {
            ByteString key = GetStorageKey(accountId);
            StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
            StorageMap pendingMap = new StorageMap(Storage.CurrentContext, DomeOraclePendingRequestPrefix);
            StorageMap responseCodeMap = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseCodePrefix);
            StorageMap responseUrlMap = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseUrlPrefix);
            StorageMap responseBodyMap = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseBodyPrefix);
            StorageMap urlMatchedMap = new StorageMap(Storage.CurrentContext, DomeOracleLastUrlMatchedPrefix);
            StorageMap truthAcceptedMap = new StorageMap(Storage.CurrentContext, DomeOracleLastTruthAcceptedPrefix);
            StorageMap unlockAppliedMap = new StorageMap(Storage.CurrentContext, DomeOracleLastUnlockAppliedPrefix);
            StorageMap expectedUrlMap = new StorageMap(Storage.CurrentContext, DomeOracleLastExpectedUrlPrefix);
            StorageMap configuredUrlMap = new StorageMap(Storage.CurrentContext, DomeOracleLastConfiguredUrlPrefix);
            unlockMap.Delete(key);
            pendingMap.Delete(key);
            responseCodeMap.Delete(key);
            responseUrlMap.Delete(key);
            responseBodyMap.Delete(key);
            urlMatchedMap.Delete(key);
            truthAcceptedMap.Delete(key);
            unlockAppliedMap.Delete(key);
            expectedUrlMap.Delete(key);
            configuredUrlMap.Delete(key);
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

        private static int FindDomeOracleFilterSeparator(string value)
        {
            if (value == null || value == "") return -1;
            for (int i = 0; i < value.Length; i++)
            {
                if (value[i] == '|') return i;
            }
            return -1;
        }

        private static string ExtractDomeOracleRequestUrl(string? configuredValue)
        {
            if (configuredValue == null || configuredValue == "") return "";
            int separatorIndex = FindDomeOracleFilterSeparator(configuredValue);
            if (separatorIndex < 0) return configuredValue;
            if (separatorIndex == 0) return "";
            return configuredValue.Substring(0, separatorIndex);
        }

        private static string ExtractDomeOracleFilter(string? configuredValue)
        {
            if (configuredValue == null || configuredValue == "") return "";
            int separatorIndex = FindDomeOracleFilterSeparator(configuredValue);
            if (separatorIndex < 0 || separatorIndex + 1 >= configuredValue.Length) return "";
            return configuredValue.Substring(separatorIndex + 1);
        }

        /// <summary>
        /// Configures the oracle endpoint used to unlock dome signers after inactivity. The expected format is either a
        /// raw URL or <c>url|filter</c> where the filter is passed through to Neo Oracle.
        /// </summary>
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

        /// <summary>
        /// Starts the dome unlock request after the inactivity timeout has elapsed. The oracle request is tracked on-
        /// chain so the callback can verify request identity, URL match, and response truthiness.
        /// </summary>
        public static void RequestDomeActivation(ByteString accountId)
        {
            AssertAccountExists(accountId);
            AssertNoExternalMutationDuringExecution(accountId);
            AssertCanRequestDomeActivation(accountId);

            BigInteger timeout = GetDomeTimeout(accountId);
            ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

            BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
            ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");

            ByteString key = GetStorageKey(accountId);
            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            ByteString? urlBytes = urlMap.Get(key);
            string? configuredOracle = urlBytes == null ? null : (string)urlBytes!;
            string requestUrl = ExtractDomeOracleRequestUrl(configuredOracle);
            string requestFilter = ExtractDomeOracleFilter(configuredOracle);
            ExecutionEngine.Assert(requestUrl != "", "Oracle URL not configured");
            ExecutionEngine.Assert(!IsDomeOracleUnlocked(accountId), "Dome account already unlocked");

            StorageMap pendingMap = new StorageMap(Storage.CurrentContext, DomeOraclePendingRequestPrefix);
            ExecutionEngine.Assert(pendingMap.Get(key) == null, "Dome activation already pending");

            StorageMap counterMap = new StorageMap(Storage.CurrentContext, DomeOracleRequestCounterPrefix);
            ByteString? counterBytes = counterMap.Get(key);
            BigInteger requestId = counterBytes == null ? 1 : (BigInteger)counterBytes + 1;
            counterMap.Put(key, requestId);
            pendingMap.Put(key, requestId);

            ByteString payload = StdLib.Serialize(new object[] { accountId, requestId, requestUrl });
            Oracle.Request(requestUrl, requestFilter, "domeActivationCallback", payload, 10000000);
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
            return IsTrueSlice(result, left, right);
        }

        private static bool IsTrueSlice(byte[] result, int left, int right)
        {
            if (left > right) return false;

            if (right - left + 1 == 1)
            {
                byte value = result[left];
                return value == 1 || value == (byte)'1';
            }

            if (right - left + 1 == 4)
            {
                return EqualsIgnoreCase(result[left], (byte)'t')
                    && EqualsIgnoreCase(result[left + 1], (byte)'r')
                    && EqualsIgnoreCase(result[left + 2], (byte)'u')
                    && EqualsIgnoreCase(result[left + 3], (byte)'e');
            }

            if (right - left + 1 == 6 && result[left] == (byte)'"' && result[right] == (byte)'"')
            {
                return EqualsIgnoreCase(result[left + 1], (byte)'t')
                    && EqualsIgnoreCase(result[left + 2], (byte)'r')
                    && EqualsIgnoreCase(result[left + 3], (byte)'u')
                    && EqualsIgnoreCase(result[left + 4], (byte)'e');
            }

            if (result[left] == (byte)'[' && result[right] == (byte)']')
            {
                int innerLeft = left + 1;
                int innerRight = right - 1;
                while (innerLeft <= innerRight && IsWhitespace(result[innerLeft])) innerLeft++;
                while (innerRight >= innerLeft && IsWhitespace(result[innerRight])) innerRight--;
                return IsTrueSlice(result, innerLeft, innerRight);
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

        private static bool StringContentEquals(string? left, string? right)
        {
            if (left == null || right == null) return left == right;
            if (left.Length != right.Length) return false;
            for (int i = 0; i < left.Length; i++)
            {
                if (left[i] != right[i]) return false;
            }
            return true;
        }

        /// <summary>
        /// Oracle callback that records response diagnostics and unlocks the dome path only when the response came from
        /// the expected URL and the returned payload is interpreted as a strict boolean true.
        /// </summary>
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

            StorageMap responseCodeMap = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseCodePrefix);
            StorageMap responseUrlMap = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseUrlPrefix);
            StorageMap responseBodyMap = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseBodyPrefix);
            StorageMap urlMatchedMap = new StorageMap(Storage.CurrentContext, DomeOracleLastUrlMatchedPrefix);
            StorageMap truthAcceptedMap = new StorageMap(Storage.CurrentContext, DomeOracleLastTruthAcceptedPrefix);
            StorageMap unlockAppliedMap = new StorageMap(Storage.CurrentContext, DomeOracleLastUnlockAppliedPrefix);
            StorageMap expectedUrlMap = new StorageMap(Storage.CurrentContext, DomeOracleLastExpectedUrlPrefix);
            StorageMap configuredUrlMap = new StorageMap(Storage.CurrentContext, DomeOracleLastConfiguredUrlPrefix);
            responseCodeMap.Put(key, responseCode);
            if (url == null || url == "") responseUrlMap.Delete(key);
            else responseUrlMap.Put(key, url);
            if (result == null || result.Length == 0) responseBodyMap.Delete(key);
            else responseBodyMap.Put(key, (ByteString)result);

            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            ByteString? configuredUrlBytes = urlMap.Get(key);
            string? configuredOracle = configuredUrlBytes == null ? null : (string)configuredUrlBytes!;
            string configuredUrl = ExtractDomeOracleRequestUrl(configuredOracle);
            if (expectedUrl == null || expectedUrl == "") expectedUrlMap.Delete(key);
            else expectedUrlMap.Put(key, expectedUrl);
            if (configuredUrl == "") configuredUrlMap.Delete(key);
            else configuredUrlMap.Put(key, configuredUrl);
            bool urlMatched = configuredUrl != "" && StringContentEquals(configuredUrl, expectedUrl) && StringContentEquals(configuredUrl, url);
            bool truthAccepted = responseCode == (int)OracleResponseCode.Success && result != null && IsStrictTrue(result);
            urlMatchedMap.Put(key, urlMatched ? (ByteString)new byte[] { 1 } : (ByteString)new byte[] { 0 });
            truthAcceptedMap.Put(key, truthAccepted ? (ByteString)new byte[] { 1 } : (ByteString)new byte[] { 0 });
            unlockAppliedMap.Put(key, (ByteString)new byte[] { 0 });
            if (!urlMatched)
            {
                pendingMap.Delete(key);
                return;
            }

            if (truthAccepted)
            {
                StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
                unlockMap.Put(key, (ByteString)new byte[] { 1 });
                unlockAppliedMap.Put(key, (ByteString)new byte[] { 1 });
            }

            pendingMap.Delete(key);
        }

        /// <summary>
        /// Returns the most recent oracle HTTP/status code recorded for this account's dome activation attempt.
        /// </summary>
        [Safe]
        public static int GetLastDomeOracleResponseCode(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseCodePrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (int)(BigInteger)data;
        }

        [Safe]
        public static int GetLastDomeOracleResponseCodeByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleResponseCode(accountId);
        }

        [Safe]
        public static ByteString GetLastDomeOracleResponse(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseBodyPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            return data == null ? (ByteString)string.Empty : data;
        }

        [Safe]
        public static ByteString GetLastDomeOracleResponseByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleResponse(accountId);
        }

        [Safe]
        public static string GetLastDomeOracleResponseUrl(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastResponseUrlPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            return data == null ? string.Empty : (string)data;
        }

        [Safe]
        public static string GetLastDomeOracleResponseUrlByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleResponseUrl(accountId);
        }

        [Safe]
        public static bool GetLastDomeOracleUrlMatched(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastUrlMatchedPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            return data != null && data == (ByteString)new byte[] { 1 };
        }

        [Safe]
        public static bool GetLastDomeOracleUrlMatchedByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleUrlMatched(accountId);
        }

        [Safe]
        public static bool GetLastDomeOracleTruthAccepted(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastTruthAcceptedPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            return data != null && data == (ByteString)new byte[] { 1 };
        }

        [Safe]
        public static bool GetLastDomeOracleTruthAcceptedByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleTruthAccepted(accountId);
        }

        [Safe]
        public static bool GetLastDomeOracleUnlockApplied(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastUnlockAppliedPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            return data != null && data == (ByteString)new byte[] { 1 };
        }

        [Safe]
        public static bool GetLastDomeOracleUnlockAppliedByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleUnlockApplied(accountId);
        }

        [Safe]
        public static string GetLastDomeOracleExpectedUrl(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastExpectedUrlPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            return data == null ? string.Empty : (string)data;
        }

        [Safe]
        public static string GetLastDomeOracleExpectedUrlByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleExpectedUrl(accountId);
        }

        [Safe]
        public static string GetLastDomeOracleConfiguredUrl(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, DomeOracleLastConfiguredUrlPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            return data == null ? string.Empty : (string)data;
        }

        [Safe]
        public static string GetLastDomeOracleConfiguredUrlByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastDomeOracleConfiguredUrl(accountId);
        }

        [Safe]
        public static bool IsDomeOracleUnlocked(ByteString accountId)
        {
            StorageMap urlMap = new StorageMap(Storage.CurrentContext, DomeOracleUrlPrefix);
            ByteString? urlBytes = urlMap.Get(GetStorageKey(accountId));
            string? configuredOracle = urlBytes == null ? null : (string)urlBytes!;
            string url = ExtractDomeOracleRequestUrl(configuredOracle);
            if (url == "") return true; // If no oracle configured, it's implicitly unlocked

            StorageMap unlockMap = new StorageMap(Storage.CurrentContext, DomeOracleUnlockPrefix);
            ByteString? unlocked = unlockMap.Get(GetStorageKey(accountId));
            return unlocked != null && unlocked == (ByteString)new byte[] { 1 };
        }
    }
}
