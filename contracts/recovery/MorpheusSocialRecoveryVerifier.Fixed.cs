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
    [ManifestExtra("Author", "R3E Network")]
    [ManifestExtra("Description", "Morpheus NeoDID-powered social recovery verifier for Neo Abstract Account")]
    [ManifestExtra("Version", "1.0.0")]
    [ContractPermission("*", "*")]
    public class MorpheusSocialRecoveryVerifier : Framework.SmartContract
    {
        private const byte PREFIX_OWNER = 0x01;
        private const byte PREFIX_AA_CONTRACT = 0x02;
        private const byte PREFIX_ACCOUNT_ADDRESS = 0x03;
        private const byte PREFIX_NETWORK = 0x04;
        private const byte PREFIX_ACCOUNT_ID_TEXT = 0x05;
        private const byte PREFIX_THRESHOLD = 0x06;
        private const byte PREFIX_TIMELOCK = 0x07;
        private const byte PREFIX_MORPHEUS_VERIFIER = 0x08;
        private const byte PREFIX_RECOVERY_NONCE = 0x09;
        private const byte PREFIX_FACTORS = 0x0A;
        private const byte PREFIX_USED_ACTION = 0x0B;
        private const byte PREFIX_APPROVAL = 0x0C;
        private const byte PREFIX_MORPHEUS_ORACLE = 0x0D;
        private const byte PREFIX_PENDING = 0x0E;
        private const byte PREFIX_ORACLE_REQUEST = 0x0F;
        private const byte PREFIX_SESSION_NONCE = 0x10;
        private const byte PREFIX_ACTIVE_SESSION = 0x11;
        private const byte PREFIX_ORACLE_ACTION_REQUEST = 0x12;
        private const byte PREFIX_PENDING_NEW_OWNER = 0x13;
        private const byte PREFIX_PENDING_NONCE = 0x14;
        private const byte PREFIX_PENDING_APPROVED = 0x15;
        private const byte PREFIX_PENDING_INITIATED = 0x16;
        private const byte PREFIX_PENDING_EXECUTABLE = 0x17;
        private const byte PREFIX_PENDING_ACTIVE = 0x18;

        private const int MAX_TEXT_LENGTH = 255;
        private const int MAX_ENCRYPTED_PARAMS_LENGTH = 4096;
        private const int MAX_FACTORS = 16;
        private const int FIXED_HASH_LENGTH = 32;
        private const int FIXED_SIGNATURE_LENGTH = 64;
        private const int COMPACT_TICKET_VERSION = 3;
        private const int COMPACT_ACTION_VERSION = 3;

        // ASCII("neodid-recovery-v1")
        private static readonly byte[] RECOVERY_DOMAIN = new byte[]
        {
            110, 101, 111, 100, 105, 100, 45, 114, 101, 99, 111, 118, 101, 114, 121, 45, 118, 49
        };
        private static readonly byte[] ACTION_DOMAIN = new byte[]
        {
            110, 101, 111, 100, 105, 100, 45, 97, 99, 116, 105, 111, 110, 45, 118, 49
        };

        public class PendingRecovery
        {
            public UInt160 NewOwner = UInt160.Zero;
            public BigInteger RecoveryNonce;
            public BigInteger ApprovedCount;
            public ulong InitiatedAt;
            public ulong ExecutableAt;
            public bool Active;
        }

        public class OracleRecoveryRequest
        {
            public ByteString AccountId = (ByteString)"";
            public UInt160 NewOwner = UInt160.Zero;
            public string RecoveryNonceText = string.Empty;
            public string ExpiresAtText = string.Empty;
            public string ActionId = string.Empty;
        }

        public class OracleActionRequest
        {
            public ByteString AccountId = (ByteString)"";
            public UInt160 Executor = UInt160.Zero;
            public string ActionId = string.Empty;
            public ulong ExpiresAt;
        }

        public class ActiveSession
        {
            public UInt160 Executor = UInt160.Zero;
            public string ActionId = string.Empty;
            public ByteString ActionNullifier = (ByteString)"";
            public ulong ExpiresAt;
            public bool Active;
        }

        private class CompactRecoveryTicket
        {
            public ByteString MasterNullifier = (ByteString)"";
            public ByteString ActionNullifier = (ByteString)"";
            public ByteString Signature = (ByteString)"";
        }

        private class CompactActionTicket
        {
            public ByteString ActionNullifier = (ByteString)"";
            public ByteString Signature = (ByteString)"";
        }

        public delegate void RecoverySetupHandler(ByteString accountId, UInt160 owner, BigInteger threshold, ulong timelock, int factorCount);
        public delegate void RecoveryConfigUpdatedHandler(ByteString accountId, BigInteger threshold, ulong timelock, int factorCount);
        public delegate void RecoveryTicketAcceptedHandler(ByteString accountId, UInt160 newOwner, ByteString masterNullifier, ByteString actionNullifier, BigInteger approvedCount);
        public delegate void RecoveryReadyHandler(ByteString accountId, UInt160 newOwner, BigInteger recoveryNonce, ulong executableAt);
        public delegate void RecoveryCancelledHandler(ByteString accountId, BigInteger recoveryNonce);
        public delegate void RecoveryFinalizedHandler(ByteString accountId, UInt160 oldOwner, UInt160 newOwner, BigInteger nextRecoveryNonce);
        public delegate void ActionSessionRequestedHandler(ByteString accountId, UInt160 executor, string actionId, ulong expiresAt, BigInteger requestId);
        public delegate void ActionSessionActivatedHandler(ByteString accountId, UInt160 executor, string actionId, ByteString actionNullifier, ulong expiresAt);
        public delegate void ActionSessionRevokedHandler(ByteString accountId, UInt160 executor, string actionId);

        [DisplayName("RecoverySetup")]
        public static event RecoverySetupHandler OnRecoverySetup = default!;

        [DisplayName("RecoveryConfigUpdated")]
        public static event RecoveryConfigUpdatedHandler OnRecoveryConfigUpdated = default!;

        [DisplayName("RecoveryTicketAccepted")]
        public static event RecoveryTicketAcceptedHandler OnRecoveryTicketAccepted = default!;

        [DisplayName("RecoveryReady")]
        public static event RecoveryReadyHandler OnRecoveryReady = default!;

        [DisplayName("RecoveryCancelled")]
        public static event RecoveryCancelledHandler OnRecoveryCancelled = default!;

        [DisplayName("RecoveryFinalized")]
        public static event RecoveryFinalizedHandler OnRecoveryFinalized = default!;

        [DisplayName("ActionSessionRequested")]
        public static event ActionSessionRequestedHandler OnActionSessionRequested = default!;

        [DisplayName("ActionSessionActivated")]
        public static event ActionSessionActivatedHandler OnActionSessionActivated = default!;

        [DisplayName("ActionSessionRevoked")]
        public static event ActionSessionRevokedHandler OnActionSessionRevoked = default!;

        [Safe]
        public static string Version() => "1.0.0";

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

        public static void SubmitRecoveryTicket(
            ByteString accountId,
            UInt160 newOwner,
            string recoveryNonceText,
            string expiresAtText,
            string actionId,
            ByteString masterNullifier,
            ByteString actionNullifier,
            ByteString verificationSignature)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(newOwner, "newOwner");
            ValidateShortText(recoveryNonceText, "recoveryNonce");
            ValidateShortText(expiresAtText, "expiresAt");
            ValidateShortText(actionId, "actionId");
            ValidateFixedHash(masterNullifier, "masterNullifier");
            ValidateFixedHash(actionNullifier, "actionNullifier");
            ValidateSignature(verificationSignature);

            SubmitRecoveryTicketInternal(
                accountId,
                newOwner,
                recoveryNonceText,
                expiresAtText,
                actionId,
                masterNullifier,
                actionNullifier,
                verificationSignature);
        }

        public static void SubmitActionTicket(
            ByteString accountId,
            UInt160 executor,
            string actionId,
            ulong expiresAt,
            ByteString actionNullifier,
            ByteString verificationSignature)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(executor, "executor");
            ValidateShortText(actionId, "actionId");
            ValidateFixedHash(actionNullifier, "actionNullifier");
            ValidateSignature(verificationSignature);
            ExecutionEngine.Assert(expiresAt > Runtime.Time, "Session already expired");
            ExecutionEngine.Assert(Runtime.CheckWitness(executor), "Executor witness required");

            ActivateActionSessionInternal(accountId, executor, actionId, expiresAt, actionNullifier, verificationSignature);
        }

        public static void DepositOracleCredits(ByteString accountId, BigInteger amount)
        {
            ValidateAccountId(accountId, "accountId");
            UInt160 oracle = GetMorpheusOracle(accountId);
            ExecutionEngine.Assert(oracle != UInt160.Zero, "Morpheus oracle not configured");
            ExecutionEngine.Assert(amount > 0, "invalid amount");
            ExecutionEngine.Assert(
                GAS.Transfer(Runtime.ExecutingScriptHash, oracle, amount, null),
                "gas transfer failed");
        }

        public static void OnNEP17Payment(UInt160 from, BigInteger amount, object data)
        {
            ExecutionEngine.Assert(Runtime.CallingScriptHash == GAS.Hash, "only GAS accepted");
            ExecutionEngine.Assert(amount >= 0, "invalid amount");
        }

        public static void OnOracleResult(BigInteger requestId, string requestType, bool success, ByteString result, string error)
        {
            if (requestType == "neodid_recovery_ticket")
            {
                OracleRecoveryRequest context = GetOracleRecoveryRequest(requestId);
                ExecutionEngine.Assert(context.AccountId != null && context.AccountId.Length > 0, "Unknown recovery oracle request");
                ExecutionEngine.Assert(Runtime.CallingScriptHash == GetMorpheusOracle(context.AccountId), "Unauthorized oracle");

                DeleteOracleRecoveryRequest(requestId);
                ExecutionEngine.Assert(success, error == null || error == string.Empty ? "Recovery oracle request failed" : error);

                CompactRecoveryTicket ticket = DecodeCompactRecoveryTicket(result);

                SubmitRecoveryTicketInternal(
                    context.AccountId,
                    context.NewOwner,
                    context.RecoveryNonceText,
                    context.ExpiresAtText,
                    context.ActionId,
                    ticket.MasterNullifier,
                    ticket.ActionNullifier,
                    ticket.Signature);
                return;
            }

            if (requestType == "neodid_action_ticket")
            {
                OracleActionRequest context = GetOracleActionRequest(requestId);
                ExecutionEngine.Assert(context.AccountId != null && context.AccountId.Length > 0, "Unknown action oracle request");
                ExecutionEngine.Assert(Runtime.CallingScriptHash == GetMorpheusOracle(context.AccountId), "Unauthorized oracle");

                DeleteOracleActionRequest(requestId);
                ExecutionEngine.Assert(success, error == null || error == string.Empty ? "Action oracle request failed" : error);

                CompactActionTicket ticket = DecodeCompactActionTicket(result);

                ActivateActionSessionInternal(
                    context.AccountId,
                    context.Executor,
                    context.ActionId,
                    context.ExpiresAt,
                    ticket.ActionNullifier,
                    ticket.Signature);
                return;
            }

            ExecutionEngine.Assert(false, "Unexpected request type");
        }

        private static void SubmitRecoveryTicketInternal(
            ByteString accountId,
            UInt160 newOwner,
            string recoveryNonceText,
            string expiresAtText,
            string actionId,
            ByteString masterNullifier,
            ByteString actionNullifier,
            ByteString verificationSignature)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(newOwner, "newOwner");
            ValidateShortText(recoveryNonceText, "recoveryNonce");
            ValidateShortText(expiresAtText, "expiresAt");
            ValidateShortText(actionId, "actionId");
            ValidateFixedHash(masterNullifier, "masterNullifier");
            ValidateFixedHash(actionNullifier, "actionNullifier");
            ValidateSignature(verificationSignature);

            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId)) != null, "Recovery not setup");
            ExecutionEngine.Assert(IsAllowedMasterNullifier(accountId, masterNullifier), "Unknown recovery factor");
            ExecutionEngine.Assert(!IsActionNullifierUsed(accountId, actionNullifier), "Action nullifier already used");

            BigInteger currentNonce = GetRecoveryNonce(accountId);
            BigInteger ticketNonce = ParsePositiveDecimal(recoveryNonceText, "recoveryNonce");
            ExecutionEngine.Assert(ticketNonce == currentNonce, "Invalid recovery nonce");

            BigInteger expiresAt = ParsePositiveDecimal(expiresAtText, "expiresAt");
            ExecutionEngine.Assert(expiresAt >= Runtime.Time, "Recovery ticket expired");
            ExecutionEngine.Assert(!HasApprovedFactor(accountId, currentNonce, masterNullifier), "Recovery factor already approved");

            PendingRecovery pending = GetPendingRecovery(accountId);
            if (pending.Active)
            {
                ExecutionEngine.Assert(pending.RecoveryNonce == currentNonce, "Unexpected pending recovery nonce");
                ExecutionEngine.Assert(pending.NewOwner == newOwner, "Pending recovery targets a different owner");
                ExecutionEngine.Assert(pending.ExecutableAt == 0, "Recovery already ready for execution");
            }
            else
            {
                pending = new PendingRecovery
                {
                    NewOwner = newOwner,
                    RecoveryNonce = currentNonce,
                    ApprovedCount = 0,
                    InitiatedAt = Runtime.Time,
                    ExecutableAt = 0,
                    Active = true
                };
            }

            ByteString digest = ComputeRecoveryDigest(
                GetNetwork(accountId),
                GetAAContract(accountId),
                GetAccountAddress(accountId),
                GetAccountIdText(accountId),
                newOwner,
                recoveryNonceText,
                expiresAtText,
                actionId,
                masterNullifier,
                actionNullifier);

            bool validSignature = CryptoLib.VerifyWithECDsa(
                digest,
                GetMorpheusVerifier(accountId),
                verificationSignature,
                NamedCurveHash.secp256r1SHA256);
            ExecutionEngine.Assert(validSignature, "Invalid Morpheus recovery signature");

            MarkFactorApproved(accountId, currentNonce, masterNullifier);
            MarkActionNullifierUsed(accountId, actionNullifier);
            pending.ApprovedCount += 1;

            BigInteger threshold = GetThreshold(accountId);
            if (pending.ApprovedCount >= threshold && pending.ExecutableAt == 0)
            {
                pending.ExecutableAt = (ulong)(Runtime.Time + GetTimelock(accountId));
                OnRecoveryReady(accountId, pending.NewOwner, pending.RecoveryNonce, pending.ExecutableAt);
            }

            SavePendingRecovery(accountId, pending);
            OnRecoveryTicketAccepted(accountId, pending.NewOwner, masterNullifier, actionNullifier, pending.ApprovedCount);
        }

        public static void FinalizeRecovery(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");

            PendingRecovery pending = GetPendingRecovery(accountId);
            ExecutionEngine.Assert(pending.Active, "No pending recovery");
            ExecutionEngine.Assert(pending.ExecutableAt > 0, "Recovery threshold not met");
            ExecutionEngine.Assert(Runtime.Time >= pending.ExecutableAt, "Recovery timelock not expired");

            UInt160 oldOwner = GetOwner(accountId);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), pending.NewOwner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_RECOVERY_NONCE, accountId), pending.RecoveryNonce + 1);
            DeletePendingRecovery(accountId);
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_ACTIVE_SESSION, accountId));

            OnRecoveryFinalized(accountId, oldOwner, pending.NewOwner, pending.RecoveryNonce + 1);
        }

        public static void CancelRecovery(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            AssertOwner(accountId);

            PendingRecovery pending = GetPendingRecovery(accountId);
            ExecutionEngine.Assert(pending.Active, "No pending recovery");

            DeletePendingRecovery(accountId);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_RECOVERY_NONCE, accountId), pending.RecoveryNonce + 1);

            OnRecoveryCancelled(accountId, pending.RecoveryNonce);
        }

        public static void RevokeActionSession(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            AssertOwner(accountId);

            ActiveSession session = GetActiveSession(accountId);
            ExecutionEngine.Assert(session.Active, "No active session");
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_ACTIVE_SESSION, accountId));
            OnActionSessionRevoked(accountId, session.Executor, session.ActionId);
        }

        public static bool VerifyExecution(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            UInt160 owner = GetOwner(accountId);
            if (owner != UInt160.Zero && Runtime.CheckWitness(owner)) return true;

            ActiveSession session = GetActiveSession(accountId);
            if (!session.Active || session.ExpiresAt < Runtime.Time) return false;
            return session.Executor != UInt160.Zero && Runtime.CheckWitness(session.Executor);
        }

        public static bool VerifyExecutionMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            ValidateAccountId(accountId, "accountId");
            if (signerHashes == null || signerHashes.Length == 0) return false;

            UInt160 owner = GetOwner(accountId);
            for (int i = 0; i < signerHashes.Length; i++)
            {
                if (owner != UInt160.Zero && signerHashes[i] == owner) return true;
            }

            ActiveSession session = GetActiveSession(accountId);
            if (!session.Active || session.ExpiresAt < Runtime.Time) return false;
            for (int i = 0; i < signerHashes.Length; i++)
            {
                if (signerHashes[i] == session.Executor) return true;
            }
            return false;
        }

        public static bool VerifyAdmin(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            UInt160 owner = GetOwner(accountId);
            return owner != UInt160.Zero && Runtime.CheckWitness(owner);
        }

        public static bool VerifyAdminMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            ValidateAccountId(accountId, "accountId");
            if (signerHashes == null || signerHashes.Length == 0) return false;

            UInt160 owner = GetOwner(accountId);
            for (int i = 0; i < signerHashes.Length; i++)
            {
                if (owner != UInt160.Zero && signerHashes[i] == owner) return true;
            }
            return false;
        }

        public static bool Verify(ByteString accountId)
        {
            return VerifyExecution(accountId);
        }

        public static bool VerifyMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            return VerifyExecutionMetaTx(accountId, signerHashes);
        }

        [Safe]
        public static UInt160 GetOwner(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        [Safe]
        public static UInt160 GetAAContract(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_AA_CONTRACT, accountId));
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        [Safe]
        public static UInt160 GetAccountAddress(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_ACCOUNT_ADDRESS, accountId));
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        [Safe]
        public static UInt160 GetMorpheusOracle(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_MORPHEUS_ORACLE, accountId));
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        [Safe]
        public static string GetNetwork(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_NETWORK, accountId));
            return data == null ? string.Empty : (string)data;
        }

        [Safe]
        public static string GetAccountIdText(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_ACCOUNT_ID_TEXT, accountId));
            return data == null ? string.Empty : (string)data;
        }

        [Safe]
        public static BigInteger GetThreshold(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId));
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static ulong GetTimelock(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId));
            return data == null ? 0 : (ulong)(BigInteger)data;
        }

        [Safe]
        public static BigInteger GetRecoveryNonce(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY_NONCE, accountId));
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetSessionNonce(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_SESSION_NONCE, accountId));
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static ECPoint GetMorpheusVerifier(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_MORPHEUS_VERIFIER, accountId));
            return data == null ? null! : (ECPoint)(byte[])data;
        }

        [Safe]
        public static ByteString[] GetMasterNullifiers(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_FACTORS, accountId));
            if (data == null) return new ByteString[] { };
            return (ByteString[])StdLib.Deserialize(data);
        }

        [Safe]
        public static bool IsAllowedMasterNullifier(ByteString accountId, ByteString masterNullifier)
        {
            if (masterNullifier == null || masterNullifier.Length != FIXED_HASH_LENGTH) return false;
            ByteString[] factors = GetMasterNullifiers(accountId);
            for (int i = 0; i < factors.Length; i++)
            {
                if (factors[i].Equals(masterNullifier)) return true;
            }
            return false;
        }

        [Safe]
        public static bool IsActionNullifierUsed(ByteString accountId, ByteString actionNullifier)
        {
            if (actionNullifier == null || actionNullifier.Length != FIXED_HASH_LENGTH) return false;
            return Storage.Get(Storage.CurrentContext, UsedActionKey(accountId, actionNullifier)) != null;
        }

        [Safe]
        public static PendingRecovery GetPendingRecovery(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            ByteString? active = Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_ACTIVE, accountId));
            if (active == null)
            {
                return new PendingRecovery
                {
                    NewOwner = UInt160.Zero,
                    RecoveryNonce = -1,
                    ApprovedCount = 0,
                    InitiatedAt = 0,
                    ExecutableAt = 0,
                    Active = false
                };
            }
            return new PendingRecovery
            {
                NewOwner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_NEW_OWNER, accountId)),
                RecoveryNonce = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_NONCE, accountId)),
                ApprovedCount = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_APPROVED, accountId)),
                InitiatedAt = (ulong)(BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_INITIATED, accountId)),
                ExecutableAt = (ulong)(BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_EXECUTABLE, accountId)),
                Active = (BigInteger)active != 0
            };
        }

        [Safe]
        public static ActiveSession GetActiveSession(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_ACTIVE_SESSION, accountId));
            if (data == null)
            {
                return new ActiveSession
                {
                    Executor = UInt160.Zero,
                    ActionId = string.Empty,
                    ActionNullifier = (ByteString)"",
                    ExpiresAt = 0,
                    Active = false
                };
            }
            return (ActiveSession)StdLib.Deserialize(data);
        }

        private static void StoreConfig(
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
            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), owner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_AA_CONTRACT, accountId), aaContract);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_ACCOUNT_ADDRESS, accountId), accountAddress);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_ORACLE, accountId), morpheusOracle);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NETWORK, accountId), network);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_ACCOUNT_ID_TEXT, accountId), accountIdText);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_FACTORS, accountId), StdLib.Serialize(masterNullifiers));
            Storage.Put(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId), threshold);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId), (BigInteger)timelock);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_VERIFIER, accountId), (byte[])morpheusVerifier);
        }

        private static void SavePendingRecovery(ByteString accountId, PendingRecovery pending)
        {
            Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_NEW_OWNER, accountId), pending.NewOwner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_NONCE, accountId), pending.RecoveryNonce);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_APPROVED, accountId), pending.ApprovedCount);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_INITIATED, accountId), (BigInteger)pending.InitiatedAt);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_EXECUTABLE, accountId), (BigInteger)pending.ExecutableAt);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_ACTIVE, accountId), pending.Active ? 1 : 0);
        }

        private static void DeletePendingRecovery(ByteString accountId)
        {
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_NEW_OWNER, accountId));
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_NONCE, accountId));
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_APPROVED, accountId));
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_INITIATED, accountId));
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_EXECUTABLE, accountId));
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_ACTIVE, accountId));
        }

        private static void SaveActiveSession(ByteString accountId, ActiveSession session)
        {
            Storage.Put(Storage.CurrentContext, Key(PREFIX_ACTIVE_SESSION, accountId), StdLib.Serialize(session));
        }

        private static void SaveOracleRecoveryRequest(BigInteger requestId, OracleRecoveryRequest request)
        {
            Storage.Put(Storage.CurrentContext, OracleRequestKey(requestId), StdLib.Serialize(request));
        }

        private static OracleRecoveryRequest GetOracleRecoveryRequest(BigInteger requestId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, OracleRequestKey(requestId));
            if (data == null) return new OracleRecoveryRequest();
            return (OracleRecoveryRequest)StdLib.Deserialize(data);
        }

        private static void DeleteOracleRecoveryRequest(BigInteger requestId)
        {
            Storage.Delete(Storage.CurrentContext, OracleRequestKey(requestId));
        }

        private static void SaveOracleActionRequest(BigInteger requestId, OracleActionRequest request)
        {
            Storage.Put(Storage.CurrentContext, OracleActionRequestKey(requestId), StdLib.Serialize(request));
        }

        private static OracleActionRequest GetOracleActionRequest(BigInteger requestId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, OracleActionRequestKey(requestId));
            if (data == null) return new OracleActionRequest();
            return (OracleActionRequest)StdLib.Deserialize(data);
        }

        private static void DeleteOracleActionRequest(BigInteger requestId)
        {
            Storage.Delete(Storage.CurrentContext, OracleActionRequestKey(requestId));
        }

        private static void MarkFactorApproved(ByteString accountId, BigInteger recoveryNonce, ByteString masterNullifier)
        {
            Storage.Put(Storage.CurrentContext, ApprovalKey(accountId, recoveryNonce, masterNullifier), 1);
        }

        private static bool HasApprovedFactor(ByteString accountId, BigInteger recoveryNonce, ByteString masterNullifier)
        {
            return Storage.Get(Storage.CurrentContext, ApprovalKey(accountId, recoveryNonce, masterNullifier)) != null;
        }

        private static void MarkActionNullifierUsed(ByteString accountId, ByteString actionNullifier)
        {
            Storage.Put(Storage.CurrentContext, UsedActionKey(accountId, actionNullifier), 1);
        }

        private static void ActivateActionSessionInternal(
            ByteString accountId,
            UInt160 executor,
            string actionId,
            ulong expiresAt,
            ByteString actionNullifier,
            ByteString verificationSignature)
        {
            ValidateAddress(executor, "executor");
            ValidateShortText(actionId, "actionId");
            ValidateFixedHash(actionNullifier, "actionNullifier");
            ValidateSignature(verificationSignature);
            ExecutionEngine.Assert(expiresAt > Runtime.Time, "Session already expired");
            ExecutionEngine.Assert(!IsActionNullifierUsed(accountId, actionNullifier), "Action nullifier already used");

            ByteString digest = ComputeActionDigest(executor, actionId, actionNullifier);
            bool validSignature = CryptoLib.VerifyWithECDsa(
                digest,
                GetMorpheusVerifier(accountId),
                verificationSignature,
                NamedCurveHash.secp256r1SHA256);
            ExecutionEngine.Assert(validSignature, "Invalid Morpheus action signature");

            MarkActionNullifierUsed(accountId, actionNullifier);
            SaveActiveSession(accountId, new ActiveSession
            {
                Executor = executor,
                ActionId = actionId,
                ActionNullifier = actionNullifier,
                ExpiresAt = expiresAt,
                Active = true
            });
            Storage.Put(Storage.CurrentContext, Key(PREFIX_SESSION_NONCE, accountId), GetSessionNonce(accountId) + 1);
            OnActionSessionActivated(accountId, executor, actionId, actionNullifier, expiresAt);
        }

        private static CompactRecoveryTicket DecodeCompactRecoveryTicket(ByteString payload)
        {
            string[] segments = SplitCompactPayload(payload, 4);
            ExecutionEngine.Assert(segments[0] == COMPACT_TICKET_VERSION.ToString(), "Unsupported recovery ticket version");

            ByteString masterNullifier = DecodeBase64Field(segments[1], FIXED_HASH_LENGTH, "masterNullifier");
            ByteString actionNullifier = DecodeBase64Field(segments[2], FIXED_HASH_LENGTH, "actionNullifier");
            ByteString signature = DecodeBase64Field(segments[3], FIXED_SIGNATURE_LENGTH, "signature");

            return new CompactRecoveryTicket
            {
                MasterNullifier = masterNullifier,
                ActionNullifier = actionNullifier,
                Signature = signature
            };
        }

        private static CompactActionTicket DecodeCompactActionTicket(ByteString payload)
        {
            string[] segments = SplitCompactPayload(payload, 3);
            ExecutionEngine.Assert(segments[0] == COMPACT_ACTION_VERSION.ToString(), "Unsupported action ticket version");

            ByteString actionNullifier = DecodeBase64Field(segments[1], FIXED_HASH_LENGTH, "actionNullifier");
            ByteString signature = DecodeBase64Field(segments[2], FIXED_SIGNATURE_LENGTH, "signature");

            return new CompactActionTicket
            {
                ActionNullifier = actionNullifier,
                Signature = signature
            };
        }

        private static ByteString DecodeBase64Field(string value, int expectedLength, string fieldName)
        {
            ByteString decoded = StdLib.Base64Decode(value);
            ExecutionEngine.Assert(decoded != null && decoded.Length == expectedLength, fieldName + " invalid length");
            return decoded;
        }

        private static string[] SplitCompactPayload(ByteString payload, int expectedSegments)
        {
            byte[] bytes = (byte[])payload;
            ExecutionEngine.Assert(bytes != null && bytes.Length > 0, "Compact payload required");
            string[] segments = new string[expectedSegments];
            int segmentIndex = 0;
            int start = 0;

            for (int index = 0; index <= bytes.Length; index++)
            {
                bool atSeparator = index < bytes.Length && bytes[index] == (byte)'|';
                bool atEnd = index == bytes.Length;
                if (!atSeparator && !atEnd) continue;

                ExecutionEngine.Assert(segmentIndex < expectedSegments, "Too many compact payload segments");
                byte[] output = new byte[index - start];
                for (int i = 0; i < output.Length; i++)
                {
                    output[i] = bytes[start + i];
                }
                segments[segmentIndex] = (string)(ByteString)output;
                segmentIndex += 1;
                start = index + 1;
            }

            ExecutionEngine.Assert(segmentIndex == expectedSegments, "Invalid compact payload segment count");
            return segments;
        }

        private static byte[] ReadFixedBytes(byte[] bytes, ref int offset, int length)
        {
            ExecutionEngine.Assert(offset + length <= bytes.Length, "Compact ticket overflow");
            byte[] output = new byte[length];
            for (int i = 0; i < length; i++)
            {
                output[i] = bytes[offset + i];
            }
            offset += length;
            return output;
        }

        private static string ReadLengthPrefixedText(byte[] bytes, ref int offset, string fieldName)
        {
            ExecutionEngine.Assert(offset < bytes.Length, "Compact ticket overflow");
            int length = bytes[offset];
            offset += 1;
            ExecutionEngine.Assert(offset + length <= bytes.Length, fieldName + " overflow");
            byte[] output = new byte[length];
            for (int i = 0; i < length; i++)
            {
                output[i] = bytes[offset + i];
            }
            offset += length;
            return (string)(ByteString)output;
        }

        private static ByteString ComputeRecoveryDigest(
            string network,
            UInt160 aaContract,
            UInt160 accountAddress,
            string accountIdText,
            UInt160 newOwner,
            string recoveryNonceText,
            string expiresAtText,
            string actionId,
            ByteString masterNullifier,
            ByteString actionNullifier)
        {
            ByteString payload = (ByteString)RECOVERY_DOMAIN;
            payload = Helper.Concat(payload, EncodeSegment(network));
            payload = Helper.Concat(payload, (ByteString)(byte[])aaContract);
            payload = Helper.Concat(payload, (ByteString)(byte[])Runtime.ExecutingScriptHash);
            payload = Helper.Concat(payload, (ByteString)(byte[])accountAddress);
            payload = Helper.Concat(payload, EncodeSegment(accountIdText));
            payload = Helper.Concat(payload, (ByteString)(byte[])newOwner);
            payload = Helper.Concat(payload, EncodeSegment(recoveryNonceText));
            payload = Helper.Concat(payload, EncodeSegment(expiresAtText));
            payload = Helper.Concat(payload, EncodeSegment(actionId));
            payload = Helper.Concat(payload, masterNullifier);
            payload = Helper.Concat(payload, actionNullifier);
            return CryptoLib.Sha256(payload);
        }

        private static ByteString ComputeActionDigest(UInt160 executor, string actionId, ByteString actionNullifier)
        {
            ByteString payload = (ByteString)ACTION_DOMAIN;
            payload = Helper.Concat(payload, (ByteString)(byte[])executor);
            payload = Helper.Concat(payload, EncodeSegment(actionId));
            payload = Helper.Concat(payload, actionNullifier);
            return CryptoLib.Sha256(payload);
        }

        private static string BuildActionId(ByteString accountId, UInt160 executor, BigInteger sessionNonce, ulong expiresAt)
        {
            ByteString material = (ByteString)GetNetwork(accountId);
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, (ByteString)(byte[])GetAAContract(accountId));
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, accountId);
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, (ByteString)(byte[])executor);
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, (ByteString)sessionNonce.ToString());
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, (ByteString)expiresAt.ToString());
            return "aa_proxy:" + BytesToHex(CryptoLib.Sha256(material));
        }

        private static string BuildRecoveryActionId(ByteString accountId, UInt160 newOwner, string recoveryNonceText)
        {
            ByteString material = (ByteString)GetNetwork(accountId);
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, (ByteString)(byte[])GetAAContract(accountId));
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, accountId);
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, (ByteString)(byte[])newOwner);
            material = Helper.Concat(material, (ByteString)new byte[] { 0x1f });
            material = Helper.Concat(material, (ByteString)recoveryNonceText);
            return "aa_recovery:" + BytesToHex(CryptoLib.Sha256(material));
        }

        private static ByteString EncodeSegment(string value)
        {
            ValidateShortText(value, "segment");
            ExecutionEngine.Assert(value.Length <= 255, "segment too long");
            ByteString body = (ByteString)value;
            return Helper.Concat((ByteString)new byte[] { (byte)value.Length }, body);
        }

        private static BigInteger ParsePositiveDecimal(string value, string fieldName)
        {
            ValidateShortText(value, fieldName);
            BigInteger result = 0;
            for (int i = 0; i < value.Length; i++)
            {
                char current = value[i];
                ExecutionEngine.Assert(current >= '0' && current <= '9', fieldName + " must be decimal");
                result = (result * 10) + (current - '0');
            }
            return result;
        }

        private static byte[] Key(byte prefix, ByteString accountId) =>
            Helper.Concat(new byte[] { prefix }, accountId);

        private static string HashToHex(UInt160 value)
        {
            return "0x" + BytesToHex((ByteString)(byte[])value);
        }

        private static string BytesToHex(ByteString value)
        {
            byte[] data = (byte[])value;
            string hex = "";
            for (int i = 0; i < data.Length; i++)
            {
                hex += NibbleToHex((byte)(data[i] >> 4));
                hex += NibbleToHex((byte)(data[i] & 0x0F));
            }
            return hex;
        }

        private static string NibbleToHex(byte value)
        {
            if (value < 10) return ((char)('0' + value)).ToString();
            return ((char)('a' + (value - 10))).ToString();
        }

        private static byte[] UsedActionKey(ByteString accountId, ByteString actionNullifier)
        {
            byte[] key = Key(PREFIX_USED_ACTION, accountId);
            return Helper.Concat(key, actionNullifier);
        }

        private static byte[] ApprovalKey(ByteString accountId, BigInteger recoveryNonce, ByteString masterNullifier)
        {
            byte[] key = Key(PREFIX_APPROVAL, accountId);
            key = Helper.Concat(key, recoveryNonce.ToByteArray());
            return Helper.Concat(key, masterNullifier);
        }

        private static byte[] OracleRequestKey(BigInteger requestId)
        {
            return Helper.Concat(new byte[] { PREFIX_ORACLE_REQUEST }, requestId.ToByteArray());
        }

        private static byte[] OracleActionRequestKey(BigInteger requestId)
        {
            return Helper.Concat(new byte[] { PREFIX_ORACLE_ACTION_REQUEST }, requestId.ToByteArray());
        }

        private static void ValidateAccountId(ByteString accountId, string name)
        {
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0, name + " is required");
        }

        private static void ValidateAddress(UInt160 address, string name)
        {
            ExecutionEngine.Assert(address != null && address.IsValid && address != UInt160.Zero, name + " is invalid");
        }

        private static void ValidateShortText(string value, string name)
        {
            ExecutionEngine.Assert(value != null && value.Length > 0 && value.Length <= MAX_TEXT_LENGTH, name + " is invalid");
        }

        private static void ValidateLongText(string value, int maxLength, string name)
        {
            ExecutionEngine.Assert(value != null && value.Length > 0 && value.Length <= maxLength, name + " is invalid");
        }

        private static void ValidateVerifier(ECPoint morpheusVerifier)
        {
            ExecutionEngine.Assert(morpheusVerifier != null && morpheusVerifier.IsValid, "invalid Morpheus verifier");
        }

        private static void ValidateMasterNullifiers(ByteString[] masterNullifiers, BigInteger threshold)
        {
            ByteString[] factors = masterNullifiers ?? new ByteString[] { };
            ExecutionEngine.Assert(factors.Length > 0, "master nullifiers required");
            ExecutionEngine.Assert(factors.Length <= MAX_FACTORS, "too many recovery factors");
            ExecutionEngine.Assert(threshold > 0 && threshold <= factors.Length, "invalid threshold");
            for (int i = 0; i < factors.Length; i++)
            {
                ValidateFixedHash(factors[i], "invalid master nullifier");
                for (int j = i + 1; j < factors.Length; j++)
                {
                    ExecutionEngine.Assert(!factors[i].Equals(factors[j]), "duplicate master nullifier");
                }
            }
        }

        private static void ValidateFixedHash(ByteString value, string message)
        {
            ExecutionEngine.Assert(value != null && value.Length == FIXED_HASH_LENGTH, message);
        }

        private static void ValidateSignature(ByteString value)
        {
            ExecutionEngine.Assert(value != null && value.Length == FIXED_SIGNATURE_LENGTH, "invalid verification signature");
        }

        private static void AssertOwner(ByteString accountId)
        {
            UInt160 owner = GetOwner(accountId);
            ExecutionEngine.Assert(owner != UInt160.Zero && Runtime.CheckWitness(owner), "Not owner");
        }
    }
}
