using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Hooks
{
    /// <summary>
    /// Hook that enforces per-token daily transfer ceilings for an AA account.
    /// </summary>
    /// <remarks>
    /// This hook only inspects transfer-style calls and maintains rolling daily spend state
    /// inside its own storage. It is meant for treasury and user-wallet safety policies.
    /// </remarks>
    [DisplayName("DailyLimitHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Daily Limit Policy Hook Plugin for Neo N3 AA")]
    public class DailyLimitHook : SmartContract
    {
        private static readonly byte[] Prefix_DailyLimit = new byte[] { 0x01 };
        private static readonly byte[] Prefix_SpentToday = new byte[] { 0x02 };
        private static readonly byte[] Prefix_LastReset = new byte[] { 0x03 };
        private const int OneDaySeconds = 24 * 60 * 60;

        public static void _deploy(object data, bool update) => HookAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => HookAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => HookAuthority.SetAuthorizedCore(coreContract);

        // Configuration: Only AA account can configure its own limits
        /// <summary>
        /// Sets or clears the maximum amount a given token may transfer in a 24-hour window.
        /// </summary>
        public static void SetDailyLimit(UInt160 accountId, UInt160 token, BigInteger maxAmount)
        {
            HookAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            byte[] key = Helper.Concat(Helper.Concat(Prefix_DailyLimit, (byte[])accountId), (byte[])token);
            if (maxAmount <= 0) Storage.Delete(Storage.CurrentContext, key);
            else Storage.Put(Storage.CurrentContext, key, maxAmount);
        }

        [Safe]
        public static BigInteger GetDailyLimit(UInt160 accountId, UInt160 token)
        {
            byte[] key = Helper.Concat(Helper.Concat(Prefix_DailyLimit, (byte[])accountId), (byte[])token);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }

        /// <summary>
        /// Rejects transfer calls that would exceed the configured daily token limit.
        /// </summary>
        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            HookAuthority.ValidateExecutionCaller(accountId, Runtime.CallingScriptHash, Runtime.ExecutingScriptHash);
            if (!TryReadTrackedTransfer(opParams, out UInt160 targetContract, out UInt160 fromAccount, out BigInteger amount)) return;
            ExecutionEngine.Assert(IsProtectedTransferSource(accountId, fromAccount), "Transfer source not permitted");
            BigInteger limit = GetDailyLimit(accountId, targetContract);
            if (limit == 0) return; // No limit configured for this token

            BigInteger currentTime = Runtime.Time;
            BigInteger spentToday = GetSpentToday(accountId, targetContract, currentTime);
            BigInteger newTotal = spentToday + amount;
            ExecutionEngine.Assert(newTotal <= limit, "Daily limit exceeded");
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
            HookAuthority.ValidateExecutionCaller(accountId, Runtime.CallingScriptHash, Runtime.ExecutingScriptHash);
            if (!TryReadTrackedTransfer(opParams, out UInt160 targetContract, out UInt160 fromAccount, out BigInteger amount)) return;
            if (!IsProtectedTransferSource(accountId, fromAccount)) return;
            if (!DidExecutionSucceed(result)) return;

            BigInteger limit = GetDailyLimit(accountId, targetContract);
            if (limit == 0) return;

            BigInteger currentTime = Runtime.Time;
            BigInteger spentToday = GetSpentToday(accountId, targetContract, currentTime);
            StoreSpentToday(accountId, targetContract, currentTime, spentToday + amount);
        }

        public static void ClearAccount(UInt160 accountId)
        {
            HookAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);

            ClearPrefixForAccount(Prefix_DailyLimit, accountId);
            ClearPrefixForAccount(Prefix_SpentToday, accountId);
            ClearPrefixForAccount(Prefix_LastReset, accountId);
        }

        private static void ClearPrefixForAccount(byte[] prefix, UInt160 accountId)
        {
            byte[] accountPrefix = Helper.Concat(prefix, (byte[])accountId);
            Iterator iterator = Storage.Find(Storage.CurrentContext, accountPrefix, FindOptions.KeysOnly);
            while (iterator.Next())
            {
                Storage.Delete(Storage.CurrentContext, (ByteString)iterator.Value);
            }
        }

        private static bool TryReadTrackedTransfer(object[] opParams, out UInt160 targetContract, out UInt160 fromAccount, out BigInteger amount)
        {
            targetContract = UInt160.Zero;
            fromAccount = UInt160.Zero;
            amount = 0;

            if (opParams.Length < 3) return false;
            targetContract = (UInt160)opParams[0];
            string method = (string)opParams[1];
            if (method != "transfer") return false;

            object[] args = (object[])opParams[2];
            if (args.Length < 3) return false;
            fromAccount = (UInt160)args[0];
            amount = (BigInteger)args[2];
            return true;
        }

        private static byte[] BuildTrackedKey(byte[] prefix, UInt160 accountId, UInt160 token)
        {
            return Helper.Concat(Helper.Concat(prefix, (byte[])accountId), (byte[])token);
        }

        private static BigInteger GetSpentToday(UInt160 accountId, UInt160 token, BigInteger currentTime)
        {
            byte[] spentKey = BuildTrackedKey(Prefix_SpentToday, accountId, token);
            byte[] resetKey = BuildTrackedKey(Prefix_LastReset, accountId, token);

            ByteString? lastResetData = Storage.Get(Storage.CurrentContext, resetKey);
            BigInteger lastReset = lastResetData == null ? 0 : (BigInteger)lastResetData;
            if (currentTime >= lastReset + OneDaySeconds) return 0;

            ByteString? spentData = Storage.Get(Storage.CurrentContext, spentKey);
            return spentData == null ? 0 : (BigInteger)spentData;
        }

        private static void StoreSpentToday(UInt160 accountId, UInt160 token, BigInteger currentTime, BigInteger amount)
        {
            byte[] spentKey = BuildTrackedKey(Prefix_SpentToday, accountId, token);
            byte[] resetKey = BuildTrackedKey(Prefix_LastReset, accountId, token);
            Storage.Put(Storage.CurrentContext, resetKey, currentTime);
            Storage.Put(Storage.CurrentContext, spentKey, amount);
        }

        private static bool DidExecutionSucceed(object result)
        {
            if (result is bool asBool) return asBool;
            if (result is BigInteger asInteger) return asInteger != 0;
            return true;
        }

        private static bool IsProtectedTransferSource(UInt160 accountId, UInt160 from)
        {
            return from == accountId;
        }
    }
}
