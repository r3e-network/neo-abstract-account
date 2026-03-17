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
    /// <summary>
    /// Verifier for recurring merchant payments with period-bound replay protection.
    /// </summary>
    /// <remarks>
    /// The signature field carries the subscription identifier, and the nonce must encode the
    /// current billing period so the AA core replay checks prevent duplicate charges.
    /// </remarks>
    [DisplayName("SubscriptionVerifier")]
    [ContractPermission("*", "*")]
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

        /// <summary>
        /// Creates or overwrites a subscription configuration for an account and subscription id.
        /// </summary>
        public static void CreateSubscription(UInt160 accountId, ByteString subId, UInt160 merchant, UInt160 token, BigInteger amount, BigInteger periodMs)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureVerifier",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            
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

        /// <summary>
        /// Validates that the claimed subscription payment matches the configured merchant, token, amount, and billing period.
        /// </summary>
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

            ExecutionEngine.Assert(config.PeriodMs > 0, "Invalid subscription period");
            BigInteger currentPeriod = Runtime.Time / config.PeriodMs;
            ExecutionEngine.Assert(currentPeriod > 0, "Subscription period not yet elapsed");

            // Replay protection without mutating state: require a salt-mode nonce
            // that deterministically binds this request to the current billing
            // period and subscription ID. Core nonce consumption then ensures
            // the same period cannot be charged twice with the same subId.
            BigInteger saltBase = 1_000_000_000_000_000_000;
            ByteString digest = CryptoLib.Sha256(subId);
            byte[] digestBytes = (byte[])digest;
            BigInteger subTag = 0;
            for (int i = 0; i < 8 && i < digestBytes.Length; i++)
            {
                subTag = (subTag << 8) + digestBytes[i];
            }
            BigInteger expectedNonce = saltBase + (subTag << 32) + currentPeriod;
            ExecutionEngine.Assert(op.Nonce == expectedNonce, "Subscription nonce must match the current billing period");

            return true;
        }

        public static void ClearAccount(UInt160 accountId)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureVerifier",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");

            byte[] prefix = Helper.Concat(Prefix_Subscription, (byte[])accountId);
            Iterator iterator = Storage.Find(Storage.CurrentContext, prefix, FindOptions.KeysOnly);
            while (iterator.Next())
            {
                Storage.Delete(Storage.CurrentContext, (ByteString)iterator.Value);
            }
        }
    }
}
