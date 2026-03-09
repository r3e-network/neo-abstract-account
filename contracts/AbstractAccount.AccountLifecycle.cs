using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Lifecycle entrypoints define how a logical account is created, optionally bound to its deterministic proxy,
    // and later verified during either transaction verification or contract-to-contract application execution.
    public partial class UnifiedSmartWallet
    {
        /// <summary>
        /// Creates a logical account record keyed by <paramref name="accountId"/> and seeds its admin/manager quorums.
        /// At this stage the account may still be unbound from its deterministic proxy address.
        /// </summary>
        public static void CreateAccount(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> admins, int adminThreshold, Neo.SmartContract.Framework.List<UInt160> managers, int managerThreshold)
        {
            CreateAccountInternal(accountId, admins, adminThreshold, managers, managerThreshold);
        }

        /// <summary>
        /// Creates the account and immediately binds it to the deterministic proxy address derived from the same
        /// <paramref name="accountId"/>. This is the common happy-path used by the frontend and SDK.
        /// </summary>
        public static void CreateAccountWithAddress(
            ByteString accountId,
            UInt160 accountAddress,
            Neo.SmartContract.Framework.List<UInt160> admins,
            int adminThreshold,
            Neo.SmartContract.Framework.List<UInt160> managers,
            int managerThreshold)
        {
            CreateAccountInternal(accountId, admins, adminThreshold, managers, managerThreshold);
            BindAccountAddressInternal(accountId, accountAddress);
        }

        [Safe]
        /// <summary>
        /// Verification entrypoint for the deterministic proxy witness associated with <paramref name="accountId"/>.
        /// </summary>
        /// <remarks>
        /// During the Verification trigger the contract validates the transaction shape and checks native or custom
        /// verifier authorization. During the Application trigger it only returns true when an active AA execution path
        /// has pre-authorized the current target contract through SetVerifyContext.
        /// </remarks>
        public static bool Verify(ByteString accountId)
        {
            AssertAccountExists(accountId);

            // Application-trigger verification happens when a downstream contract calls CheckWitness on the
            // deterministic proxy address. Only the currently active AA execution path is allowed to satisfy it.
            if (Runtime.Trigger == TriggerType.Application)
            {
                // Proxy-account verification is valid during application execution
                // if it's being called strictly by the target contract via CheckWitness.
                if (HasActiveVerifyContext(accountId, Runtime.CallingScriptHash)) return true;
                return false;
            }

            // Verification-trigger execution happens on the outer transaction itself. The script must be the hardened
            // one-self-call AA wrapper shape, and authorization is then checked against custom verifier, admin, manager,
            // or dome rules.
            if (Runtime.Trigger == TriggerType.Verification)
            {
                if (!IsAllowedProxyVerificationTransaction()) return false;

                // Directly signed natively. Verify attached native signatures against policies.
                UInt160 customVerifier = GetVerifierContract(accountId);
                if (customVerifier != null && customVerifier != UInt160.Zero)
                {
                    return (bool)Contract.Call(customVerifier, "verify", CallFlags.ReadOnly, new object[] { accountId });
                }

                bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
                if (isAdmin) return true;

                bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
                if (isManager) return true;

                bool isDome = CheckNativeSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId));
                if (isDome)
                {
                    BigInteger timeout = GetDomeTimeout(accountId);
                    if (timeout > 0)
                    {
                        BigInteger lastActive = GetLastActiveTimestamp(accountId);
                        if (Runtime.Time >= lastActive + timeout && IsDomeOracleUnlocked(accountId)) return true;
                    }
                }
            }

            return false;
        }
    }
}
