using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Hooks
{
    [DisplayName("WhitelistHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Target Contract Whitelist Hook")]
    public class WhitelistHook : SmartContract
    {
        private static readonly byte[] Prefix_Whitelist = new byte[] { 0x01 };

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

        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            if (opParams.Length < 1) return;
            UInt160 targetContract = (UInt160)opParams[0];

            byte[] key = Helper.Concat(Prefix_Whitelist, (byte[])accountId);
            key = Helper.Concat(key, (byte[])targetContract);
            
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, key) != null, "Target contract not in whitelist");
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
        }
    }
}
