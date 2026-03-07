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
    }
}
