using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Hooks
{
    /// <summary>
    /// Hook that blocks interaction with specific token contracts for a given account.
    /// </summary>
    /// <remarks>
    /// This is useful for forbidding calls into sensitive or governance-critical assets even if
    /// the rest of the AA account remains broadly usable.
    /// </remarks>
    [DisplayName("TokenRestrictedHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Hook to restrict interacting with specific high-value tokens")]
    public class TokenRestrictedHook : SmartContract
    {
        private static readonly byte[] Prefix_RestrictedTokens = new byte[] { 0x01 };

        /// <summary>
        /// Marks a token contract as restricted or clears the restriction.
        /// </summary>
        public static void SetRestrictedToken(UInt160 accountId, UInt160 token, bool isRestricted)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
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

        /// <summary>
        /// Aborts execution if the target contract is in the account's restricted-token set.
        /// </summary>
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

        public static void ClearAccount(UInt160 accountId)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");

            byte[] prefix = Helper.Concat(Prefix_RestrictedTokens, (byte[])accountId);
            Iterator iterator = Storage.Find(Storage.CurrentContext, prefix, FindOptions.KeysOnly);
            while (iterator.Next())
            {
                Storage.Delete(Storage.CurrentContext, (ByteString)iterator.Value);
            }
        }
    }
}
