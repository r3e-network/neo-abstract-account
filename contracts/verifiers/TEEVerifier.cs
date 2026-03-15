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
    // The UserOperation struct must match the caller's struct exactly
    public class UserOperation
    {
        public UInt160 TargetContract;
        public string Method;
        public object[] Args;
        public BigInteger Nonce;
        public BigInteger Deadline;
        public ByteString Signature;
    }

    /// <summary>
    /// Verifier for enclave- or TEE-produced secp256r1 signatures.
    /// </summary>
    /// <remarks>
    /// This plugin is designed for trusted off-chain agents or secure hardware workers that sign
    /// raw AA payload bytes after applying private business logic. The verifier only checks the
    /// signature; remote attestation and policy decisions must happen off-chain before signing.
    /// </remarks>
    [DisplayName("TEEVerifier")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "TEE Hardware Signature Verifier")]
    public class TEEVerifier : SmartContract
    {
        // Setup: AccountId -> TEE Public Key (secp256r1)
        private static readonly byte[] Prefix_AccountPubKey = new byte[] { 0x01 };

        /// <summary>
        /// Stores the enclave public key used to authorize future user operations.
        /// </summary>
        public static void SetPublicKey(UInt160 accountId, ByteString pubKey)
        {
            bool authorized = (bool)Contract.Call(
                Runtime.CallingScriptHash,
                "canConfigureVerifier",
                CallFlags.ReadOnly,
                new object[] { accountId, Runtime.ExecutingScriptHash });
            ExecutionEngine.Assert(authorized, "Unauthorized");
            byte[] key = Helper.Concat(Prefix_AccountPubKey, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, pubKey);
        }

        [Safe]
        public static ByteString GetPublicKey(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_AccountPubKey, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            return data ?? (ByteString)"";
        }

        [Safe]
        /// <summary>
        /// Returns the exact payload bytes a TEE signer must sign for this verifier.
        /// </summary>
        public static ByteString GetPayload(UInt160 accountId, UInt160 targetContract, string method, object[] args, BigInteger nonce, BigInteger deadline)
        {
            return (ByteString)BuildPayload(accountId, targetContract, method, args, nonce, deadline);
        }

        /// <summary>
        /// Validates a secp256r1 signature against the raw AA payload bytes.
        /// </summary>
        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            ByteString teePubKey = GetPublicKey(accountId);
            ExecutionEngine.Assert(teePubKey.Length > 0, "No TEE pubkey configured");

            ExecutionEngine.Assert(op.Signature != null && op.Signature.Length == 64, "Invalid signature");
            byte[] payload = BuildPayload(accountId, op.TargetContract, op.Method, op.Args, op.Nonce, op.Deadline);
            
            // Verify secp256r1 (P-256) which is commonly used in SGX/TDX TEEs.
            return CryptoLib.VerifyWithECDsa((ByteString)payload, (ECPoint)teePubKey, op.Signature, NamedCurveHash.secp256r1SHA256);
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
