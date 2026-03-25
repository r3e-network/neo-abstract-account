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
    /// <summary>
    /// Verifier for passkey / WebAuthn secp256r1 signatures.
    /// </summary>
    /// <remarks>
    /// This plugin lets a V3 AA account be controlled by a passkey credential after the
    /// corresponding public key has been provisioned through the AA core.
    /// </remarks>
    [DisplayName("WebAuthnVerifier")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "WebAuthn / Passkey Hardware Enclave Verifier")]
    public class WebAuthnVerifier : SmartContract
    {
        private static readonly byte[] Prefix_AccountPubKey = new byte[] { 0x01 };

        public static void _deploy(object data, bool update) => VerifierAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => VerifierAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => VerifierAuthority.SetAuthorizedCore(coreContract);

        /// <summary>
        /// Stores the passkey public key for an AA account.
        /// </summary>
        public static void SetPublicKey(UInt160 accountId, ByteString pubKey)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
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

        public static void ClearAccount(UInt160 accountId)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_AccountPubKey, (byte[])accountId));
        }

        [Safe]
        /// <summary>
        /// Returns the payload bytes that a WebAuthn signer must approve.
        /// </summary>
        public static ByteString GetPayload(UInt160 accountId, UInt160 targetContract, string method, object[] args, BigInteger nonce, BigInteger deadline)
        {
            return (ByteString)BuildPayload(accountId, targetContract, method, args, nonce, deadline);
        }

        /// <summary>
        /// Validates the WebAuthn secp256r1 signature for the given user operation.
        /// </summary>
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
