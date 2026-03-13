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
    [DisplayName("WebAuthnVerifier")]
    [ManifestExtra("Description", "WebAuthn / Passkey Hardware Enclave Verifier")]
    public class WebAuthnVerifier : SmartContract
    {
        private static readonly byte[] Prefix_AccountPubKey = new byte[] { 0x01 };

        public static void SetPublicKey(UInt160 accountId, ByteString pubKey)
        {
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
            ByteString pubKey = GetPublicKey(accountId);
            ExecutionEngine.Assert(pubKey.Length > 0, "No WebAuthn pubkey configured");

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
            
            return CryptoLib.VerifyWithECDsa(messageHash, (ECPoint)pubKey, op.Signature, NamedCurveHash.secp256r1SHA256);
        }
    }
}