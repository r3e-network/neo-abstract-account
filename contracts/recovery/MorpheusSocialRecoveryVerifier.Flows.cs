using System;
using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace Neo.SmartContract.Examples
{
    public partial class SocialRecoveryVerifier
    {
        // Minimum recovery timelock (milliseconds, matching Runtime.Time units). A zero or tiny
        // timelock lets a met threshold seize the account instantly, leaving the owner no window
        // to cancel a malicious recovery. 1 hour = 60 * 60 * 1000 ms.
        private const ulong MIN_TIMELOCK = 3600000;

        public static void SetupRecovery(
            ByteString accountId,
            string accountIdText,
            string network,
            UInt160 owner,
            UInt160 aaContract,
            UInt160 accountAddress,
            UInt160 morpheusOracle,
            ByteString[] masterNullifiers,
            BigInteger threshold,
            ulong timelock,
            ECPoint morpheusVerifier)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateShortText(accountIdText, "accountIdText");
            ValidateShortText(network, "network");
            ValidateAddress(owner, "owner");
            ValidateAddress(aaContract, "aaContract");
            ValidateAddress(accountAddress, "accountAddress");
            ValidateAddress(morpheusOracle, "morpheusOracle");
            ValidateVerifier(morpheusVerifier);
            ValidateMasterNullifiers(masterNullifiers, threshold);
            ExecutionEngine.Assert(timelock >= MIN_TIMELOCK, "Timelock below minimum");

            ExecutionEngine.Assert(Runtime.CheckWitness(owner), "Not owner");
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId)) == null, "Recovery already setup");

            StoreConfig(accountId, accountIdText, network, owner, aaContract, accountAddress, morpheusOracle, masterNullifiers, threshold, timelock, morpheusVerifier);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_RECOVERY_NONCE, accountId), 0);

            OnRecoverySetup(accountId, owner, threshold, timelock, masterNullifiers.Length);
        }

        public static void UpdateRecoveryConfig(
            ByteString accountId,
            UInt160 morpheusOracle,
            ByteString[] masterNullifiers,
            BigInteger threshold,
            ulong timelock,
            ECPoint morpheusVerifier)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(morpheusOracle, "morpheusOracle");
            ValidateVerifier(morpheusVerifier);
            ValidateMasterNullifiers(masterNullifiers, threshold);
            ExecutionEngine.Assert(timelock >= MIN_TIMELOCK, "Timelock below minimum");
            AssertOwner(accountId);
            ExecutionEngine.Assert(!GetPendingRecovery(accountId).Active, "Recovery in progress");

            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_ORACLE, accountId), morpheusOracle);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_FACTORS, accountId), StdLib.Serialize(masterNullifiers));
            Storage.Put(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId), threshold);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId), timelock);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_VERIFIER, accountId), (byte[])morpheusVerifier);

            OnRecoveryConfigUpdated(accountId, threshold, timelock, masterNullifiers.Length);
        }

        public static BigInteger RequestRecoveryTicket(
            ByteString accountId,
            string provider,
            UInt160 newOwner,
            string expiresAtText,
            string encryptedParams)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateShortText(provider, "provider");
            ValidateAddress(newOwner, "newOwner");
            ValidateShortText(expiresAtText, "expiresAt");
            ValidateLongText(encryptedParams, MAX_ENCRYPTED_PARAMS_LENGTH, "encryptedParams");
            ExecutionEngine.Assert(Runtime.CheckWitness(newOwner), "New owner witness required");

            UInt160 oracle = GetMorpheusOracle(accountId);
            ExecutionEngine.Assert(oracle != UInt160.Zero, "Morpheus oracle not configured");

            PendingRecovery pending = GetPendingRecovery(accountId);
            if (pending.Active)
            {
                ExecutionEngine.Assert(pending.RecoveryNonce == GetRecoveryNonce(accountId), "Unexpected recovery nonce");
                ExecutionEngine.Assert(pending.NewOwner == newOwner, "Pending recovery targets a different owner");
            }

            string recoveryNonceText = GetRecoveryNonce(accountId).ToString();
            string actionId = BuildRecoveryActionId(accountId, newOwner, recoveryNonceText);
            string payloadJson =
                "{\"provider\":\"" + provider
                + "\",\"network\":\"" + GetNetwork(accountId)
                + "\",\"aa_contract\":\"" + HashToHex(GetAAContract(accountId))
                + "\",\"verifier_contract\":\"" + HashToHex(Runtime.ExecutingScriptHash)
                + "\",\"account_address\":\"" + HashToHex(GetAccountAddress(accountId))
                + "\",\"account_id\":\"" + GetAccountIdText(accountId)
                + "\",\"new_owner\":\"" + HashToHex(newOwner)
                + "\",\"recovery_nonce\":\"" + recoveryNonceText
                + "\",\"expires_at\":\"" + expiresAtText
                + "\",\"action_id\":\"" + actionId
                + "\",\"encrypted_params\":\"" + encryptedParams
                + "\",\"callback_encoding\":\"neo_n3_recovery_v3\"}";

            BigInteger requestId = (BigInteger)Contract.Call(
                oracle,
                "request",
                CallFlags.All,
                "neodid_recovery_ticket",
                (ByteString)payloadJson,
                Runtime.ExecutingScriptHash,
                "onOracleResult");

            SaveOracleRecoveryRequest(requestId, new OracleRecoveryRequest
            {
                AccountId = accountId,
                NewOwner = newOwner,
                RecoveryNonceText = recoveryNonceText,
                ExpiresAtText = expiresAtText,
                ActionId = actionId
            });

            return requestId;
        }

        public static BigInteger RequestActionSession(
            ByteString accountId,
            string provider,
            UInt160 executor,
            ulong expiresAt,
            string encryptedParams)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateShortText(provider, "provider");
            ValidateAddress(executor, "executor");
            ValidateLongText(encryptedParams, MAX_ENCRYPTED_PARAMS_LENGTH, "encryptedParams");
            ExecutionEngine.Assert(Runtime.CheckWitness(executor), "Executor witness required");
            ExecutionEngine.Assert(expiresAt > Runtime.Time, "Session expiry must be in the future");

            UInt160 oracle = GetMorpheusOracle(accountId);
            ExecutionEngine.Assert(oracle != UInt160.Zero, "Morpheus oracle not configured");

            BigInteger sessionNonce = GetSessionNonce(accountId);
            string actionId = BuildActionId(accountId, executor, sessionNonce, expiresAt);
            string payloadJson =
                "{\"provider\":\"" + provider
                + "\",\"disposable_account\":\"" + HashToHex(executor)
                + "\",\"action_id\":\"" + actionId
                + "\",\"encrypted_params\":\"" + encryptedParams
                + "\",\"callback_encoding\":\"neo_n3_action_v3\"}";

            BigInteger requestId = (BigInteger)Contract.Call(
                oracle,
                "request",
                CallFlags.All,
                "neodid_action_ticket",
                (ByteString)payloadJson,
                Runtime.ExecutingScriptHash,
                "onOracleResult");

            SaveOracleActionRequest(requestId, new OracleActionRequest
            {
                AccountId = accountId,
                Executor = executor,
                ActionId = actionId,
                ExpiresAt = expiresAt
            });

            OnActionSessionRequested(accountId, executor, actionId, expiresAt, requestId);
            return requestId;
        }
    }
}
