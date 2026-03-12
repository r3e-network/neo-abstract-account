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
    [ManifestExtra("Description", "Morpheus NeoDID-powered private action session verifier for Neo Abstract Account")]
    [ManifestExtra("Version", "1.0.0")]
    [ContractPermission("*", "*")]
    public class MorpheusProxySessionVerifier : Framework.SmartContract
    {
        private const byte PREFIX_OWNER = 0x01;
        private const byte PREFIX_AA_CONTRACT = 0x02;
        private const byte PREFIX_ACCOUNT_ADDRESS = 0x03;
        private const byte PREFIX_NETWORK = 0x04;
        private const byte PREFIX_ACCOUNT_ID_TEXT = 0x05;
        private const byte PREFIX_MORPHEUS_VERIFIER = 0x06;
        private const byte PREFIX_MORPHEUS_ORACLE = 0x07;
        private const byte PREFIX_SESSION_NONCE = 0x08;
        private const byte PREFIX_USED_ACTION = 0x09;
        private const byte PREFIX_ACTIVE_SESSION = 0x0A;
        private const byte PREFIX_ORACLE_REQUEST = 0x0B;

        private const int MAX_TEXT_LENGTH = 255;
        private const int MAX_ENCRYPTED_PARAMS_LENGTH = 4096;
        private const int FIXED_HASH_LENGTH = 32;
        private const int FIXED_SIGNATURE_LENGTH = 64;
        private const int COMPACT_ACTION_VERSION = 1;

        // ASCII("neodid-action-v1")
        private static readonly byte[] ACTION_DOMAIN = new byte[]
        {
            110, 101, 111, 100, 105, 100, 45, 97, 99, 116, 105, 111, 110, 45, 118, 49
        };

        public class ActionSession
        {
            public UInt160 Executor = UInt160.Zero;
            public string ActionId = string.Empty;
            public ByteString ActionNullifier = (ByteString)"";
            public ulong ExpiresAt;
            public bool Active;
        }

        public class OracleActionRequest
        {
            public ByteString AccountId = (ByteString)"";
            public UInt160 Executor = UInt160.Zero;
            public string ActionId = string.Empty;
            public ulong ExpiresAt;
        }

        private class CompactActionTicket
        {
            public UInt160 Executor = UInt160.Zero;
            public string ActionId = string.Empty;
            public ByteString ActionNullifier = (ByteString)"";
            public ByteString Signature = (ByteString)"";
        }

        public delegate void ProxySessionSetupHandler(ByteString accountId, UInt160 owner);
        public delegate void ProxySessionRequestedHandler(ByteString accountId, UInt160 executor, string actionId, ulong expiresAt, BigInteger requestId);
        public delegate void ProxySessionActivatedHandler(ByteString accountId, UInt160 executor, string actionId, ByteString actionNullifier, ulong expiresAt);
        public delegate void ProxySessionRevokedHandler(ByteString accountId, UInt160 executor, string actionId);

        [DisplayName("ProxySessionSetup")]
        public static event ProxySessionSetupHandler OnProxySessionSetup = default!;

        [DisplayName("ProxySessionRequested")]
        public static event ProxySessionRequestedHandler OnProxySessionRequested = default!;

        [DisplayName("ProxySessionActivated")]
        public static event ProxySessionActivatedHandler OnProxySessionActivated = default!;

        [DisplayName("ProxySessionRevoked")]
        public static event ProxySessionRevokedHandler OnProxySessionRevoked = default!;

        [Safe]
        public static string Version() => "1.0.0";

        public static void SetupProxySession(
            ByteString accountId,
            string accountIdText,
            string network,
            UInt160 owner,
            UInt160 aaContract,
            UInt160 accountAddress,
            UInt160 morpheusOracle,
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

            ExecutionEngine.Assert(Runtime.CheckWitness(owner), "Not owner");
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId)) == null, "Proxy session already setup");

            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), owner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_AA_CONTRACT, accountId), aaContract);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_ACCOUNT_ADDRESS, accountId), accountAddress);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NETWORK, accountId), network);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_ACCOUNT_ID_TEXT, accountId), accountIdText);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_ORACLE, accountId), morpheusOracle);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_VERIFIER, accountId), (byte[])morpheusVerifier);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_SESSION_NONCE, accountId), 0);

            OnProxySessionSetup(accountId, owner);
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
                + "\",\"callback_encoding\":\"neo_n3_action_v1\"}";

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

            OnProxySessionRequested(accountId, executor, actionId, expiresAt, requestId);
            return requestId;
        }

        public static void UpdateProxySessionConfig(
            ByteString accountId,
            UInt160 morpheusOracle,
            ECPoint morpheusVerifier)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(morpheusOracle, "morpheusOracle");
            ValidateVerifier(morpheusVerifier);
            AssertOwner(accountId);

            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_ORACLE, accountId), morpheusOracle);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_MORPHEUS_VERIFIER, accountId), (byte[])morpheusVerifier);
        }

        public static void SubmitActionTicket(
            ByteString accountId,
            UInt160 executor,
            string actionId,
            ulong expiresAt,
            ByteString actionNullifier,
            ByteString signature)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(executor, "executor");
            ValidateShortText(actionId, "actionId");
            ValidateFixedHash(actionNullifier, "actionNullifier");
            ValidateSignature(signature);
            ExecutionEngine.Assert(expiresAt > Runtime.Time, "Session already expired");
            ExecutionEngine.Assert(Runtime.CheckWitness(executor), "Executor witness required");

            ActivateActionSessionInternal(accountId, executor, actionId, expiresAt, actionNullifier, signature);
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
            OracleActionRequest context = GetOracleActionRequest(requestId);
            ExecutionEngine.Assert(context.AccountId != null && context.AccountId.Length > 0, "Unknown oracle request");
            ExecutionEngine.Assert(Runtime.CallingScriptHash == GetMorpheusOracle(context.AccountId), "Unauthorized oracle");
            ExecutionEngine.Assert(requestType == "neodid_action_ticket", "Unexpected request type");

            DeleteOracleActionRequest(requestId);
            ExecutionEngine.Assert(success, error == null || error == string.Empty ? "Action session oracle request failed" : error);

            CompactActionTicket ticket = DecodeCompactActionTicket(result);
            ExecutionEngine.Assert(ticket.Executor == context.Executor, "Action session executor mismatch");
            ExecutionEngine.Assert(ticket.ActionId == context.ActionId, "Action session action id mismatch");
            ActivateActionSessionInternal(context.AccountId, context.Executor, context.ActionId, context.ExpiresAt, ticket.ActionNullifier, ticket.Signature);
        }

        public static void RevokeActionSession(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            AssertOwner(accountId);

            ActionSession session = GetActiveSession(accountId);
            ExecutionEngine.Assert(session.Active, "No active session");
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_ACTIVE_SESSION, accountId));
            OnProxySessionRevoked(accountId, session.Executor, session.ActionId);
        }

        public static bool VerifyExecution(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            UInt160 owner = GetOwner(accountId);
            if (owner != UInt160.Zero && Runtime.CheckWitness(owner)) return true;

            ActionSession session = GetActiveSession(accountId);
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

            ActionSession session = GetActiveSession(accountId);
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
        public static UInt160 GetMorpheusOracle(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_MORPHEUS_ORACLE, accountId));
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        [Safe]
        public static UInt160 GetAAContract(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_AA_CONTRACT, accountId));
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
        public static ECPoint GetMorpheusVerifier(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_MORPHEUS_VERIFIER, accountId));
            return data == null ? null! : (ECPoint)(byte[])data;
        }

        [Safe]
        public static BigInteger GetSessionNonce(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_SESSION_NONCE, accountId));
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static ActionSession GetActiveSession(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_ACTIVE_SESSION, accountId));
            if (data == null)
            {
                return new ActionSession { Active = false };
            }
            return (ActionSession)StdLib.Deserialize(data);
        }

        [Safe]
        public static bool IsActionNullifierUsed(ByteString accountId, ByteString actionNullifier)
        {
            if (actionNullifier == null || actionNullifier.Length != FIXED_HASH_LENGTH) return false;
            return Storage.Get(Storage.CurrentContext, UsedActionKey(accountId, actionNullifier)) != null;
        }

        private static void SaveActiveSession(ByteString accountId, ActionSession session)
        {
            Storage.Put(Storage.CurrentContext, Key(PREFIX_ACTIVE_SESSION, accountId), StdLib.Serialize(session));
        }

        private static void ActivateActionSessionInternal(
            ByteString accountId,
            UInt160 executor,
            string actionId,
            ulong expiresAt,
            ByteString actionNullifier,
            ByteString signature)
        {
            ExecutionEngine.Assert(!IsActionNullifierUsed(accountId, actionNullifier), "Action nullifier already used");

            ByteString digest = ComputeActionDigest(executor, actionId, actionNullifier);
            bool validSignature = CryptoLib.VerifyWithECDsa(
                digest,
                GetMorpheusVerifier(accountId),
                signature,
                NamedCurveHash.secp256r1SHA256);
            ExecutionEngine.Assert(validSignature, "Invalid Morpheus action signature");

            MarkActionNullifierUsed(accountId, actionNullifier);
            SaveActiveSession(accountId, new ActionSession
            {
                Executor = executor,
                ActionId = actionId,
                ActionNullifier = actionNullifier,
                ExpiresAt = expiresAt,
                Active = true
            });

            Storage.Put(Storage.CurrentContext, Key(PREFIX_SESSION_NONCE, accountId), GetSessionNonce(accountId) + 1);
            OnProxySessionActivated(accountId, executor, actionId, actionNullifier, expiresAt);
        }

        private static void SaveOracleActionRequest(BigInteger requestId, OracleActionRequest request)
        {
            Storage.Put(Storage.CurrentContext, OracleRequestKey(requestId), StdLib.Serialize(request));
        }

        private static OracleActionRequest GetOracleActionRequest(BigInteger requestId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, OracleRequestKey(requestId));
            if (data == null) return new OracleActionRequest();
            return (OracleActionRequest)StdLib.Deserialize(data);
        }

        private static void DeleteOracleActionRequest(BigInteger requestId)
        {
            Storage.Delete(Storage.CurrentContext, OracleRequestKey(requestId));
        }

        private static void MarkActionNullifierUsed(ByteString accountId, ByteString actionNullifier)
        {
            Storage.Put(Storage.CurrentContext, UsedActionKey(accountId, actionNullifier), 1);
        }

        private static CompactActionTicket DecodeCompactActionTicket(ByteString payload)
        {
            byte[] bytes = (byte[])payload;
            ExecutionEngine.Assert(bytes != null && bytes.Length >= 1 + 20 + 32 + 64, "Compact action ticket too short");
            int offset = 0;

            byte version = bytes[offset];
            offset += 1;
            ExecutionEngine.Assert(version == COMPACT_ACTION_VERSION, "Unsupported action ticket version");

            UInt160 executor = (UInt160)ReadFixedBytes(bytes, ref offset, 20);
            string actionId = ReadLengthPrefixedText(bytes, ref offset, "action id");
            ByteString actionNullifier = (ByteString)ReadFixedBytes(bytes, ref offset, FIXED_HASH_LENGTH);
            ByteString signature = (ByteString)ReadFixedBytes(bytes, ref offset, FIXED_SIGNATURE_LENGTH);

            ExecutionEngine.Assert(offset == bytes.Length, "Unexpected compact action ticket tail");

            return new CompactActionTicket
            {
                Executor = executor,
                ActionId = actionId,
                ActionNullifier = actionNullifier,
                Signature = signature
            };
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

        private static ByteString EncodeSegment(string value)
        {
            ValidateShortText(value, "segment");
            ByteString body = (ByteString)value;
            return Helper.Concat((ByteString)new byte[] { (byte)value.Length }, body);
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

        private static byte[] Key(byte prefix, ByteString accountId) =>
            Helper.Concat(new byte[] { prefix }, accountId);

        private static byte[] OracleRequestKey(BigInteger requestId) =>
            Helper.Concat(new byte[] { PREFIX_ORACLE_REQUEST }, requestId.ToByteArray());

        private static byte[] UsedActionKey(ByteString accountId, ByteString actionNullifier) =>
            Helper.Concat(Key(PREFIX_USED_ACTION, accountId), actionNullifier);

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
