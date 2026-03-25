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
    /// Threshold verifier that composes multiple child verifiers into one approval policy.
    /// </summary>
    /// <remarks>
    /// Each child verifier validates its own signature format. This contract only enforces that a
    /// sufficient number of child verifiers approve the same user operation.
    /// </remarks>
    [DisplayName("MultiSigVerifier")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Heterogeneous Threshold Multi-Sig Verifier")]
    public class MultiSigVerifier : SmartContract
    {
        private static readonly byte[] Prefix_Config = new byte[] { 0x01 };

        public static void _deploy(object data, bool update) => VerifierAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => VerifierAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => VerifierAuthority.SetAuthorizedCore(coreContract);

        public class MultiSigConfig
        {
            public UInt160[] Verifiers;
            public int Threshold;
        }

        /// <summary>
        /// Stores the ordered verifier set and threshold for the account.
        /// </summary>
        public static void SetConfig(UInt160 accountId, UInt160[] verifiers, int threshold)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            ExecutionEngine.Assert(threshold > 0 && threshold <= verifiers.Length, "Invalid threshold");
            
            MultiSigConfig config = new MultiSigConfig { Verifiers = verifiers, Threshold = threshold };
            byte[] key = Helper.Concat(Prefix_Config, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(config));
        }

        /// <summary>
        /// Validates a multi-signature bundle by forwarding to the configured child verifiers.
        /// </summary>
        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            byte[] key = Helper.Concat(Prefix_Config, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "No MultiSig config");
            
            MultiSigConfig config = (MultiSigConfig)StdLib.Deserialize(data!);
            
            // Expected that op.Signature is an array of sub-signatures matching the verifier order
            object[] signatures = (object[])StdLib.Deserialize(op.Signature);
            ExecutionEngine.Assert(signatures.Length == config.Verifiers.Length, "Signature array length mismatch");

            int validCount = 0;
            for (int i = 0; i < config.Verifiers.Length; i++)
            {
                if (signatures[i] != null)
                {
                    // Create a cloned UserOp with just the individual signature
                    UserOperation subOp = new UserOperation
                    {
                        TargetContract = op.TargetContract,
                        Method = op.Method,
                        Args = op.Args,
                        Nonce = op.Nonce,
                        Deadline = op.Deadline,
                        Signature = (ByteString)signatures[i]
                    };
                    
                    bool isValid = (bool)Contract.Call(config.Verifiers[i], "validateSignature", CallFlags.ReadOnly, new object[] { accountId, subOp });
                    if (isValid) validCount++;
                }
            }
            
            return validCount >= config.Threshold;
        }

        public static void ClearAccount(UInt160 accountId)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_Config, (byte[])accountId));
        }
    }
}
