using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        // ========================================================================
        // 7. Market Escrow (address transfer)
        // ========================================================================

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
            if (previousVerifier != UInt160.Zero)
            {
                try { Contract.Call(previousVerifier, "clearAccount", CallFlags.All, new object[] { accountId }); }
                catch { } // Plugin may not implement clearAccount
            }
            if (previousHook != UInt160.Zero)
            {
                try { Contract.Call(previousHook, "clearAccount", CallFlags.All, new object[] { accountId }); }
                catch { } // Plugin may not implement clearAccount
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
            Storage.Delete(Storage.CurrentContext, marketKey);
            Storage.Delete(Storage.CurrentContext, listingKey);
        }
    }
}
