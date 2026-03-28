using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private const string AccountImplementationId = "org.r3e.neo.aa.unified-smart-wallet.v3";

        private static AccountState GetAccountState(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            ExecutionEngine.Assert(data != null, "Account not found");
            return (AccountState)StdLib.Deserialize(data!);
        }

        [Safe]
        public static string GetAccountImplementationId()
        {
            return AccountImplementationId;
        }

        [Safe]
        public static bool SupportsExecutionMode(string mode)
        {
            return mode == "single" || mode == "batch" || mode == "batch-atomic";
        }

        [Safe]
        public static bool SupportsModuleType(string moduleType)
        {
            return moduleType == "validator" || moduleType == "verifier" || moduleType == "hook";
        }

        [Safe]
        public static bool IsModuleInstalled(UInt160 accountId, string moduleType, UInt160 moduleHash)
        {
            if (moduleHash == null || moduleHash == UInt160.Zero) return false;

            AccountState state = GetAccountState(accountId);
            if (moduleType == "validator" || moduleType == "verifier")
            {
                return state.Verifier == moduleHash;
            }

            if (moduleType == "hook")
            {
                return state.HookId == moduleHash;
            }

            return false;
        }

        [Safe]
        public static UInt160 GetVerifier(UInt160 accountId)
        {
            return GetAccountState(accountId).Verifier;
        }

        [Safe]
        public static UInt160 GetHook(UInt160 accountId)
        {
            return GetAccountState(accountId).HookId;
        }

        [Safe]
        public static UInt160 GetBackupOwner(UInt160 accountId)
        {
            return GetAccountState(accountId).BackupOwner;
        }

        [Safe]
        public static uint GetEscapeTimelock(UInt160 accountId)
        {
            return GetAccountState(accountId).EscapeTimelock;
        }

        [Safe]
        public static BigInteger GetEscapeTriggeredAt(UInt160 accountId)
        {
            return GetAccountState(accountId).EscapeTriggeredAt;
        }

        [Safe]
        public static UInt160 GetMarketEscrowContract(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_MarketEscrowContract, (byte[])accountId);
            ByteString? market = Storage.Get(Storage.CurrentContext, key);
            return market == null ? UInt160.Zero : (UInt160)market;
        }

        [Safe]
        public static BigInteger GetMarketEscrowListingId(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_MarketEscrowListing, (byte[])accountId);
            ByteString? listing = Storage.Get(Storage.CurrentContext, key);
            return listing == null ? 0 : (BigInteger)listing;
        }

        [Safe]
        public static bool IsMarketEscrowActive(UInt160 accountId)
        {
            return GetMarketEscrowContract(accountId) != UInt160.Zero && GetMarketEscrowListingId(accountId) > 0;
        }

        [Safe]
        public static bool IsEscapeActive(UInt160 accountId)
        {
            return GetAccountState(accountId).EscapeTriggeredAt > 0;
        }

        [Safe]
        public static BigInteger GetNonce(UInt160 accountId, BigInteger channel)
        {
            byte[] key = Helper.Concat(Prefix_Nonce, (byte[])accountId);
            key = Helper.Concat(key, channel.ToByteArray());

            ByteString? currentData = Storage.Get(Storage.CurrentContext, key);
            return currentData == null ? 0 : (BigInteger)currentData;
        }

        [Safe]
        public static ByteString ComputeArgsHash(object[] args)
        {
            ByteString serialized = (ByteString)StdLib.Serialize(args);
            return (ByteString)Contract.Call(
                Neo.SmartContract.Framework.Native.CryptoLib.Hash,
                "keccak256",
                CallFlags.ReadOnly,
                new object[] { serialized });
        }

        [Safe]
        public static bool HasPendingVerifierUpdate(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId);
            return Storage.Get(Storage.CurrentContext, key) != null;
        }

        [Safe]
        public static bool HasPendingHookUpdate(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId);
            return Storage.Get(Storage.CurrentContext, key) != null;
        }

        [Safe]
        public static BigInteger GetPendingVerifierUpdateTime(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return 0;
            PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(data!);
            return pending.InitiatedAt + ConfigUpdateTimelockSeconds;
        }

        [Safe]
        public static BigInteger GetPendingHookUpdateTime(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            if (data == null) return 0;
            PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(data!);
            return pending.InitiatedAt + ConfigUpdateTimelockSeconds;
        }

        /// <summary>
        /// Cancels a pending verifier update.
        /// </summary>
        public static void CancelVerifierUpdate(UInt160 accountId)
        {
            AssertBackupOwner(accountId);
            byte[] key = Helper.Concat(Prefix_PendingVerifierUpdate, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            Storage.Delete(Storage.CurrentContext, key);
            if (data != null)
            {
                PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(data!);
                OnModuleUpdateCancelled?.Invoke(accountId, ModuleTypeVerifier, pending.NewVerifier);
            }
            OnVerifierUpdateCancelled?.Invoke(accountId);
        }

        /// <summary>
        /// Cancels a pending hook update.
        /// </summary>
        public static void CancelHookUpdate(UInt160 accountId)
        {
            AssertBackupOwner(accountId);
            byte[] key = Helper.Concat(Prefix_PendingHookUpdate, (byte[])accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            Storage.Delete(Storage.CurrentContext, key);
            if (data != null)
            {
                PendingConfigUpdate pending = (PendingConfigUpdate)StdLib.Deserialize(data!);
                OnModuleUpdateCancelled?.Invoke(accountId, ModuleTypeHook, pending.NewHookId);
            }
            OnHookUpdateCancelled?.Invoke(accountId);
        }

        /// <summary>
        /// Sets the off-chain metadata URI for an account. Deletes the key if cleared.
        /// </summary>
        public static void SetMetadataUri(UInt160 accountId, string metadataUri)
        {
            AssertBackupOwner(accountId);
            byte[] key = Helper.Concat(Prefix_MetadataUri, (byte[])accountId);
            if (metadataUri == null || metadataUri.Length == 0)
            {
                Storage.Delete(Storage.CurrentContext, key);
                return;
            }

            ExecutionEngine.Assert(metadataUri.Length <= MaxMetadataUriLength, "MetadataUri too long");
            Storage.Put(Storage.CurrentContext, key, metadataUri);
            OnMetadataUriUpdated?.Invoke(accountId, metadataUri);
        }

        /// <summary>
        /// Returns the off-chain metadata URI for an account, or empty string if unset.
        /// </summary>
        [Safe]
        public static string GetMetadataUri(UInt160 accountId)
        {
            byte[] key = Helper.Concat(Prefix_MetadataUri, (byte[])accountId);
            ByteString? uri = Storage.Get(Storage.CurrentContext, key);
            return uri == null ? string.Empty : (string)uri;
        }
    }
}
