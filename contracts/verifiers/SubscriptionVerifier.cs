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
    [ContractPermission("*", "canConfigureVerifier")]
    [ContractPermission("*", "canExecuteVerifier")]
    [ContractPermission("*", "computeArgsHash")]
    [ManifestExtra("Description", "Time-based Subscription Auto-Payment Verifier")]
    public class SubscriptionVerifier : SmartContract
    {
        private static readonly byte[] Prefix_Subscription = new byte[] { 0x01 };
        private static readonly byte[] Prefix_SubscriptionNonceCounter = new byte[] { 0x02 };

        public static void _deploy(object data, bool update) => VerifierAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => VerifierAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => VerifierAuthority.SetAuthorizedCore(coreContract);

        public class SubscriptionConfig
        {
            public UInt160 Merchant;
            public UInt160 Token;
            public BigInteger Amount;
            public BigInteger PeriodSeconds;
            public BigInteger LastChargeTime;
        }

        /// <summary>
        /// Creates or overwrites a subscription configuration for an account and subscription id.
        /// </summary>
        public static void CreateSubscription(UInt160 accountId, ByteString subId, UInt160 merchant, UInt160 token, BigInteger amount, BigInteger periodSeconds)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);

            SubscriptionConfig config = new SubscriptionConfig
            {
                Merchant = merchant,
                Token = token,
                Amount = amount,
                PeriodSeconds = periodSeconds,
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
            ExecutionEngine.Assert((UInt160)op.Args[0] == accountId, "Transfer source must be the account");
            ExecutionEngine.Assert((UInt160)op.Args[1] == config.Merchant, "Transfer destination must be merchant");
            ExecutionEngine.Assert((BigInteger)op.Args[2] <= config.Amount, "Transfer amount exceeds subscription");

            ExecutionEngine.Assert(config.PeriodSeconds > 0, "Invalid subscription period");
            BigInteger billingPeriodMs = config.PeriodSeconds * 1000;
            BigInteger currentPeriod = Runtime.Time / billingPeriodMs;
            ExecutionEngine.Assert(currentPeriod > 0, "Subscription period not yet elapsed");

            // Get per-subscription nonce counter to prevent replay within the same billing period
            byte[] counterKey = Helper.Concat(Helper.Concat(Prefix_SubscriptionNonceCounter, (byte[])accountId), (byte[])subId);
            ByteString? counterData = Storage.Get(Storage.CurrentContext, counterKey);
            BigInteger nonceCounter = counterData == null ? 0 : (BigInteger)counterData;

            // Replay protection: nonce binds to subscription ID, billing period, and charge counter
            BigInteger saltBase = 1_000_000_000_000_000_000;
            ByteString digest = CryptoLib.Sha256(subId);
            byte[] digestBytes = (byte[])digest;
            BigInteger subTag = 0;
            for (int i = 0; i < 8 && i < digestBytes.Length; i++)
            {
                subTag = (subTag << 8) + digestBytes[i];
            }
            BigInteger expectedNonce = saltBase + (subTag << 32) + currentPeriod + nonceCounter;
            ExecutionEngine.Assert(op.Nonce == expectedNonce, "Subscription nonce mismatch");

            return true;
        }

        public static void ClearAccount(UInt160 accountId)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);

            byte[] prefix = Helper.Concat(Prefix_Subscription, (byte[])accountId);
            Iterator iterator = Storage.Find(Storage.CurrentContext, prefix, FindOptions.KeysOnly);
            while (iterator.Next())
            {
                Storage.Delete(Storage.CurrentContext, (ByteString)iterator.Value);
            }

            // Clear nonce counters
            byte[] counterPrefix = Helper.Concat(Prefix_SubscriptionNonceCounter, (byte[])accountId);
            iterator = Storage.Find(Storage.CurrentContext, counterPrefix, FindOptions.KeysOnly);
            while (iterator.Next())
            {
                Storage.Delete(Storage.CurrentContext, (ByteString)iterator.Value);
            }
        }

        public static void PostExecute(UInt160 accountId, UserOperation op, object result)
        {
            VerifierAuthority.ValidateExecutionCaller(accountId, Runtime.CallingScriptHash, Runtime.ExecutingScriptHash);
            ByteString subId = op.Signature;
            byte[] key = Helper.Concat(Helper.Concat(Prefix_Subscription, (byte[])accountId), (byte[])subId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "Subscription not found");

            SubscriptionConfig config = (SubscriptionConfig)StdLib.Deserialize(data!);
            config.LastChargeTime = Runtime.Time;
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(config));

            byte[] counterKey = Helper.Concat(Helper.Concat(Prefix_SubscriptionNonceCounter, (byte[])accountId), (byte[])subId);
            ByteString? counterData = Storage.Get(Storage.CurrentContext, counterKey);
            BigInteger nonceCounter = counterData == null ? 0 : (BigInteger)counterData;
            Storage.Put(Storage.CurrentContext, counterKey, nonceCounter + 1);
        }
    }
}
