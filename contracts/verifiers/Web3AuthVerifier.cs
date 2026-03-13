using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount
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

    public class NativeCryptoLib
    {
        public static ByteString Keccak256(ByteString data)
        {
            return (ByteString)Contract.Call(Neo.SmartContract.Framework.Native.CryptoLib.Hash, "keccak256", CallFlags.ReadOnly, new object[] { data });
        }
    }

    [DisplayName("Web3AuthVerifier")]
    [ManifestExtra("Description", "EIP-712 MetaTransaction Verifier Plugin for Neo N3")]
    public class Web3AuthVerifier : SmartContract
    {
        // Setup: AccountId -> Uncompressed Secp256k1 PublicKey (65 bytes)
        private static readonly byte[] Prefix_AccountPubKey = new byte[] { 0x01 };

        public static void SetPublicKey(UInt160 accountId, ByteString uncompressedPubKey)
        {
            ExecutionEngine.Assert(uncompressedPubKey.Length == 65, "Invalid pubkey");
            byte[] key = Helper.Concat(Prefix_AccountPubKey, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, uncompressedPubKey);
        }

        [Safe]
        public static ByteString GetPublicKey(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_AccountPubKey, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            return data ?? (ByteString)"";
        }

        [Safe]
        public static bool ValidateSignature(UInt160 accountId, UserOperation op)
        {
            ByteString pubKey = GetPublicKey(accountId);
            ExecutionEngine.Assert(pubKey.Length == 65, "No pubkey configured");

            ExecutionEngine.Assert(op.Signature != null && op.Signature.Length == 64, "Invalid signature");

            byte[] structHash = BuildMetaTxStructHash(accountId, op);
            
            // EIP-712 Domain Separator (Mocked for testnet logic)
            byte[] domainSeparator = new byte[32]; // Normally keccak256 of domain data
            
            // 0x19 0x01 ...
            byte[] typedDataPayload = Helper.Concat(Helper.Concat(new byte[] { 0x19, 0x01 }, domainSeparator), structHash);
            
            ECPoint compressedPubKey = CompressPubKey(pubKey);
            return CryptoLib.VerifyWithECDsa(
                (ByteString)typedDataPayload,
                compressedPubKey,
                op.Signature,
                NamedCurveHash.secp256k1Keccak256
            );
        }

        private static byte[] BuildMetaTxStructHash(UInt160 accountId, UserOperation op)
        {
            // Simplified EIP-712 struct hash implementation. 
            // In a real environment, this would compute keccak256 of the ABI encoded types.
            // For now, we concat the critical fields to prevent malleability.
            byte[] argsSerialized = (byte[])StdLib.Serialize(op.Args);
            ByteString argsHash = NativeCryptoLib.Keccak256((ByteString)argsSerialized);

            byte[] methodBytes = (byte[])StdLib.Serialize(op.Method);
            byte[] payload = Helper.Concat(Helper.Concat(Helper.Concat(Helper.Concat((byte[])accountId, (byte[])op.TargetContract), methodBytes), (byte[])argsHash), op.Nonce.ToByteArray());
            return (byte[])NativeCryptoLib.Keccak256((ByteString)payload);
        }

        private static ECPoint CompressPubKey(ByteString uncompressedPubKey)
        {
            byte[] pk = (byte[])uncompressedPubKey;
            byte[] compressed = new byte[33];
            compressed[0] = (pk[64] % 2 == 0) ? (byte)0x02 : (byte)0x03;
            for (int i = 0; i < 32; i++) compressed[i + 1] = pk[i + 1];

            return (ECPoint)(ByteString)compressed;
        }
    }
}
