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
    /// <summary>
    /// Trustless GAS escrow market for deterministic Neo Abstract Account addresses.
    /// The seller lists an account and atomically locks it in the AA core's market escrow.
    /// The buyer atomically pays GAS and settles the transfer in one transaction.
    /// </summary>
    [DisplayName("AAAddressMarket")]
    [ManifestExtra("Description", "Trustless escrow market for Neo Abstract Account addresses")]
    [ContractPermission("*", "getBackupOwner")]
    [ContractPermission("*", "enterMarketEscrow")]
    [ContractPermission("*", "cancelMarketEscrow")]
    [ContractPermission("*", "settleMarketEscrow")]
    [ContractPermission("*", "transfer")]
    public class AAAddressMarket : SmartContract
    {
        private static readonly byte[] Prefix_NextListingId = new byte[] { 0x01 };
        private static readonly byte[] Prefix_Listing = new byte[] { 0x02 };
        private static readonly byte[] Prefix_PendingPayment = new byte[] { 0x03 };

        private const byte StatusActive = 1;
        private const byte StatusSold = 2;
        private const byte StatusCancelled = 3;
        private const int MaxTitleLength = 80;
        private const int MaxMetadataUriLength = 240;

        // Price bounds (GAS has 8 decimals, so 1000 GAS = 100_000_000_000)
        private static readonly BigInteger MinListingPrice = 1_000_000;  // Minimum 0.01 GAS
        private static readonly BigInteger MaxListingPrice = 100_000_000_000;  // Maximum 1000 GAS

        public class Listing
        {
            public BigInteger Id;
            public UInt160 AAContract = UInt160.Zero;
            public UInt160 AccountId = UInt160.Zero;
            public UInt160 Seller = UInt160.Zero;
            public BigInteger Price;
            public string Title = string.Empty;
            public string MetadataUri = string.Empty;
            public byte Status;
            public UInt160 Buyer = UInt160.Zero;
            public BigInteger CreatedAt;
            public BigInteger UpdatedAt;
        }

        public static void CreateListing(UInt160 aaContract, UInt160 accountId, BigInteger price, string title, string metadataUri)
        {
            ExecutionEngine.Assert(aaContract != null && aaContract != UInt160.Zero, "AA contract required");
            ExecutionEngine.Assert(accountId != null && accountId != UInt160.Zero, "Account id required");
            ExecutionEngine.Assert(price >= MinListingPrice, "Price below minimum");
            ExecutionEngine.Assert(price <= MaxListingPrice, "Price exceeds maximum");
            ValidateListingText(title, metadataUri);

            UInt160 seller = RequireBackupOwner(aaContract!, accountId!);
            ExecutionEngine.Assert(Runtime.CheckWitness(seller), "Seller witness required");

            BigInteger listingId = AllocateListingId();
            Listing listing = new Listing
            {
                Id = listingId,
                AAContract = aaContract!,
                AccountId = accountId!,
                Seller = seller,
                Price = price,
                Title = title ?? "",
                MetadataUri = metadataUri ?? "",
                Status = StatusActive,
                Buyer = UInt160.Zero,
                CreatedAt = Runtime.Time,
                UpdatedAt = Runtime.Time
            };

            Contract.Call(aaContract!, "enterMarketEscrow", CallFlags.All, new object[] { accountId!, Runtime.ExecutingScriptHash, listingId });
            PutListing(listing);
        }

        public static void UpdateListingPrice(BigInteger listingId, BigInteger newPrice)
        {
            ExecutionEngine.Assert(newPrice >= MinListingPrice, "Price below minimum");
            ExecutionEngine.Assert(newPrice <= MaxListingPrice, "Price exceeds maximum");
            Listing listing = GetExistingListing(listingId);
            ExecutionEngine.Assert(listing.Status == StatusActive, "Listing not active");
            ExecutionEngine.Assert(Runtime.CheckWitness(listing.Seller), "Seller witness required");

            listing.Price = newPrice;
            listing.UpdatedAt = Runtime.Time;
            PutListing(listing);
        }

        public static void CancelListing(BigInteger listingId)
        {
            Listing listing = GetExistingListing(listingId);
            ExecutionEngine.Assert(listing.Status == StatusActive, "Listing not active");
            ExecutionEngine.Assert(Runtime.CheckWitness(listing.Seller), "Seller witness required");

            Contract.Call(listing.AAContract, "cancelMarketEscrow", CallFlags.All, new object[] { listing.AccountId, listingId });

            listing.Status = StatusCancelled;
            listing.UpdatedAt = Runtime.Time;
            PutListing(listing);
        }

        public static void SettleListing(BigInteger listingId, UInt160 payer, UInt160 newBackupOwner)
        {
            Listing listing = GetExistingListing(listingId);
            ExecutionEngine.Assert(listing.Status == StatusActive, "Listing not active");
            ExecutionEngine.Assert(payer != null && payer != UInt160.Zero, "Payer required");
            ExecutionEngine.Assert(Runtime.CheckWitness(payer!), "Payer witness required");
            ExecutionEngine.Assert(newBackupOwner != null && newBackupOwner != UInt160.Zero, "New backup owner required");

            BigInteger pendingPayment = GetPendingPayment(listingId, payer!);
            ExecutionEngine.Assert(pendingPayment == listing.Price, "Pending payment mismatch");
            ClearPendingPayment(listingId, payer!);

            ExecutionEngine.Assert(
                GAS.Transfer(Runtime.ExecutingScriptHash, listing.Seller, listing.Price, (ByteString)new byte[0]),
                "Seller payout failed");

            Contract.Call(
                listing.AAContract,
                "settleMarketEscrow",
                CallFlags.All,
                new object[] { listing.AccountId, listingId, newBackupOwner! });

            listing.Status = StatusSold;
            listing.Buyer = payer!;
            listing.UpdatedAt = Runtime.Time;
            PutListing(listing);
        }

        public static void RefundPendingPayment(BigInteger listingId, UInt160 payer)
        {
            ExecutionEngine.Assert(payer != null && payer != UInt160.Zero, "Payer required");
            ExecutionEngine.Assert(Runtime.CheckWitness(payer!), "Payer witness required");

            BigInteger pendingPayment = GetPendingPayment(listingId, payer!);
            ExecutionEngine.Assert(pendingPayment > 0, "No pending payment");

            ClearPendingPayment(listingId, payer!);
            ExecutionEngine.Assert(
                GAS.Transfer(Runtime.ExecutingScriptHash, payer!, pendingPayment, (ByteString)new byte[0]),
                "Refund failed");
        }

        public static void OnNEP17Payment(UInt160 from, BigInteger amount, object data)
        {
            if (Runtime.CallingScriptHash != GAS.Hash)
            {
                if (from == Runtime.ExecutingScriptHash) return;
                ExecutionEngine.Assert(false, "Only GAS accepted");
                return;
            }

            if (from == Runtime.ExecutingScriptHash) return;
            ExecutionEngine.Assert(amount > 0, "Invalid amount");

            BigInteger listingId = ParseListingId(data);
            Listing listing = GetExistingListing(listingId);
            ExecutionEngine.Assert(listing.Status == StatusActive, "Listing not active");
            ExecutionEngine.Assert(amount == listing.Price, "Payment must equal listing price");
            ExecutionEngine.Assert(GetPendingPayment(listingId, from) == 0, "Pending payment already exists");

            PutPendingPayment(listingId, from, amount);
        }

        [Safe]
        public static BigInteger GetListingCount()
        {
            ByteString? current = Storage.Get(Storage.CurrentContext, Prefix_NextListingId);
            if (current == null) return 0;
            BigInteger next = (BigInteger)current;
            return next <= 1 ? 0 : next - 1;
        }

        [Safe]
        public static object[] GetListing(BigInteger listingId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, ListingKey(listingId));
            if (data == null) return new object[] { };

            Listing listing = (Listing)StdLib.Deserialize(data!);
            return new object[]
            {
                listing.Id,
                listing.AAContract,
                listing.AccountId,
                listing.Seller,
                listing.Price,
                listing.Title,
                listing.MetadataUri,
                listing.Status,
                listing.Buyer,
                listing.CreatedAt,
                listing.UpdatedAt
            };
        }

        [Safe]
        public static BigInteger GetPendingPaymentOf(BigInteger listingId, UInt160 payer)
        {
            return GetPendingPayment(listingId, payer);
        }

        private static void ValidateListingText(string title, string metadataUri)
        {
            string safeTitle = title ?? "";
            string safeMetadataUri = metadataUri ?? "";
            ExecutionEngine.Assert(safeTitle.Length <= MaxTitleLength, "Title too long");
            ExecutionEngine.Assert(safeMetadataUri.Length <= MaxMetadataUriLength, "Metadata URI too long");
        }

        private static UInt160 RequireBackupOwner(UInt160 aaContract, UInt160 accountId)
        {
            UInt160 backupOwner = (UInt160)Contract.Call(aaContract, "getBackupOwner", CallFlags.ReadOnly, new object[] { accountId });
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "Backup owner not configured");
            return backupOwner!;
        }

        private static BigInteger AllocateListingId()
        {
            ByteString? current = Storage.Get(Storage.CurrentContext, Prefix_NextListingId);
            BigInteger next = current == null ? 1 : (BigInteger)current;
            Storage.Put(Storage.CurrentContext, Prefix_NextListingId, next + 1);
            return next;
        }

        private static Listing GetExistingListing(BigInteger listingId)
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, ListingKey(listingId));
            ExecutionEngine.Assert(data != null, "Listing not found");
            return (Listing)StdLib.Deserialize(data!);
        }

        private static void PutListing(Listing listing)
        {
            Storage.Put(Storage.CurrentContext, ListingKey(listing.Id), StdLib.Serialize(listing));
        }

        private static byte[] ListingKey(BigInteger listingId)
        {
            return Helper.Concat(Prefix_Listing, listingId.ToByteArray());
        }

        private static byte[] PendingPaymentKey(BigInteger listingId, UInt160 payer)
        {
            byte[] key = Helper.Concat(Prefix_PendingPayment, listingId.ToByteArray());
            return Helper.Concat(key, (byte[])payer);
        }

        private static void PutPendingPayment(BigInteger listingId, UInt160 payer, BigInteger amount)
        {
            Storage.Put(Storage.CurrentContext, PendingPaymentKey(listingId, payer), amount);
        }

        private static BigInteger GetPendingPayment(BigInteger listingId, UInt160 payer)
        {
            ByteString? pending = Storage.Get(Storage.CurrentContext, PendingPaymentKey(listingId, payer));
            return pending == null ? 0 : (BigInteger)pending;
        }

        private static void ClearPendingPayment(BigInteger listingId, UInt160 payer)
        {
            Storage.Delete(Storage.CurrentContext, PendingPaymentKey(listingId, payer));
        }

        private static BigInteger ParseListingId(object data)
        {
            ExecutionEngine.Assert(data != null, "Listing id required");

            if (data is BigInteger bigInteger)
            {
                ExecutionEngine.Assert(bigInteger > 0, "Listing id required");
                return bigInteger;
            }

            if (data is ByteString raw)
            {
                ExecutionEngine.Assert(raw.Length > 0, "Listing id required");
                BigInteger listingId = (BigInteger)raw;
                ExecutionEngine.Assert(listingId > 0, "Listing id required");
                return listingId;
            }

            ExecutionEngine.Assert(false, "Listing id required");
            return 0;
        }
    }
}
