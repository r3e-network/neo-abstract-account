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
            if (Runtime.Trigger != TriggerType.Verification) return false;
            AssertAccountExists(accountId);

            // Proxy-account verification is valid only while this account is executing
            // through the AA entrypoint and the immediate call target matches.
            if (!HasActiveVerifyContext(accountId, Runtime.CallingScriptHash)) return false;

            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                return (bool)Contract.Call(customVerifier, "verify", CallFlags.ReadOnly, new object[] { accountId });
            }

            bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
            if (isAdmin) return true;

            bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
            if (isManager) return true;

            ByteString metaSignerBytes = GetMetaTxContext(accountId);
            if (metaSignerBytes != null)
            {
                UInt160 metaSigner = (UInt160)metaSignerBytes;
                UInt160[] explicitSigners = new UInt160[] { metaSigner };

                bool metaAdmin = CheckExplicitSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), explicitSigners);
                if (metaAdmin) return true;

                bool metaManager = CheckExplicitSignatures(GetManagers(accountId), GetManagerThreshold(accountId), explicitSigners);
                if (metaManager) return true;
                
                bool metaDome = CheckExplicitSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners);
                if (metaDome)
                {
                    BigInteger timeout = GetDomeTimeout(accountId);
                    if (timeout > 0)
                    {
                        BigInteger lastActive = GetLastActiveTimestamp(accountId);
                        if (Runtime.Time >= lastActive + timeout && IsDomeOracleUnlocked(accountId)) return true;
                    }
                }
            }

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

            return false;
        }
    }
}
