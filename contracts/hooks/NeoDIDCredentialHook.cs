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
    /// Hook that gates target-contract access on account-local NeoDID credential markers.
    /// </summary>
    /// <remarks>
    /// This hook does not perform off-chain verification itself. Instead, a trusted orchestration
    /// path issues or revokes credential flags after NeoDID or Oracle workflows succeed, and this
    /// hook enforces those flags at execution time.
    /// </remarks>
    [DisplayName("NeoDIDCredentialHook")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "NeoDID Credential Check Hook")]
    public class NeoDIDCredentialHook : SmartContract
    {
        // Setup: AccountId + TargetContract -> Required Credential Subject/Type (string or byte[])
        private static readonly byte[] Prefix_RequiredCredential = new byte[] { 0x01 };
        // Setup: AccountId -> Verified Credentials HashMap
        private static readonly byte[] Prefix_VerifiedCredentials = new byte[] { 0x02 };

        /// <summary>
        /// Declares which credential type is required before the account may call a target contract.
        /// </summary>
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

        /// <summary>
        /// Marks a credential type as satisfied for the account.
        /// </summary>
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

        /// <summary>
        /// Removes a previously issued credential marker from the account.
        /// </summary>
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

        /// <summary>
        /// Rejects execution when the target contract requires a credential the account has not been issued.
        /// </summary>
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

        public static void ClearAccount(UInt160 accountId)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");

            ClearPrefixForAccount(Prefix_RequiredCredential, accountId);
            ClearPrefixForAccount(Prefix_VerifiedCredentials, accountId);
        }

        private static void ClearPrefixForAccount(byte[] prefix, UInt160 accountId)
        {
            byte[] accountPrefix = Helper.Concat(prefix, (byte[])accountId);
            Iterator iterator = Storage.Find(Storage.CurrentContext, accountPrefix, FindOptions.KeysOnly);
            while (iterator.Next())
            {
                Storage.Delete(Storage.CurrentContext, (ByteString)iterator.Value);
            }
        }
    }
}
