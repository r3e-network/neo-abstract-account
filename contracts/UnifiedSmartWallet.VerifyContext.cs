using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        // ========================================================================
        // 5. N3 Magic: Proxy Verification Script Support
        // ========================================================================

        // Allows external DeFi contracts to call CheckWitness(accountId) during ExecuteUserOp

        [Safe]
        /// <summary>
        /// Temporary witness bridge that lets the target contract recognize the active AA context.
        /// </summary>
        public static bool Verify(UInt160 accountId)
        {
            if (Runtime.Trigger == TriggerType.Application)
            {
                byte[] key = Helper.Concat(Prefix_VerifyContext, (byte[])accountId);
                ByteString? expectedTarget = Storage.Get(Storage.CurrentContext, key);
                return expectedTarget != null && (UInt160)expectedTarget == Runtime.CallingScriptHash;
            }

            return false;
        }

        [Safe]
        public static bool CanConfigureVerifier(UInt160 accountId, UInt160 verifierContract)
        {
            byte[] key = Helper.Concat(Prefix_VerifierConfigContext, (byte[])accountId);
            ByteString? expectedVerifier = Storage.Get(Storage.CurrentContext, key);
            return expectedVerifier != null
                && Runtime.CallingScriptHash == verifierContract
                && (UInt160)expectedVerifier == verifierContract;
        }

        [Safe]
        public static bool CanConfigureHook(UInt160 accountId, UInt160 hookContract)
        {
            byte[] key = Helper.Concat(Prefix_HookConfigContext, (byte[])accountId);
            ByteString? expectedHook = Storage.Get(Storage.CurrentContext, key);
            return expectedHook != null
                && Runtime.CallingScriptHash == hookContract
                && (UInt160)expectedHook == hookContract;
        }
    }
}
