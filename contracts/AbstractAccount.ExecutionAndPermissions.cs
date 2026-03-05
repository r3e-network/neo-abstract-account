using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private static readonly CallFlags ExecutionCallFlags = CallFlags.All;

        public static object Execute(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);
            EnterExecution(accountId);
            SetVerifyContext(accountId, targetContract);
            try
            {
                OnExecute(accountId, targetContract, method, args);
                return DispatchContractCall(targetContract, method, args);
            }
            finally
            {
                ClearVerifyContext(accountId);
                ExitExecution(accountId);
            }
        }

        public static object ExecuteByAddress(UInt160 accountAddress, UInt160 targetContract, string method, object[] args)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return Execute(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecuteNative(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);
            bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
            bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
            ExecutionEngine.Assert(isAdmin || isManager, "Unauthorized");
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecute(ByteString accountId, UInt160[] verifiedSigners, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);
            bool isAdmin = CheckExplicitSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), verifiedSigners);
            bool isManager = CheckExplicitSignatures(GetManagers(accountId), GetManagerThreshold(accountId), verifiedSigners);
            ExecutionEngine.Assert(isAdmin || isManager, "Unauthorized");
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void EnforceRestrictions(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertMethodAllowedByPolicy(method);

            StorageMap blacklistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)));
            ByteString isBlacklisted = blacklistMap.Get(targetContract);
            ExecutionEngine.Assert(isBlacklisted == null || isBlacklisted != (ByteString)new byte[] { 1 }, "Target is blacklisted");

            StorageMap whitelistEnabledMap = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            ByteString whitelistOnly = whitelistEnabledMap.Get(GetStorageKey(accountId));
            if (whitelistOnly != null && whitelistOnly == (ByteString)new byte[] { 1 })
            {
                StorageMap whitelistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)));
                ByteString isWhitelisted = whitelistMap.Get(targetContract);
                ExecutionEngine.Assert(isWhitelisted != null && isWhitelisted == (ByteString)new byte[] { 1 }, "Target is not in whitelist");
            }

            if (method == "transfer" && args.Length >= 3)
            {
                BigInteger amount = (BigInteger)args[2];
                StorageMap maxMap = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, GetStorageKey(accountId)));
                ByteString maxValBytes = maxMap.Get(targetContract);
                if (maxValBytes != null)
                {
                    BigInteger maxVal = (BigInteger)maxValBytes;
                    ExecutionEngine.Assert(maxVal <= 0 || amount <= maxVal, "Amount exceeds max limit");
                }
            }
        }

        private static object DispatchContractCall(UInt160 targetContract, string method, object[] args)
        {
            if (method == "transfer") return Contract.Call(targetContract, "transfer", ExecutionCallFlags, args);
            if (method == "balanceOf") return Contract.Call(targetContract, "balanceOf", ExecutionCallFlags, args);
            if (method == "symbol") return Contract.Call(targetContract, "symbol", ExecutionCallFlags, args);
            if (method == "decimals") return Contract.Call(targetContract, "decimals", ExecutionCallFlags, args);
            if (method == "totalSupply") return Contract.Call(targetContract, "totalSupply", ExecutionCallFlags, args);
            if (method == "allowance") return Contract.Call(targetContract, "allowance", ExecutionCallFlags, args);
            if (method == "approve") return Contract.Call(targetContract, "approve", ExecutionCallFlags, args);
            if (method == "getNonce") return Contract.Call(targetContract, "getNonce", ExecutionCallFlags, args);
            if (method == "getNonceForAccount") return Contract.Call(targetContract, "getNonceForAccount", ExecutionCallFlags, args);
            if (method == "getNonceForAddress") return Contract.Call(targetContract, "getNonceForAddress", ExecutionCallFlags, args);
            if (method == "setWhitelistByAddress") return Contract.Call(targetContract, "setWhitelistByAddress", ExecutionCallFlags, args);
            if (method == "setWhitelistModeByAddress") return Contract.Call(targetContract, "setWhitelistModeByAddress", ExecutionCallFlags, args);
            if (method == "setWhitelist") return Contract.Call(targetContract, "setWhitelist", ExecutionCallFlags, args);
            if (method == "setWhitelistMode") return Contract.Call(targetContract, "setWhitelistMode", ExecutionCallFlags, args);
            if (method == "setBlacklistByAddress") return Contract.Call(targetContract, "setBlacklistByAddress", ExecutionCallFlags, args);
            if (method == "setBlacklist") return Contract.Call(targetContract, "setBlacklist", ExecutionCallFlags, args);
            if (method == "setMaxTransferByAddress") return Contract.Call(targetContract, "setMaxTransferByAddress", ExecutionCallFlags, args);
            if (method == "setMaxTransfer") return Contract.Call(targetContract, "setMaxTransfer", ExecutionCallFlags, args);
            if (method == "setAdminsByAddress") return Contract.Call(targetContract, "setAdminsByAddress", ExecutionCallFlags, args);
            if (method == "setAdmins") return Contract.Call(targetContract, "setAdmins", ExecutionCallFlags, args);
            if (method == "setManagersByAddress") return Contract.Call(targetContract, "setManagersByAddress", ExecutionCallFlags, args);
            if (method == "setManagers") return Contract.Call(targetContract, "setManagers", ExecutionCallFlags, args);
            if (method == "bindAccountAddress") return Contract.Call(targetContract, "bindAccountAddress", ExecutionCallFlags, args);

            ExecutionEngine.Assert(false, "Method not allowed by policy");
            return null;
        }

        private static void AssertMethodAllowedByPolicy(string method)
        {
            ExecutionEngine.Assert(method != null && method.Length > 0, "Invalid method");
            if (method == "transfer") return;
            if (method == "balanceOf") return;
            if (method == "symbol") return;
            if (method == "decimals") return;
            if (method == "totalSupply") return;
            if (method == "allowance") return;
            if (method == "approve") return;
            if (method == "getNonce") return;
            if (method == "getNonceForAccount") return;
            if (method == "getNonceForAddress") return;
            if (method == "setWhitelistByAddress") return;
            if (method == "setWhitelistModeByAddress") return;
            if (method == "setWhitelist") return;
            if (method == "setWhitelistMode") return;
            if (method == "setBlacklistByAddress") return;
            if (method == "setBlacklist") return;
            if (method == "setMaxTransferByAddress") return;
            if (method == "setMaxTransfer") return;
            if (method == "setAdminsByAddress") return;
            if (method == "setAdmins") return;
            if (method == "setManagersByAddress") return;
            if (method == "setManagers") return;
            if (method == "bindAccountAddress") return;

            ExecutionEngine.Assert(false, "Method not allowed by policy");
        }

        private static bool CheckNativeSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                if (Runtime.CheckWitness(roles[i])) count++;
            }
            return count >= threshold;
        }

        private static bool CheckExplicitSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold, UInt160[] verifiedSigners)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                foreach (var signer in verifiedSigners)
                {
                    if (roles[i] == signer)
                    {
                        count++;
                        break;
                    }
                }
            }
            return count >= threshold;
        }
    }
}
