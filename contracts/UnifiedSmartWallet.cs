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
    // Wildcard permission is required because ExecuteUserOp dynamically dispatches
    // Contract.Call(op.TargetContract, op.Method, ...) to arbitrary user-chosen contracts.
    // All plugins (verifiers, hooks) use least-privilege manifests; only the core needs this.
    [ContractPermission("*", "*")]
    [ManifestExtra("Description", "ERC-4337 Aligned Minimalist AA Engine for Neo N3")]
    public partial class UnifiedSmartWallet : SmartContract
    {
        // =====================================================================================
        // STORAGE PREFIX MAP  (authoritative — pinned by StoragePrefixMapTests)
        // =====================================================================================
        // Every storage key in this contract begins with a one-byte prefix declared as
        // `private static readonly byte[] Prefix_* = new byte[] { 0xNN };`. The declarations are
        // spread across the partial-class files below. This map is the single source of truth for
        // the allocation: it lists each prefix byte, its owning partial, the Prefix_* field, and the
        // KEY SHAPE (how the prefix is combined into a full storage key).
        //
        // KEY SHAPES:
        //   bare      = the 1-byte prefix is the entire storage key (a single global slot).
        //   +acctId   = the prefix is concatenated with a 20-byte accountId
        //               (Helper.Concat(prefix, accountId)) -> a 21-byte per-account key.
        //
        // Byte  Field                              Owning partial            Key shape
        // ----  ---------------------------------  ------------------------  ---------
        // 0x01  Prefix_AccountState                Internal.cs               +acctId
        // 0x02  Prefix_VerifyContext               Internal.cs               +acctId
        // 0x03  Prefix_Nonce                       Internal.cs               +acctId(+channel)
        // 0x04  Prefix_VerifierConfigContext       Internal.cs               +acctId
        // 0x05  Prefix_HookConfigContext           Internal.cs               +acctId
        // 0x06  Prefix_MarketEscrowContract        Internal.cs               +acctId
        // 0x07  Prefix_MarketEscrowListing         Internal.cs               +acctId
        // 0x08  Prefix_EscapeLastInitiated         Internal.cs               +acctId
        // 0x09  Prefix_PendingVerifierUpdate       Internal.cs               +acctId
        // 0x0A  Prefix_PendingHookUpdate           Internal.cs               +acctId
        // 0x0B  Prefix_ExecutionLock               Internal.cs               +acctId
        // 0x0C  Prefix_MetadataUri                 Internal.cs               +acctId
        // 0x0D  Prefix_HookExecutionContext        Internal.cs               +acctId
        // 0x0E  Prefix_VerifierExecutionContext    Internal.cs               +acctId
        // 0x0F  Prefix_PendingVerifierCall         Internal.cs               +acctId
        // 0x10  Prefix_PendingHookCall             Internal.cs               +acctId
        // 0x11  Prefix_ContractAdmin               Admin.cs                  bare
        // 0x12  Prefix_PendingUpdateNefHash        Admin.cs                  bare         <-- byte reused
        // 0x12  Prefix_VerifyScopeTarget           Internal.cs               +acctId      <-- by 0x12, distinct shape
        // 0x13  Prefix_PendingUpdateManifestHash   Admin.cs                  bare         <-- byte reused
        // 0x13  Prefix_MarketEscrowCancelInitiated MarketEscrow.cs           +acctId      <-- by 0x13, distinct shape
        // 0x14  Prefix_UpdateTimelock              Admin.cs                  bare
        // 0x15  Prefix_PendingContractAdmin        Admin.cs                  bare
        // 0x16  Prefix_AdminTransferTimelock       Admin.cs                  bare
        //
        // COLLISION SAFETY: bytes 0x12 and 0x13 are each declared TWICE (once in Admin.cs, once in
        // an account-scoped partial). This is NOT a storage collision because the two consumers of
        // each byte use different key shapes: the Admin.cs keys are bare 1-byte global slots, while
        // the Internal/MarketEscrow keys are always 21-byte accountId-suffixed keys. A 1-byte key
        // and a 21-byte key can never alias, so the two namespaces are disjoint. StoragePrefixMapTests
        // pins this map against the source and fails if any FUTURE prefix is added such that two
        // prefixes share BOTH the same byte AND the same key shape (a real collision).
        //
        // DEFERRED: renumbering 0x12/0x13 so that every byte is globally unique is intentionally NOT
        // done here. The prefixes are part of the on-chain storage layout of already-deployed
        // instances; changing them would orphan existing data and require a redeploy/migration. The
        // shape-based disambiguation above keeps the current allocation correct without that churn.
        // =====================================================================================
    }
}
