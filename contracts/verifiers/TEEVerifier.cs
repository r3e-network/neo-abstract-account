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

    [DisplayName("TEEVerifier")]
    [ManifestExtra("Description", "TEE Hardware Signature Verifier")]
    public class TEEVerifier : SmartContract
    {
        // Setup: AccountId -> TEE Public Key (secp256r1)
        private static readonly byte[] Prefix_AccountPubKey = new byte[] { 0x01 };

        public static void SetPublicKey(UInt160 accountId, ByteString pubKey)
        {
            // Only the AA account itself can change its TEE public key configuration
            ExecutionEngine.Assert(Runtime.CheckWitness(accountId), "Unauthorized");
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

        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            ByteString teePubKey = GetPublicKey(accountId);
            ExecutionEngine.Assert(teePubKey.Length > 0, "No TEE pubkey configured");

            ExecutionEngine.Assert(op.Signature != null && op.Signature.Length == 64, "Invalid signature");
            
            // Reconstruct the message hash using the exact payload sent by TEE
            byte[] argsSerialized = (byte[])StdLib.Serialize(op.Args);
            byte[] methodBytes = (byte[])StdLib.Serialize(op.Method);
            byte[] payload = Helper.Concat(
                Helper.Concat(
                    Helper.Concat(
                        Helper.Concat((byte[])accountId, (byte[])op.TargetContract), 
                        methodBytes
                    ), 
                    argsSerialized
                ), 
                op.Nonce.ToByteArray()
            );

            ByteString messageHash = CryptoLib.Sha256((ByteString)payload);
            
            // Verify secp256r1 (P-256) which is commonly used in SGX/TDX TEEs
            return CryptoLib.VerifyWithECDsa(messageHash, (ECPoint)teePubKey, op.Signature, NamedCurveHash.secp256r1SHA256);
        }
    }
}