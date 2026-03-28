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
    /// Verifier for short-lived delegated session keys.
    /// </summary>
    /// <remarks>
    /// This plugin is intended for constrained delegation, such as a bot or game session that may
    /// call only one contract and one method until a fixed expiry time.
    /// </remarks>
    [DisplayName("SessionKeyVerifier")]
    [ContractPermission("*", "canConfigureVerifier")]
    [ContractPermission("*", "computeArgsHash")]
    [ManifestExtra("Description", "Temporary Session Key Verifier for High Frequency Actions")]
    public class SessionKeyVerifier : SmartContract
    {
        // AccountId -> SessionKeyData
        private static readonly byte[] Prefix_SessionKeys = new byte[] { 0x01 };

        // Maximum session key lifetime: 30 days in milliseconds
        private const long MaxSessionDuration = 30L * 24 * 3600 * 1000; // 2_592_000_000

        public static void _deploy(object data, bool update) => VerifierAuthority.Initialize(data, update);

        [Safe]
        public static UInt160 AuthorizedCore() => VerifierAuthority.AuthorizedCore();

        public static void SetAuthorizedCore(UInt160 coreContract) => VerifierAuthority.SetAuthorizedCore(coreContract);

        public class SessionKeyData
        {
            public ByteString PubKey = (ByteString)new byte[0];          // secp256r1 uncompressed
            public UInt160 TargetContract = UInt160.Zero;
            public string Method = string.Empty;
            public BigInteger ValidUntil;
        }

        /// <summary>
        /// Configures the active session key and its target/method/expiry scope.
        /// </summary>
        public static void SetSessionKey(UInt160 accountId, ByteString pubKey, UInt160 targetContract, string method, BigInteger validUntil)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            ExecutionEngine.Assert(pubKey.Length == 33 || pubKey.Length == 65, "Invalid public key length");
            ExecutionEngine.Assert(validUntil > Runtime.Time, "Session key must expire in the future");
            ExecutionEngine.Assert(validUntil <= Runtime.Time + MaxSessionDuration, "Session key lifetime exceeds maximum of 30 days");
            
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

        /// <summary>
        /// Removes the current delegated session key for the account.
        /// </summary>
        public static void ClearSessionKey(UInt160 accountId)
        {
            VerifierAuthority.ValidateConfigCaller(accountId, Runtime.ExecutingScriptHash);
            byte[] key = Helper.Concat(Prefix_SessionKeys, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, key);
        }

        [Safe]
        public static SessionKeyData? GetSessionKey(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_SessionKeys, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return null;
            return (SessionKeyData)StdLib.Deserialize(data!);
        }

        public static void ClearAccount(UInt160 accountId)
        {
            ClearSessionKey(accountId);
        }

        [Safe]
        /// <summary>
        /// Returns the exact payload bytes that the delegated session key must sign.
        /// </summary>
        public static ByteString GetPayload(UInt160 accountId, UInt160 targetContract, string method, object[] args, BigInteger nonce, BigInteger deadline)
        {
            return (ByteString)VerifierPayload.BuildPayload(accountId, targetContract, method, args, nonce, deadline);
        }

        /// <summary>
        /// Validates the delegated session signature and enforces its contract/method/expiry scope.
        /// </summary>
        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            SessionKeyData? sk = GetSessionKey(accountId);
            ExecutionEngine.Assert(sk != null, "No session key active");
            SessionKeyData sessionKey = sk!;
            
            ExecutionEngine.Assert(Runtime.Time <= sessionKey.ValidUntil, "Session key expired");
            ExecutionEngine.Assert(op.TargetContract == sessionKey.TargetContract, "Target contract not permitted");
            if (sessionKey.Method != "*") // Allow wildcard method if configured
            {
                ExecutionEngine.Assert(op.Method == sessionKey.Method, "Method not permitted");
            }

            ExecutionEngine.Assert(op.Signature != null && op.Signature.Length == 64, "Invalid signature length");
            ByteString signature = op.Signature!;
            byte[] payload = VerifierPayload.BuildPayload(accountId, op.TargetContract, op.Method, op.Args, op.Nonce, op.Deadline);
            
            // Verify against the raw payload; secp256r1SHA256 hashes internally.
            return CryptoLib.VerifyWithECDsa((ByteString)payload, (ECPoint)sessionKey.PubKey, signature, NamedCurveHash.secp256r1SHA256);
        }
    }
}
