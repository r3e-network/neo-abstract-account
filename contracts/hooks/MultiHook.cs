using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Hooks
{
    public class UserOperation
    {
        public UInt160 TargetContract;
        public string Method;
        public object[] Args;
        public BigInteger Nonce;
        public BigInteger Deadline;
        public ByteString Signature;
    }

    [DisplayName("MultiHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Composable Hook to chain multiple hooks")]
    public class MultiHook : SmartContract
    {
        private static readonly byte[] Prefix_Hooks = new byte[] { 0x01 };

        public static void SetHooks(UInt160 accountId, UInt160[] hooks)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Prefix_Hooks, (byte[])accountId);
            if (hooks == null || hooks.Length == 0)
            {
                Storage.Delete(Storage.CurrentContext, key);
            }
            else
            {
                Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(hooks));
            }
        }

        [Safe]
        public static UInt160[] GetHooks(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_Hooks, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return new UInt160[0];
            return (UInt160[])StdLib.Deserialize(data!);
        }

        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            UInt160[] hooks = GetHooks(accountId);
            for (int i = 0; i < hooks.Length; i++)
            {
                Contract.Call(hooks[i], "preExecute", CallFlags.All, new object[] { accountId, opParams });
            }
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
            UInt160[] hooks = GetHooks(accountId);
            // Post execute should probably run in reverse order
            for (int i = hooks.Length - 1; i >= 0; i--)
            {
                Contract.Call(hooks[i], "postExecute", CallFlags.All, new object[] { accountId, opParams, result });
            }
        }
    }
}
