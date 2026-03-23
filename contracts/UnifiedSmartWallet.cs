using System.ComponentModel;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;

namespace AbstractAccount
{
    /// <summary>
    /// Canonical Neo N3 AA core for the V3 runtime.
    /// </summary>
    /// <remarks>
    /// This contract owns account state, nonce management, verifier and hook routing,
    /// backup-owner recovery, and the final target-contract execution path. Users normally:
    /// 1. register an account with <c>RegisterAccount</c>,
    /// 2. optionally bind verifier and hook plugins,
    /// 3. submit one or more <c>UserOperation</c> payloads through <c>ExecuteUserOp</c>.
    /// Security-sensitive configuration changes are always gated by the backup owner witness.
    /// </remarks>
    [DisplayName("UnifiedSmartWalletV3")]
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "ERC-4337 Aligned Minimalist AA Engine for Neo N3")]
    public partial class UnifiedSmartWallet : SmartContract
    {
    }
}
