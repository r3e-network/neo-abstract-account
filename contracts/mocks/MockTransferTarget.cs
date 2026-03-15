using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using System.ComponentModel;

namespace AbstractAccount.Mocks
{
    /// <summary>
    /// Minimal mock target used by validation suites for transfer-like calls.
    /// </summary>
    /// <remarks>
    /// This contract is not meant for production value storage. It gives plugin and AA tests a
    /// stable target that exposes <c>symbol</c>, <c>balanceOf</c>, and <c>transfer</c> without
    /// depending on external token balances or live third-party contracts.
    /// </remarks>
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
