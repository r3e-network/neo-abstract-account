using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Hooks
{
    [DisplayName("TokenRestrictedHook")]
    [ManifestExtra("Description", "Hook to restrict interacting with specific high-value tokens")]
    public class TokenRestrictedHook : SmartContract
    {
        private static readonly byte[] Prefix_RestrictedTokens = new byte[] { 0x01 };

        public static void SetRestrictedToken(UInt160 accountId, UInt160 token, bool isRestricted)
        {
            ExecutionEngine.Assert(Runtime.CheckWitness(accountId), "Unauthorized");
            byte[] key = Helper.Concat(Prefix_RestrictedTokens, (byte[])accountId);
            key = Helper.Concat(key, (byte[])token);
            
            if (isRestricted)
            {
                Storage.Put(Storage.CurrentContext, key, new byte[] { 1 });
            }
            else
            {
                Storage.Delete(Storage.CurrentContext, key);
            }
        }

        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            if (opParams.Length < 2) return;
            UInt160 targetContract = (UInt160)opParams[0];

            byte[] key = Helper.Concat(Prefix_RestrictedTokens, (byte[])accountId);
            key = Helper.Concat(key, (byte[])targetContract);
            
            // Abort if trying to interact with a restricted token (e.g. NEO/GAS)
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, key) == null, "Interaction with restricted token is forbidden");
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
            // No post-execution logic required for token restriction
        }
    }
}