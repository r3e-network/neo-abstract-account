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
    /// Verifier that uses Neo N3's native witness verification system.
    /// This is the most gas-efficient verifier as it leverages Neo's built-in
    /// signature checking without any external crypto calls.
    /// </summary>
    [DisplayName("NeoNativeVerifier")]
    [ContractPermission("*", "canConfigureVerifier")]
    [ContractPermission("*", "computeArgsHash")]
    [ManifestExtra("Description", "Neo N3 Native Witness Verifier Plugin")]
    public class NeoNativeVerifier : SmartContract
    {
        // AccountId -> array of authorized signer UInt160 hashes
        private static readonly byte[] Prefix_AuthorizedSigners = new byte[] { 0x01 };
        // AccountId -> required threshold (for multisig)
        private static readonly byte[] Prefix_Threshold = new byte[] { 0x02 };
        private const int MaxSigners = 10;

        public static void _deploy(object data, bool update) => VerifierAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => VerifierAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => VerifierAuthority.SetAuthorizedCore(coreContract);

        public class NativeVerifierConfig
        {
            public UInt160[] Signers;
            public int Threshold;
        }

        /// <summary>
        /// Stores the authorized signers and threshold for the account.
        /// </summary>
        public static void SetConfig(UInt160 accountId, UInt160[] signers, int threshold)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            ExecutionEngine.Assert(signers != null && signers.Length > 0, "Empty signers list not allowed");
            ExecutionEngine.Assert(signers.Length <= MaxSigners, $"Maximum {MaxSigners} signers allowed");
            ExecutionEngine.Assert(threshold > 0 && threshold <= signers.Length, "Invalid threshold");

            // Reject duplicate signers to prevent single-signature threshold bypass
            for (int i = 0; i < signers.Length; i++)
            {
                ExecutionEngine.Assert(signers[i] != UInt160.Zero && signers[i].IsValid, "Invalid signer address");
                for (int j = i + 1; j < signers.Length; j++)
                {
                    ExecutionEngine.Assert(signers[i] != signers[j], "Duplicate signer");
                }
            }

            NativeVerifierConfig config = new NativeVerifierConfig { Signers = signers, Threshold = threshold };
            byte[] key = Helper.Concat(Prefix_AuthorizedSigners, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(config));

            byte[] thresholdKey = Helper.Concat(Prefix_Threshold, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, thresholdKey, threshold);
        }

        [Safe]
        public static NativeVerifierConfig? GetConfig(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_AuthorizedSigners, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return null;

            object? deserialized = StdLib.Deserialize(data!);
            return deserialized == null ? null : (NativeVerifierConfig)deserialized;
        }

        [Safe]
        public static int GetThreshold(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_Threshold, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (int)(BigInteger)data!;
        }

        public static void PostExecute(UInt160 accountId, UserOperation op, object result)
        {
        }

        /// <summary>
        /// Validates a user operation by checking that enough authorized signers
        /// have witnessed the transaction via Runtime.CheckWitness.
        /// </summary>
        /// <remarks>
        /// The UserOperation's Signature field is NOT used - instead, Neo's native
        /// transaction witnesses are checked via Runtime.CheckWitness.
        /// </remarks>
        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            byte[] key = Helper.Concat(Prefix_AuthorizedSigners, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "No NeoNativeVerifier config");

            object? deserialized = StdLib.Deserialize(data!);
            ExecutionEngine.Assert(deserialized != null, "Failed to deserialize config");
            NativeVerifierConfig config = (NativeVerifierConfig)deserialized!;

            int witnessCount = 0;
            for (int i = 0; i < config.Signers.Length; i++)
            {
                if (Runtime.CheckWitness(config.Signers[i]))
                {
                    witnessCount++;
                }
            }

            return witnessCount >= config.Threshold;
        }

        public static void ClearAccount(UInt160 accountId)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_AuthorizedSigners, (byte[])accountId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_Threshold, (byte[])accountId));
        }
    }
}
