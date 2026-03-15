using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Hooks
{
    [DisplayName("NeoDIDCredentialHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "NeoDID Credential Check Hook")]
    public class NeoDIDCredentialHook : SmartContract
    {
        // Setup: AccountId + TargetContract -> Required Credential Subject/Type (string or byte[])
        private static readonly byte[] Prefix_RequiredCredential = new byte[] { 0x01 };
        // Setup: AccountId -> Verified Credentials HashMap
        private static readonly byte[] Prefix_VerifiedCredentials = new byte[] { 0x02 };

        public static void RequireCredentialForContract(UInt160 accountId, UInt160 targetContract, string credentialType)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Helper.Concat(Prefix_RequiredCredential, (byte[])accountId), (byte[])targetContract);
            if (string.IsNullOrEmpty(credentialType)) Storage.Delete(Storage.CurrentContext, key);
            else Storage.Put(Storage.CurrentContext, key, credentialType);
        }

        public static void IssueCredential(UInt160 accountId, string credentialType)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Helper.Concat(Prefix_VerifiedCredentials, (byte[])accountId), (ByteString)credentialType);
            Storage.Put(Storage.CurrentContext, key, new byte[] { 1 });
        }

        public static void RevokeCredential(UInt160 accountId, string credentialType)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Helper.Concat(Prefix_VerifiedCredentials, (byte[])accountId), (ByteString)credentialType);
            Storage.Delete(Storage.CurrentContext, key);
        }

        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            if (opParams.Length < 1) return;
            UInt160 targetContract = (UInt160)opParams[0];

            byte[] reqKey = Helper.Concat(Helper.Concat(Prefix_RequiredCredential, (byte[])accountId), (byte[])targetContract);
            ByteString? reqData = Storage.Get(Storage.CurrentContext, reqKey);

            if (reqData != null)
            {
                ByteString reqType = (ByteString)reqData;
                byte[] credKey = Helper.Concat(Helper.Concat(Prefix_VerifiedCredentials, (byte[])accountId), (byte[])reqType);
                ByteString? credData = Storage.Get(Storage.CurrentContext, credKey);
                ExecutionEngine.Assert(credData != null, "NeoDID Credential Missing");
            }
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
        }
    }
}
