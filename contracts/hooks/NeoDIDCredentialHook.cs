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
        private static readonly byte[] Prefix_RequiredProvider = new byte[] { 0x01 };
        private static readonly byte[] Prefix_RequiredClaimType = new byte[] { 0x02 };
        private static readonly byte[] Prefix_RequiredClaimValue = new byte[] { 0x03 };
        private static readonly byte[] Prefix_Registry = new byte[] { 0x04 };

        public static void _deploy(object data, bool update) => HookAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => HookAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => HookAuthority.SetAuthorizedCore(coreContract);

        [Safe]
        public static UInt160 GetRegistry()
        {
            ByteString? raw = Storage.Get(Storage.CurrentContext, Prefix_Registry);
            return raw == null ? UInt160.Zero : (UInt160)raw;
        }

        public static void SetRegistry(UInt160 registryContract)
        {
            HookAuthority.ValidateAdminCaller();
            ExecutionEngine.Assert(registryContract != UInt160.Zero && registryContract.IsValid, "Invalid NeoDID registry");
            Storage.Put(Storage.CurrentContext, Prefix_Registry, (byte[])registryContract);
        }

        /// <summary>
        /// Declares which NeoDID provider/claim pair is required before the account may call a target contract.
        /// </summary>
        public static void RequireCredentialForContract(
            UInt160 accountId,
            UInt160 targetContract,
            string provider,
            string claimType,
            string claimValue)
        {
            HookAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            if (string.IsNullOrEmpty(provider) || string.IsNullOrEmpty(claimType))
            {
                ClearRequirement(accountId, targetContract);
                return;
            }

            Storage.Put(Storage.CurrentContext, BuildTargetScopedKey(Prefix_RequiredProvider, accountId, targetContract), provider);
            Storage.Put(Storage.CurrentContext, BuildTargetScopedKey(Prefix_RequiredClaimType, accountId, targetContract), claimType);

            byte[] claimValueKey = BuildTargetScopedKey(Prefix_RequiredClaimValue, accountId, targetContract);
            if (string.IsNullOrEmpty(claimValue))
            {
                Storage.Delete(Storage.CurrentContext, claimValueKey);
            }
            else
            {
                Storage.Put(Storage.CurrentContext, claimValueKey, claimValue);
            }
        }

        /// <summary>
        /// Rejects execution when the target contract requires a NeoDID binding that is not active on the registry.
        /// </summary>
        public static void PreExecute(UInt160 accountId, object[] opParams)
        {
            HookAuthority.ValidateExecutionCaller(accountId, Runtime.CallingScriptHash, Runtime.ExecutingScriptHash);
            if (opParams.Length < 1) return;
            UInt160 targetContract = (UInt160)opParams[0];

            string provider = ReadRequiredString(Prefix_RequiredProvider, accountId, targetContract);
            string claimType = ReadRequiredString(Prefix_RequiredClaimType, accountId, targetContract);
            if (provider.Length == 0 || claimType.Length == 0) return;

            UInt160 registry = GetRegistry();
            ExecutionEngine.Assert(registry != UInt160.Zero && registry.IsValid, "NeoDID registry not configured");

            object bindingObject = Contract.Call(
                registry,
                "getBinding",
                CallFlags.ReadOnly,
                new object[] { accountId, provider, claimType });
            object[] binding = (object[])bindingObject;
            ExecutionEngine.Assert(binding.Length >= 9, "NeoDID binding malformed");

            bool active = (bool)binding[8];
            ExecutionEngine.Assert(active, "NeoDID Credential Missing");

            string expectedClaimValue = ReadRequiredString(Prefix_RequiredClaimValue, accountId, targetContract);
            if (expectedClaimValue.Length > 0)
            {
                string actualClaimValue = (string)binding[3];
                ExecutionEngine.Assert(actualClaimValue == expectedClaimValue, "NeoDID Claim Value Mismatch");
            }
        }

        public static void PostExecute(UInt160 accountId, object[] opParams, object result)
        {
        }

        public static void ClearAccount(UInt160 accountId)
        {
            HookAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);

            ClearPrefixForAccount(Prefix_RequiredProvider, accountId);
            ClearPrefixForAccount(Prefix_RequiredClaimType, accountId);
            ClearPrefixForAccount(Prefix_RequiredClaimValue, accountId);
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

        private static void ClearRequirement(UInt160 accountId, UInt160 targetContract)
        {
            Storage.Delete(Storage.CurrentContext, BuildTargetScopedKey(Prefix_RequiredProvider, accountId, targetContract));
            Storage.Delete(Storage.CurrentContext, BuildTargetScopedKey(Prefix_RequiredClaimType, accountId, targetContract));
            Storage.Delete(Storage.CurrentContext, BuildTargetScopedKey(Prefix_RequiredClaimValue, accountId, targetContract));
        }

        private static byte[] BuildTargetScopedKey(byte[] prefix, UInt160 accountId, UInt160 targetContract)
        {
            return Helper.Concat(Helper.Concat(prefix, (byte[])accountId), (byte[])targetContract);
        }

        private static string ReadRequiredString(byte[] prefix, UInt160 accountId, UInt160 targetContract)
        {
            ByteString? raw = Storage.Get(Storage.CurrentContext, BuildTargetScopedKey(prefix, accountId, targetContract));
            return raw == null ? "" : (string)raw;
        }
    }
}
