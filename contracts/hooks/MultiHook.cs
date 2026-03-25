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

    /// <summary>
    /// Hook combiner that executes multiple hook plugins as a single policy surface.
    /// </summary>
    /// <remarks>
    /// Use this contract when an account must satisfy more than one policy at once, for example
    /// whitelist plus daily limit plus a credential check. Pre-hooks run in forward order and
    /// post-hooks run in reverse order.
    /// </remarks>
    [DisplayName("MultiHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Composable Hook to chain multiple hooks")]
    public class MultiHook : SmartContract
    {
        private static readonly byte[] Prefix_Hooks = new byte[] { 0x01 };
        private const int MaxHooks = 8;

        public static void _deploy(object data, bool update) => HookAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => HookAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => HookAuthority.SetAuthorizedCore(coreContract);

        /// <summary>
        /// Sets the ordered hook list for an account or clears it when the array is empty.
        /// </summary>
        public static void SetHooks(UInt160 accountId, UInt160[] hooks)
        {
            HookAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            byte[] key = Helper.Concat(Prefix_Hooks, (byte[])accountId);
            if (hooks == null || hooks.Length == 0)
            {
                Storage.Delete(Storage.CurrentContext, key);
            }
            else
            {
                ExecutionEngine.Assert(hooks.Length <= MaxHooks, "Too many hooks");
                for (int i = 0; i < hooks.Length; i++)
                {
                    ExecutionEngine.Assert(hooks[i] != UInt160.Zero && hooks[i].IsValid, "Invalid hook");
                    ExecutionEngine.Assert(hooks[i] != Runtime.ExecutingScriptHash, "Self hook not allowed");
                    for (int j = i + 1; j < hooks.Length; j++)
                    {
                        ExecutionEngine.Assert(hooks[i] != hooks[j], "Duplicate hook not allowed");
                    }
                }
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

        /// <summary>
        /// Forwards the pre-execution phase through each configured hook in order.
        /// </summary>
        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            HookAuthority.ValidateExecutionCaller(accountId, Runtime.CallingScriptHash, Runtime.ExecutingScriptHash);
            UInt160[] hooks = GetHooks(accountId);
            for (int i = 0; i < hooks.Length; i++)
            {
                Contract.Call(hooks[i], "preExecute", CallFlags.All, new object[] { accountId, opParams });
            }
        }

        /// <summary>
        /// Forwards the post-execution phase through each configured hook in reverse order.
        /// </summary>
        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
            HookAuthority.ValidateExecutionCaller(accountId, Runtime.CallingScriptHash, Runtime.ExecutingScriptHash);
            UInt160[] hooks = GetHooks(accountId);
            for (int i = hooks.Length - 1; i >= 0; i--)
            {
                Contract.Call(hooks[i], "postExecute", CallFlags.All, new object[] { accountId, opParams, result });
            }
        }

        public static void ClearAccount(UInt160 accountId)
        {
            HookAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_Hooks, (byte[])accountId));
        }
    }
}
