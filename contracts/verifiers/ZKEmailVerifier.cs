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
    [DisplayName("ZKEmailVerifier")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "ZK-SNARK Email Proof Verifier")]
    public class ZKEmailVerifier : SmartContract
    {
        private static readonly byte[] Prefix_AccountDKIM = new byte[] { 0x01 };

        public static void SetDKIMRegistry(UInt160 accountId, ByteString dkimHash)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureVerifier",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Prefix_AccountDKIM, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, dkimHash);
        }

        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            byte[] key = Helper.Concat(Prefix_AccountDKIM, (byte[])accountId);
            ByteString? dkim = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(dkim != null, "No DKIM configured");

            // This verifier was previously a placeholder that accepted any
            // non-empty proof blob, which is unsafe for production use.
            ExecutionEngine.Assert(false, "ZKEmailVerifier disabled pending real proof verification");
            return false; 
        }
    }
}
