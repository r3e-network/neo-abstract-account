using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount.Verifiers
{
    [DisplayName("SessionKeyVerifier")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Temporary Session Key Verifier for High Frequency Actions")]
    public class SessionKeyVerifier : SmartContract
    {
        // AccountId -> SessionKeyData
        private static readonly byte[] Prefix_SessionKeys = new byte[] { 0x01 };

        public class SessionKeyData
        {
            public ByteString PubKey;          // secp256r1 uncompressed
            public UInt160 TargetContract;
            public string Method;
            public BigInteger ValidUntil;
        }

        public static void SetSessionKey(UInt160 accountId, ByteString pubKey, UInt160 targetContract, string method, BigInteger validUntil)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureVerifier",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            ExecutionEngine.Assert(pubKey.Length > 0, "Invalid pubKey");
            ExecutionEngine.Assert(validUntil > Runtime.Time, "Session key must expire in the future");
            
            SessionKeyData data = new SessionKeyData
            {
                PubKey = pubKey,
                TargetContract = targetContract,
                Method = method,
                ValidUntil = validUntil
            };

            byte[] key = Helper.Concat(Prefix_SessionKeys, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(data));
        }

        public static void ClearSessionKey(UInt160 accountId)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureVerifier",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Prefix_SessionKeys, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, key);
        }

        [Safe]
        public static SessionKeyData GetSessionKey(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_SessionKeys, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return null;
            return (SessionKeyData)StdLib.Deserialize(data!);
        }

        [Safe]
        public static ByteString GetPayload(UInt160 accountId, UInt160 targetContract, string method, object[] args, BigInteger nonce, BigInteger deadline)
        {
            return (ByteString)BuildPayload(accountId, targetContract, method, args, nonce, deadline);
        }

        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            SessionKeyData sk = GetSessionKey(accountId);
            ExecutionEngine.Assert(sk != null, "No session key active");
            
            ExecutionEngine.Assert(Runtime.Time <= sk.ValidUntil, "Session key expired");
            ExecutionEngine.Assert(op.TargetContract == sk.TargetContract, "Target contract not permitted");
            if (sk.Method != "*") // Allow wildcard method if configured
            {
                ExecutionEngine.Assert(op.Method == sk.Method, "Method not permitted");
            }

            ExecutionEngine.Assert(op.Signature != null && op.Signature.Length == 64, "Invalid signature length");
            byte[] payload = BuildPayload(accountId, op.TargetContract, op.Method, op.Args, op.Nonce, op.Deadline);
            
            // Verify against the raw payload; secp256r1SHA256 hashes internally.
            return CryptoLib.VerifyWithECDsa((ByteString)payload, (ECPoint)sk.PubKey, op.Signature, NamedCurveHash.secp256r1SHA256);
        }

        private static byte[] BuildPayload(UInt160 accountId, UInt160 targetContract, string method, object[] args, BigInteger nonce, BigInteger deadline)
        {
            byte[] argsSerialized = (byte[])StdLib.Serialize(args);
            byte[] methodBytes = (byte[])StdLib.Serialize(method);
            return Helper.Concat(
                Helper.Concat(
                    Helper.Concat(
                        Helper.Concat((byte[])accountId, (byte[])targetContract),
                        methodBytes
                    ),
                    argsSerialized
                ),
                Helper.Concat(nonce.ToByteArray(), deadline.ToByteArray())
            );
        }
    }
}
