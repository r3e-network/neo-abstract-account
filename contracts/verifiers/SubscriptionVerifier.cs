using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Verifiers
{
    [DisplayName("SubscriptionVerifier")]
    [ManifestExtra("Description", "Time-based Subscription Auto-Payment Verifier")]
    public class SubscriptionVerifier : SmartContract
    {
        private static readonly byte[] Prefix_Subscription = new byte[] { 0x01 };

        public class SubscriptionConfig
        {
            public UInt160 Merchant;
            public UInt160 Token;
            public BigInteger Amount;
            public BigInteger PeriodMs;
            public BigInteger LastChargeTime;
        }

        public static void CreateSubscription(UInt160 accountId, ByteString subId, UInt160 merchant, UInt160 token, BigInteger amount, BigInteger periodMs)
        {
            ExecutionEngine.Assert(Runtime.CheckWitness(accountId), "Unauthorized");
            
            SubscriptionConfig config = new SubscriptionConfig 
            { 
                Merchant = merchant, 
                Token = token, 
                Amount = amount, 
                PeriodMs = periodMs,
                LastChargeTime = 0
            };
            
            byte[] key = Helper.Concat(Helper.Concat(Prefix_Subscription, (byte[])accountId), (byte[])subId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(config));
        }

        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            // Signature field acts as the Subscription ID being claimed by the merchant
            ByteString subId = op.Signature; 
            byte[] key = Helper.Concat(Helper.Concat(Prefix_Subscription, (byte[])accountId), (byte[])subId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "Subscription not found");
            
            SubscriptionConfig config = (SubscriptionConfig)StdLib.Deserialize(data!);
            
            ExecutionEngine.Assert(op.TargetContract == config.Token, "Target must be the subscription token");
            ExecutionEngine.Assert(op.Method == "transfer", "Method must be transfer");
            
            // Expected args: [from, to, amount, ...]
            ExecutionEngine.Assert(op.Args.Length >= 3, "Invalid transfer args");
            ExecutionEngine.Assert((UInt160)op.Args[1] == config.Merchant, "Transfer destination must be merchant");
            ExecutionEngine.Assert((BigInteger)op.Args[2] <= config.Amount, "Transfer amount exceeds subscription");
            
            ExecutionEngine.Assert(Runtime.Time >= config.LastChargeTime + config.PeriodMs, "Subscription period not yet elapsed");

            // Update LastChargeTime
            config.LastChargeTime = Runtime.Time;
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(config));

            return true;
        }
    }
}