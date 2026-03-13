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
    [DisplayName("DailyLimitHook")]
    [ManifestExtra("Description", "Daily Limit Policy Hook Plugin for Neo N3 AA")]
    public class DailyLimitHook : SmartContract
    {
        private static readonly byte[] Prefix_DailyLimit = new byte[] { 0x01 };
        private static readonly byte[] Prefix_SpentToday = new byte[] { 0x02 };
        private static readonly byte[] Prefix_LastReset = new byte[] { 0x03 };

        // Configuration: Only AA account can configure its own limits
        public static void SetDailyLimit(UInt160 accountId, UInt160 token, BigInteger maxAmount)
        {
            ExecutionEngine.Assert(Runtime.CallingScriptHash == accountId, "Only AA can set its own limit");
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

        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            // Expected opParams layout: TargetContract, Method, Args, Nonce, Deadline, Signature
            if (opParams.Length < 3) return;
            UInt160 targetContract = (UInt160)opParams[0];
            string method = (string)opParams[1];
            object[] args = (object[])opParams[2];

            // Only care about NEP-17 transfers
            if (method != "transfer" || args.Length < 3) return;
            
            // args[0] = from, args[1] = to, args[2] = amount
            if (!(args[2] is BigInteger amount)) return;

            BigInteger limit = GetDailyLimit(accountId, targetContract);
            if (limit == 0) return; // No limit configured for this token

            byte[] spentKey = Helper.Concat(Helper.Concat(Prefix_SpentToday, (byte[])accountId), (byte[])targetContract);
            byte[] resetKey = Helper.Concat(Helper.Concat(Prefix_LastReset, (byte[])accountId), (byte[])targetContract);

            BigInteger currentTime = Runtime.Time;
            BigInteger oneDayMs = 24 * 60 * 60 * 1000;
            
            ByteString? lastResetData = Storage.Get(Storage.CurrentContext, resetKey);
            BigInteger lastReset = lastResetData == null ? 0 : (BigInteger)lastResetData;

            BigInteger spentToday = 0;
            if (currentTime >= lastReset + oneDayMs)
            {
                // New day, reset spent amount
                Storage.Put(Storage.CurrentContext, resetKey, currentTime);
            }
            else
            {
                ByteString? spentData = Storage.Get(Storage.CurrentContext, spentKey);
                spentToday = spentData == null ? 0 : (BigInteger)spentData;
            }

            BigInteger newTotal = spentToday + amount;
            ExecutionEngine.Assert(newTotal <= limit, "Daily limit exceeded");
            
            Storage.Put(Storage.CurrentContext, spentKey, newTotal);
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
        }
    }
}