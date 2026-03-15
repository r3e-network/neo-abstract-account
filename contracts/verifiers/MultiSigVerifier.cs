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
    [DisplayName("MultiSigVerifier")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Heterogeneous Threshold Multi-Sig Verifier")]
    public class MultiSigVerifier : SmartContract
    {
        private static readonly byte[] Prefix_Config = new byte[] { 0x01 };

        public class MultiSigConfig
        {
            public UInt160[] Verifiers;
            public int Threshold;
        }

        public static void SetConfig(UInt160 accountId, UInt160[] verifiers, int threshold)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureVerifier",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            ExecutionEngine.Assert(threshold > 0 && threshold <= verifiers.Length, "Invalid threshold");
            
            MultiSigConfig config = new MultiSigConfig { Verifiers = verifiers, Threshold = threshold };
            byte[] key = Helper.Concat(Prefix_Config, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(config));
        }

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
    }
}
