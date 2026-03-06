using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        public static void CreateAccount(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> admins, int adminThreshold, Neo.SmartContract.Framework.List<UInt160> managers, int managerThreshold)
        {
            CreateAccountInternal(accountId, admins, adminThreshold, managers, managerThreshold);
        }

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
        public static bool Verify(ByteString accountId)
        {
            AssertAccountExists(accountId);

            if (Runtime.Trigger == TriggerType.Application)
            {
                // Proxy-account verification is valid during application execution
                // if it's being called strictly by the target contract via CheckWitness.
                if (HasActiveVerifyContext(accountId, Runtime.CallingScriptHash)) return true;
                return false;
            }

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
