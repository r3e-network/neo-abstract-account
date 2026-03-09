using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Execution helpers are the contract's main runtime gate. They authenticate the caller, enforce policy
    // restrictions, open a tightly scoped verification window for the downstream contract, and finally dispatch the
    // call with read-only or mutating flags based on the method being invoked.
    public partial class UnifiedSmartWallet
    {
        // Calls that only inspect state are dispatched with ReadOnly flags; state-changing calls keep full flags.
        private static readonly CallFlags MutatingExecutionCallFlags = CallFlags.All;
        private static readonly CallFlags ReadOnlyExecutionCallFlags = CallFlags.ReadOnly;

        /// <summary>
        /// Native Neo execution path. This is the core AA wrapper used by wallets once they have assembled a standard
        /// transaction with the deterministic proxy witness.
        /// </summary>
        public static object Execute(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            // 1. Authenticate signer(s) and enforce whitelist / blacklist / transfer policies.
            CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);
            // 2. Lock execution and expose a verify context so only this target contract can consume CheckWitness(proxy).
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

        /// <summary>
        /// Address-based convenience wrapper for Execute. Frontends usually prefer this form once the logical account has
        /// been bound to its deterministic verify-proxy address.
        /// </summary>
        public static object ExecuteByAddress(UInt160 accountAddress, UInt160 targetContract, string method, object[] args)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return Execute(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecuteNative(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);

            // Authorization order is: custom verifier (if configured), then native admin/manager quorum, then dome
            // signers subject to timeout + oracle unlock. Only after authorization do we evaluate target restrictions.
            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                bool isAuthorized = (bool)Contract.Call(customVerifier, "verify", CallFlags.ReadOnly, new object[] { accountId });
                ExecutionEngine.Assert(isAuthorized, "Unauthorized by custom verifier");
                UpdateLastActiveTimestamp(accountId);
            }
            else
            {
                bool isAdmin = CheckNativeSignatures(GetAdmins(accountId), GetAdminThreshold(accountId));
                bool isManager = CheckNativeSignatures(GetManagers(accountId), GetManagerThreshold(accountId));
                if (isAdmin || isManager)
                {
                    UpdateLastActiveTimestamp(accountId);
                }
                else
                {
                    bool isDome = CheckNativeSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId));
                    ExecutionEngine.Assert(isDome, "Unauthorized");

                    BigInteger timeout = GetDomeTimeout(accountId);
                    ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

                    BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                    ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");
                    ExecutionEngine.Assert(IsDomeOracleUnlocked(accountId), "Dome account not unlocked by oracle");
                    UpdateLastActiveTimestamp(accountId);
                }
            }
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        private static void CheckPermissionsAndExecute(ByteString accountId, UInt160[] verifiedSigners, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);

            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                bool isAuthorized = (bool)Contract.Call(customVerifier, "verify", CallFlags.ReadOnly, new object[] { accountId });
                ExecutionEngine.Assert(isAuthorized, "Unauthorized by custom verifier");
                UpdateLastActiveTimestamp(accountId);
            }
            else
            {
                bool isAdmin = CheckMixedSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), verifiedSigners);
                bool isManager = CheckMixedSignatures(GetManagers(accountId), GetManagerThreshold(accountId), verifiedSigners);
                if (isAdmin || isManager)
                {
                    UpdateLastActiveTimestamp(accountId);
                }
                else
                {
                    bool isDome = CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), verifiedSigners);
                    ExecutionEngine.Assert(isDome, "Unauthorized");

                    BigInteger timeout = GetDomeTimeout(accountId);
                    ExecutionEngine.Assert(timeout > 0, "Dome account not configured");

                    BigInteger lastActive = GetLastActiveTimestampForAuth(accountId);
                    ExecutionEngine.Assert(Runtime.Time >= lastActive + timeout, "Dome account not active yet");
                    ExecutionEngine.Assert(IsDomeOracleUnlocked(accountId), "Dome account not unlocked by oracle");
                    UpdateLastActiveTimestamp(accountId);
                }
            }
            EnforceRestrictions(accountId, targetContract, method, args);
        }

        // Policy enforcement is intentionally centralized so every execution path—native and meta-tx—runs through the
        // same whitelist, blacklist, method-allowlist, and max-transfer rules.
        private static void EnforceRestrictions(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertMethodAllowedByPolicy(targetContract, method);

            StorageMap blacklistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)));
            ByteString? isBlacklisted = blacklistMap.Get(targetContract);
            ExecutionEngine.Assert(isBlacklisted == null || isBlacklisted != (ByteString)new byte[] { 1 }, "Target is blacklisted");

            StorageMap whitelistMap = new StorageMap(Storage.CurrentContext, Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)));
            StorageMap whitelistEnabledMap = new StorageMap(Storage.CurrentContext, WhitelistEnabledPrefix);
            ByteString? whitelistOnly = whitelistEnabledMap.Get(GetStorageKey(accountId));
            if (whitelistOnly != null && whitelistOnly == (ByteString)new byte[] { 1 })
            {
                ByteString? isWhitelisted = whitelistMap.Get(targetContract);
                ExecutionEngine.Assert(isWhitelisted != null && isWhitelisted == (ByteString)new byte[] { 1 }, "Target is not in whitelist");
            }

            if (method == "transfer" || method == "approve")
            {
                if (targetContract != Runtime.ExecutingScriptHash)
                {
                    ByteString? isWhitelisted = whitelistMap.Get(targetContract);
                    ExecutionEngine.Assert(isWhitelisted != null && isWhitelisted == (ByteString)new byte[] { 1 }, "Asset-moving target is not in whitelist");
                }

                StorageMap maxMap = new StorageMap(Storage.CurrentContext, Helper.Concat(MaxTransferPrefix, GetStorageKey(accountId)));
                ByteString? maxValBytes = maxMap.Get(targetContract);
                if (maxValBytes != null)
                {
                    BigInteger amount = GetRestrictedAmount(method, args);
                    BigInteger maxVal = (BigInteger)maxValBytes;
                    ExecutionEngine.Assert(maxVal <= 0 || amount <= maxVal, "Amount exceeds max limit");
                }
            }
        }

        private static bool IsReadOnlyMethod(string method)
        {
            return method == "balanceOf"
                || method == "symbol"
                || method == "decimals"
                || method == "totalSupply"
                || method == "allowance"
                || method == "getNonce"
                || method == "getNonceForAccount"
                || method == "getNonceForAddress";
        }

        private static CallFlags ResolveCallFlags(string method)
        {
            return IsReadOnlyMethod(method) ? ReadOnlyExecutionCallFlags : MutatingExecutionCallFlags;
        }

        private static object DispatchContractCall(UInt160 targetContract, string method, object[] args)
        {
            return Contract.Call(targetContract, method, ResolveCallFlags(method), args);
        }

        private static BigInteger GetRestrictedAmount(string method, object[] args)
        {
            ExecutionEngine.Assert(args != null, "Invalid args");
            object[] validatedArgs = args!;

            if (method == "transfer")
            {
                ExecutionEngine.Assert(validatedArgs.Length >= 3 && validatedArgs[2] is BigInteger, "Invalid transfer amount");
                return (BigInteger)validatedArgs[2];
            }

            // Common signatures:
            // - ERC20-like approve(spender, amount) => args[1]
            // - Neo-style approve(from, spender, amount) => args[2]
            if (validatedArgs.Length >= 2 && validatedArgs[1] is BigInteger) return (BigInteger)validatedArgs[1];
            if (validatedArgs.Length >= 3 && validatedArgs[2] is BigInteger) return (BigInteger)validatedArgs[2];

            ExecutionEngine.Assert(false, "Invalid approve amount");
            return 0;
        }

        private static void AssertMethodAllowedByPolicy(UInt160 targetContract, string method)
        {
            ExecutionEngine.Assert(method != null && method.Length > 0, "Invalid method");
            bool isSelfTarget = targetContract == Runtime.ExecutingScriptHash;

            if (method == "transfer") return;
            if (method == "balanceOf") return;
            if (method == "symbol") return;
            if (method == "decimals") return;
            if (method == "totalSupply") return;
            if (method == "allowance") return;
            if (method == "approve") return;

            if (method == "getNonce" ||
                method == "getNonceForAccount" ||
                method == "getNonceForAddress" ||
                method == "setWhitelistByAddress" ||
                method == "setWhitelistModeByAddress" ||
                method == "setWhitelist" ||
                method == "setWhitelistMode" ||
                method == "setBlacklistByAddress" ||
                method == "setBlacklist" ||
                method == "setMaxTransferByAddress" ||
                method == "setMaxTransfer" ||
                method == "setAdminsByAddress" ||
                method == "setAdmins" ||
                method == "setManagersByAddress" ||
                method == "setManagers" ||
                method == "bindAccountAddress" ||
                method == "setDomeAccountsByAddress" ||
                method == "setDomeAccounts" ||
                method == "setDomeOracleByAddress" ||
                method == "setDomeOracle" ||
                method == "setVerifierContractByAddress" ||
                method == "setVerifierContract" ||
                method == "requestDomeActivationByAddress" ||
                method == "requestDomeActivation" ||
                method == "domeActivationCallback")
            {
                ExecutionEngine.Assert(isSelfTarget, "Internal method requires self target");
                return;
            }

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

        private static bool CheckMixedSignatures(Neo.SmartContract.Framework.List<UInt160> roles, int threshold, UInt160[] verifiedSigners)
        {
            if (threshold <= 0 || roles == null || roles.Count == 0) return false;
            int count = 0;
            for (int i = 0; i < roles.Count; i++)
            {
                bool matched = false;

                // 1. Check if it's an explicitly verified EVM signature
                // This handles Meta-Transactions where an Ethereum user has signed an EIP-712 payload.
                // The signature is passed in the args, recovered via ecrecover in ExecuteMetaTx, and passed here.
                if (verifiedSigners != null)
                {
                    foreach (var signer in verifiedSigners)
                    {
                        if (roles[i] == signer)
                        {
                            count++;
                            matched = true;
                            break;
                        }
                    }
                }

                // 2. If not matched explicitly, check if a native Neo witness is attached
                // This allows a Relayer or a secondary Admin using a Neo wallet to attach their native
                // signature to the transaction wrapper, securely aggregating N3 and EVM signatures 
                // in the same execution pass to meet thresholds > 1.
                if (!matched && Runtime.CheckWitness(roles[i]))
                {
                    count++;
                }
            }
            return count >= threshold;
        }
    }
}
