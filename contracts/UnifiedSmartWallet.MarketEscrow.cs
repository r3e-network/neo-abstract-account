using System.ComponentModel;
using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        // ========================================================================
        // 7. Market Escrow (address transfer)
        // ========================================================================

        // Storage prefix for the owner-driven, timelocked escrow cancellation marker.
        // Distinct from every prefix declared in UnifiedSmartWallet.Internal.cs (0x01-0x12)
        // and from Prefix_ContractAdmin (0x11) in UnifiedSmartWallet.Admin.cs.
        private static readonly byte[] Prefix_MarketEscrowCancelInitiated = new byte[] { 0x13 };

        // Delay the backup owner must wait between requesting and forcing an escrow
        // cancellation. Gives an honest market its full opportunity to settle while still
        // guaranteeing the owner can always reclaim a stuck/abandoned escrow.
        private static readonly BigInteger MarketEscrowOwnerCancelTimelockMs = 7L * 24 * 60 * 60 * 1000;

        public delegate void MarketEscrowOwnerCancelInitiatedDelegate(UInt160 accountId, UInt160 backupOwner, BigInteger availableAt);

        [DisplayName("MarketEscrowOwnerCancelInitiated")]
        public static event MarketEscrowOwnerCancelInitiatedDelegate OnMarketEscrowOwnerCancelInitiated = null!;

        [DisplayName("MarketEscrowOwnerCancelled")]
        public static event AccountOnlyDelegate OnMarketEscrowOwnerCancelled = null!;

        /// <summary>
        /// Locks an account into a market-controlled escrow state so it can be sold atomically.
        /// While escrow is active, normal execution and configuration flows are blocked.
        /// </summary>
        public static void EnterMarketEscrow(UInt160 accountId, UInt160 marketContract, BigInteger listingId)
        {
            AssertBackupOwner(accountId);
            AssertNoMarketEscrow(accountId);
            ExecutionEngine.Assert(marketContract != null && marketContract != UInt160.Zero, "Market contract required");
            ExecutionEngine.Assert(listingId > 0, "Listing id required");

            byte[] marketKey = Helper.Concat(Prefix_MarketEscrowContract, (byte[])accountId);
            byte[] listingKey = Helper.Concat(Prefix_MarketEscrowListing, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, marketKey, (byte[])marketContract!);
            Storage.Put(Storage.CurrentContext, listingKey, listingId);
            OnMarketEscrowEntered(accountId, marketContract!, listingId);
        }

        /// <summary>
        /// Clears an active market escrow without changing control. Intended for listing cancellation.
        /// </summary>
        public static void CancelMarketEscrow(UInt160 accountId, BigInteger listingId)
        {
            AssertEscrowMarket(accountId, listingId);
            ClearMarketEscrow(accountId);
            OnMarketEscrowCancelled(accountId);
        }

        /// <summary>
        /// Completes a market escrow sale by transferring only the AA shell and wiping prior plugin state.
        /// The buyer receives a clean account with a new backup owner and no inherited verifier/hook bindings.
        /// </summary>
        public static void SettleMarketEscrow(UInt160 accountId, BigInteger listingId, UInt160 newBackupOwner)
        {
            AssertEscrowMarket(accountId, listingId);
            ExecutionEngine.Assert(newBackupOwner != null && newBackupOwner != UInt160.Zero, "New backup owner required");

            AccountState state = GetAccountState(accountId);
            UInt160 previousVerifier = state.Verifier;
            UInt160 previousHook = state.HookId;

            // Clear old plugin state before wiping pointers
            // Must set config context so the plugin's ValidateConfigCaller succeeds
            if (previousVerifier != UInt160.Zero)
            {
                SetVerifierConfigContext(accountId, previousVerifier);
                try { Contract.Call(previousVerifier, "clearAccount", CallFlags.All, new object[] { accountId }); }
                catch { } // Plugin may not implement clearAccount
                finally { ClearVerifierConfigContext(accountId); }
            }
            if (previousHook != UInt160.Zero)
            {
                SetHookConfigContext(accountId, previousHook);
                try { Contract.Call(previousHook, "clearAccount", CallFlags.All, new object[] { accountId }); }
                catch { } // Plugin may not implement clearAccount
                finally { ClearHookConfigContext(accountId); }
            }

            state.BackupOwner = newBackupOwner!;
            state.Verifier = UInt160.Zero;
            state.HookId = UInt160.Zero;
            state.EscapeTriggeredAt = 0;

            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));

            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId));
            Storage.Delete(Storage.CurrentContext, Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId));

            if (previousVerifier != UInt160.Zero)
            {
                OnModuleRemoved(accountId, ModuleTypeVerifier, previousVerifier);
            }
            if (previousHook != UInt160.Zero)
            {
                OnModuleRemoved(accountId, ModuleTypeHook, previousHook);
            }

            ClearMarketEscrow(accountId);
            OnMarketEscrowSettled(accountId, newBackupOwner!);
        }

        /// <summary>
        /// Begins the backup-owner escape from a market escrow. This is the owner-side counterpart
        /// to the market-driven <see cref="CancelMarketEscrow"/>: it lets the account's backup owner
        /// unwind a stuck or abandoned escrow (e.g. a market contract that was destroyed, upgraded
        /// away, or never settles) instead of leaving the account permanently bricked.
        ///
        /// The actual cancellation is timelocked via <see cref="ForceCancelMarketEscrow"/> so an
        /// honest market still has its full window to settle the sale before the owner can reclaim
        /// control. Re-invoking restarts the timer.
        /// </summary>
        public static void InitiateMarketEscrowCancel(UInt160 accountId)
        {
            AssertBackupOwner(accountId);
            ExecutionEngine.Assert(IsMarketEscrowActive(accountId), "Market escrow not active");

            byte[] key = Helper.Concat(Prefix_MarketEscrowCancelInitiated, (byte[])accountId);
            Storage.Put(Storage.CurrentContext, key, Runtime.Time);

            AccountState state = GetAccountState(accountId);
            OnMarketEscrowOwnerCancelInitiated(accountId, state.BackupOwner!, Runtime.Time + MarketEscrowOwnerCancelTimelockMs);
        }

        /// <summary>
        /// Completes the backup-owner escape after the timelock elapses, clearing the escrow and
        /// returning full control to the existing backup owner without changing ownership. Preserves
        /// the normal market settle/cancel paths; this only guarantees the owner is never permanently
        /// locked out by an unresponsive market.
        /// </summary>
        public static void ForceCancelMarketEscrow(UInt160 accountId)
        {
            AssertBackupOwner(accountId);
            ExecutionEngine.Assert(IsMarketEscrowActive(accountId), "Market escrow not active");

            byte[] key = Helper.Concat(Prefix_MarketEscrowCancelInitiated, (byte[])accountId);
            ByteString? initiated = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(initiated != null, "Owner cancel not initiated");
            BigInteger initiatedAt = (BigInteger)initiated!;
            ExecutionEngine.Assert(Runtime.Time >= initiatedAt + MarketEscrowOwnerCancelTimelockMs, "Owner cancel timelock active");

            ClearMarketEscrow(accountId);
            OnMarketEscrowOwnerCancelled(accountId);
        }

        /// <summary>
        /// Returns whether the backup owner has an in-flight timelocked escrow cancellation.
        /// </summary>
        [Safe]
        public static bool HasMarketEscrowOwnerCancel(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_MarketEscrowCancelInitiated, (byte[])accountId);
            return Storage.Get(Storage.CurrentContext, key) != null;
        }

        /// <summary>
        /// Returns the timestamp (ms) at which the backup owner may force-cancel the escrow, or 0
        /// if no owner cancellation is in flight.
        /// </summary>
        [Safe]
        public static BigInteger GetMarketEscrowOwnerCancelTime(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_MarketEscrowCancelInitiated, (byte[])accountId);
            ByteString? initiated = Storage.Get(Storage.CurrentContext, key);
            return initiated == null ? 0 : (BigInteger)initiated! + MarketEscrowOwnerCancelTimelockMs;
        }

        private static void AssertNoMarketEscrow(UInt160 accountId)
        {
            ExecutionEngine.Assert(!IsMarketEscrowActive(accountId), "Account locked in market escrow");
        }

        private static void AssertEscrowMarket(UInt160 accountId, BigInteger listingId)
        {
            UInt160 market = GetMarketEscrowContract(accountId);
            BigInteger currentListingId = GetMarketEscrowListingId(accountId);
            ExecutionEngine.Assert(market != UInt160.Zero, "Market escrow not active");
            ExecutionEngine.Assert(Runtime.CallingScriptHash == market, "Only escrow market");
            ExecutionEngine.Assert(currentListingId == listingId, "Listing mismatch");
        }

        private static void ClearMarketEscrow(UInt160 accountId)
        {
            byte[] marketKey = Helper.Concat(Prefix_MarketEscrowContract, (byte[])accountId);
            byte[] listingKey = Helper.Concat(Prefix_MarketEscrowListing, (byte[])accountId);
            byte[] ownerCancelKey = Helper.Concat(Prefix_MarketEscrowCancelInitiated, (byte[])accountId);
            Storage.Delete(Storage.CurrentContext, marketKey);
            Storage.Delete(Storage.CurrentContext, listingKey);
            Storage.Delete(Storage.CurrentContext, ownerCancelKey);
        }
    }
}
