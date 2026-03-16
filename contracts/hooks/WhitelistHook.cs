using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Hooks
{
    /// <summary>
    /// Hook that restricts an AA account to an explicit target-contract allowlist.
    /// </summary>
    /// <remarks>
    /// Use this hook when an account should only talk to a small, reviewed set of contracts.
    /// Configuration must still flow through the AA core via <c>canConfigureHook</c>.
    /// </remarks>
    [DisplayName("WhitelistHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Target Contract Whitelist Hook")]
    public class WhitelistHook : SmartContract
    {
        private static readonly byte[] Prefix_Whitelist = new byte[] { 0x01 };

        /// <summary>
        /// Adds or removes a target contract from the account's allowlist.
        /// </summary>
        public static void SetWhitelist(UInt160 accountId, UInt160 targetContract, bool allowed)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Prefix_Whitelist, (byte[])accountId);
            key = Helper.Concat(key, (byte[])targetContract);
            if (allowed) Storage.Put(Storage.CurrentContext, key, new byte[] { 1 });
            else Storage.Delete(Storage.CurrentContext, key);
        }

        /// <summary>
        /// Blocks execution unless the target contract is explicitly allowlisted for the account.
        /// </summary>
        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            if (opParams.Length < 1) return;
            UInt160 targetContract = (UInt160)opParams[0];

            ExecutionEngine.Assert(IsWhitelisted(accountId, targetContract), "Target contract not in whitelist");
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
        }

        [Safe]
        public static bool IsWhitelisted(UInt160 accountId, UInt160 targetContract)
        {
            byte[] key = Helper.Concat(Prefix_Whitelist, (byte[])accountId);
            key = Helper.Concat(key, (byte[])targetContract);
            return Storage.Get(Storage.CurrentContext, key) != null;
        }
    }
}
