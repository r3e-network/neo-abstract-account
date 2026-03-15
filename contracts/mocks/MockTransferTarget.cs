using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using System.ComponentModel;

namespace AbstractAccount.Mocks
{
    [DisplayName("MockTransferTarget")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "Minimal transfer-capable test target for AA V3 validation")]
    public class MockTransferTarget : SmartContract
    {
        [Safe]
        public static string Symbol()
        {
            return "MOCK";
        }

        [Safe]
        public static BigInteger BalanceOf(UInt160 account)
        {
            return 0;
        }

        public static bool Transfer(UInt160 from, UInt160 to, BigInteger amount, object data)
        {
            ExecutionEngine.Assert(from != null && from != UInt160.Zero, "from required");
            ExecutionEngine.Assert(to != null && to != UInt160.Zero, "to required");
            ExecutionEngine.Assert(amount >= 0, "amount must be non-negative");
            return true;
        }
    }
}
