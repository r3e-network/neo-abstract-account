using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using System.ComponentModel;

namespace AllowAllVerifierContract
{
    [DisplayName("AllowAllVerifier")]
    [ManifestExtra("Author", "R3E Network")]
    [ContractPermission("*", "*")]
    public class AllowAllVerifier : SmartContract
    {
        public static bool Verify(ByteString accountId)
        {
            return accountId != null && accountId.Length > 0;
        }

        public static bool VerifyMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            return accountId != null && accountId.Length > 0 && signerHashes != null && signerHashes.Length > 0;
        }
    }
}
