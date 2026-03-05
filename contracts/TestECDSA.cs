using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AbstractAccount
{
    [DisplayName("TestECDSA")]
    [ManifestExtra("Author", "Test")]
    [ContractPermission("*", "*")]
    public class TestECDSA : SmartContract
    {
        public static bool TestVerify(ByteString message, ByteString pubkey, ByteString signature)
        {
            return CryptoLib.VerifyWithECDsa(message, (Neo.SmartContract.Framework.ECPoint)pubkey, signature, NamedCurveHash.secp256k1Keccak256);
        }
    }
}
