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
    [ManifestExtra("Description", "Morpheus Universal Verifier")]
    [ManifestExtra("Version", "1.0.0")]
    [ContractPermission("*", "*")]
    public class MorpheusUniversalVerifier : Framework.SmartContract
    {
        private const byte PREFIX_OWNER = 0x01;
        private const byte PREFIX_SESSION = 0x02;
        private const byte PREFIX_VERIFIER = 0x03;
        private const byte PREFIX_NONCE = 0x04;

        // neodid-universal
        private static readonly byte[] UNIVERSAL_DOMAIN = new byte[] { 110, 101, 111, 100, 105, 100, 45, 117, 110, 105, 118, 101, 114, 115, 97, 108 };

        public class ActiveSession
        {
            public UInt160 Executor = UInt160.Zero;
            public ulong ExpiresAt;
        }

        public static void Setup(ByteString accountId, UInt160 owner, ECPoint verifier)
        {
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, Key(PREFIX_VERIFIER, accountId)) == null, "Already setup");
            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), owner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_VERIFIER, accountId), (byte[])verifier);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), 0);
        }

        public static void SubmitRecoveryTicket(ByteString accountId, UInt160 newOwner, ByteString rawTicketPayload)
        {
            byte[] payloadBytes = (byte[])rawTicketPayload;
            ExecutionEngine.Assert(payloadBytes.Length > 64, "Invalid payload length");
            int sigOffset = payloadBytes.Length - 64;
            byte[] nonceBytes = new byte[sigOffset];
            for (int i = 0; i < sigOffset; i++) nonceBytes[i] = payloadBytes[i];
            byte[] sigBytes = new byte[64];
            for (int i = 0; i < 64; i++) sigBytes[i] = payloadBytes[sigOffset + i];

            BigInteger ticketNonce = new BigInteger(nonceBytes);
            BigInteger currentNonce = GetNonce(accountId);
            ExecutionEngine.Assert(ticketNonce == currentNonce, "Invalid nonce");

            ByteString digest = ComputeDigest(accountId, 0, (byte[])newOwner, ticketNonce);
            ECPoint verifier = GetVerifier(accountId);
            bool valid = CryptoLib.VerifyWithECDsa(digest, verifier, (ByteString)sigBytes, NamedCurveHash.secp256r1SHA256);
            ExecutionEngine.Assert(valid, "Invalid signature");

            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), newOwner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_SESSION, accountId));
        }

        public static void SubmitSessionTicket(ByteString accountId, UInt160 executor, ulong expiresAt, ByteString rawTicketPayload)
        {
            ExecutionEngine.Assert(expiresAt > Runtime.Time, "Session already expired");
            byte[] payloadBytes = (byte[])rawTicketPayload;
            ExecutionEngine.Assert(payloadBytes.Length > 64, "Invalid payload length");
            int sigOffset = payloadBytes.Length - 64;
            byte[] nonceBytes = new byte[sigOffset];
            for (int i = 0; i < sigOffset; i++) nonceBytes[i] = payloadBytes[i];
            byte[] sigBytes = new byte[64];
            for (int i = 0; i < 64; i++) sigBytes[i] = payloadBytes[sigOffset + i];

            BigInteger ticketNonce = new BigInteger(nonceBytes);
            BigInteger currentNonce = GetNonce(accountId);
            ExecutionEngine.Assert(ticketNonce == currentNonce, "Invalid nonce");

            ByteString digest = ComputeSessionDigest(accountId, 1, (byte[])executor, expiresAt, ticketNonce);
            ECPoint verifier = GetVerifier(accountId);
            bool valid = CryptoLib.VerifyWithECDsa(digest, verifier, (ByteString)sigBytes, NamedCurveHash.secp256r1SHA256);
            ExecutionEngine.Assert(valid, "Invalid signature");

            ActiveSession session = new ActiveSession { Executor = executor, ExpiresAt = expiresAt };
            Storage.Put(Storage.CurrentContext, Key(PREFIX_SESSION, accountId), StdLib.Serialize(session));
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);
        }

        public static bool VerifyExecution(ByteString accountId)
        {
            UInt160 owner = GetOwner(accountId);
            if (owner != UInt160.Zero && Runtime.CheckWitness(owner)) return true;

            ActiveSession session = GetActiveSession(accountId);
            if (session != null && session.ExpiresAt >= Runtime.Time && session.Executor != UInt160.Zero && Runtime.CheckWitness(session.Executor)) return true;

            return false;
        }

        public static bool VerifyExecutionMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            if (signerHashes == null || signerHashes.Length == 0) return false;
            UInt160 owner = GetOwner(accountId);
            for (int i = 0; i < signerHashes.Length; i++)
            {
                if (owner != UInt160.Zero && signerHashes[i] == owner) return true;
            }

            ActiveSession session = GetActiveSession(accountId);
            if (session != null && session.ExpiresAt >= Runtime.Time)
            {
                for (int i = 0; i < signerHashes.Length; i++)
                {
                    if (signerHashes[i] == session.Executor) return true;
                }
            }
            return false;
        }

        public static bool VerifyAdmin(ByteString accountId)
        {
            UInt160 owner = GetOwner(accountId);
            return owner != UInt160.Zero && Runtime.CheckWitness(owner);
        }

        public static bool VerifyAdminMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            if (signerHashes == null || signerHashes.Length == 0) return false;
            UInt160 owner = GetOwner(accountId);
            for (int i = 0; i < signerHashes.Length; i++)
            {
                if (owner != UInt160.Zero && signerHashes[i] == owner) return true;
            }
            return false;
        }

        public static bool VerifySigner(ByteString accountId)
        {
            return VerifyAdmin(accountId);
        }

        public static bool VerifySignerMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            return VerifyAdminMetaTx(accountId, signerHashes);
        }

        private static byte[] Key(byte prefix, ByteString accountId) => Helper.Concat(new byte[] { prefix }, accountId);

        [Safe]
        public static BigInteger GetNonce(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_NONCE, accountId));
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static UInt160 GetOwner(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        [Safe]
        public static ECPoint GetVerifier(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_VERIFIER, accountId));
            ExecutionEngine.Assert(data != null, "Not setup");
            return (ECPoint)(byte[])data;
        }

        [Safe]
        public static ActiveSession GetActiveSession(ByteString accountId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Key(PREFIX_SESSION, accountId));
            if (data == null) return null!;
            return (ActiveSession)StdLib.Deserialize(data);
        }

        private static ByteString ComputeDigest(ByteString accountId, byte actionType, byte[] newOwner, BigInteger nonce)
        {
            byte[] payload = UNIVERSAL_DOMAIN;
            payload = Helper.Concat(payload, (byte[])accountId);
            payload = Helper.Concat(payload, new byte[] { actionType });
            payload = Helper.Concat(payload, newOwner);
            payload = Helper.Concat(payload, nonce.ToByteArray());
            return CryptoLib.Sha256((ByteString)payload);
        }

        private static ByteString ComputeSessionDigest(ByteString accountId, byte actionType, byte[] executor, ulong expiresAt, BigInteger nonce)
        {
            byte[] payload = UNIVERSAL_DOMAIN;
            payload = Helper.Concat(payload, (byte[])accountId);
            payload = Helper.Concat(payload, new byte[] { actionType });
            payload = Helper.Concat(payload, executor);
            payload = Helper.Concat(payload, new BigInteger(expiresAt).ToByteArray());
            payload = Helper.Concat(payload, nonce.ToByteArray());
            return CryptoLib.Sha256((ByteString)payload);
        }
    }
}
