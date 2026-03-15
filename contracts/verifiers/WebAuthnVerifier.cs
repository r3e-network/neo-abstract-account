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
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "WebAuthn / Passkey Hardware Enclave Verifier")]
    public class WebAuthnVerifier : SmartContract
    {
        private static readonly byte[] Prefix_AccountPubKey = new byte[] { 0x01 };

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
        public static ByteString GetPayload(UInt160 accountId, UInt160 targetContract, string method, object[] args, BigInteger nonce, BigInteger deadline)
        {
            return (ByteString)BuildPayload(accountId, targetContract, method, args, nonce, deadline);
        }

        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            ByteString pubKey = GetPublicKey(accountId);
            ExecutionEngine.Assert(pubKey.Length > 0, "No WebAuthn pubkey configured");

            ExecutionEngine.Assert(op.Signature != null && op.Signature.Length == 64, "Invalid signature length");
            byte[] payload = BuildPayload(accountId, op.TargetContract, op.Method, op.Args, op.Nonce, op.Deadline);
            
            return CryptoLib.VerifyWithECDsa((ByteString)payload, (ECPoint)pubKey, op.Signature, NamedCurveHash.secp256r1SHA256);
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
