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
        private static readonly byte[] Prefix_ContractAdmin = new byte[] { 0x11 };

        // AA-D-01: the core contract upgrade is timelocked. A single admin key must not be
        // able to instantly replace the authorization logic of EVERY bound account — that
        // contradicts the timelocked plugin upgrades (UpdateHook/ConfirmHookUpdate) and the
        // verifier authority upgrades (VerifierAuthority.ProposeUpdate/Update). The admin
        // first proposes the sha256 of the new NEF and manifest, then can only apply that
        // exact artifact pair after a >= 7-day window, giving account owners an escape
        // window. These prefixes were never written by previous deployments.
        private static readonly byte[] Prefix_PendingUpdateNefHash = new byte[] { 0x12 };
        private static readonly byte[] Prefix_PendingUpdateManifestHash = new byte[] { 0x13 };
        private static readonly byte[] Prefix_UpdateTimelock = new byte[] { 0x14 };
        private static readonly BigInteger MinUpgradeDelayMs = 7L * 24 * 60 * 60 * 1000;

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, Prefix_ContractAdmin, (ByteString)(byte[])Runtime.Transaction.Sender);
        }

        /// <summary>
        /// Proposes a timelocked contract upgrade by pinning the sha256 of the new NEF and
        /// manifest. The proposal can only be applied via <see cref="Update"/> after the
        /// 7-day window elapses, and only with the exact artifact pair that hashes to the
        /// pinned values. Re-proposing overwrites the pending proposal and restarts the window.
        /// </summary>
        public static void ProposeUpdate(UInt256 nefHash, UInt256 manifestHash)
        {
            ValidateAdmin();
            ExecutionEngine.Assert(nefHash != UInt256.Zero && nefHash.IsValid, "Invalid NEF hash");
            ExecutionEngine.Assert(manifestHash != UInt256.Zero && manifestHash.IsValid, "Invalid manifest hash");
            Storage.Put(Storage.CurrentContext, Prefix_PendingUpdateNefHash, (byte[])nefHash);
            Storage.Put(Storage.CurrentContext, Prefix_PendingUpdateManifestHash, (byte[])manifestHash);
            Storage.Put(Storage.CurrentContext, Prefix_UpdateTimelock, Runtime.Time);
        }

        /// <summary>Clears the pending upgrade proposal without applying it.</summary>
        public static void CancelUpdate()
        {
            ValidateAdmin();
            Storage.Delete(Storage.CurrentContext, Prefix_PendingUpdateNefHash);
            Storage.Delete(Storage.CurrentContext, Prefix_PendingUpdateManifestHash);
            Storage.Delete(Storage.CurrentContext, Prefix_UpdateTimelock);
        }

        /// <summary>
        /// Applies a previously proposed contract upgrade. Requires an existing proposal, the
        /// elapsed 7-day timelock, and that the supplied NEF/manifest hash to the pinned
        /// values. There is intentionally no instant upgrade path. The proposal is single-use:
        /// the next upgrade needs a fresh <see cref="ProposeUpdate"/> plus another window.
        /// </summary>
        public static void Update(ByteString nef, string manifest)
        {
            ValidateAdmin();
            ByteString? pendingNef = Storage.Get(Storage.CurrentContext, Prefix_PendingUpdateNefHash);
            ExecutionEngine.Assert(pendingNef != null, "No pending update");
            ByteString? pendingManifest = Storage.Get(Storage.CurrentContext, Prefix_PendingUpdateManifestHash);
            ExecutionEngine.Assert(pendingManifest != null, "No pending update");
            ByteString? timelockData = Storage.Get(Storage.CurrentContext, Prefix_UpdateTimelock);
            ExecutionEngine.Assert(timelockData != null, "No timelock set");
            ExecutionEngine.Assert(Runtime.Time >= (BigInteger)timelockData! + MinUpgradeDelayMs, "Update timelock not expired");
            ExecutionEngine.Assert((UInt256)CryptoLib.Sha256(nef) == (UInt256)pendingNef!, "NEF hash mismatch");
            ExecutionEngine.Assert((UInt256)CryptoLib.Sha256(manifest) == (UInt256)pendingManifest!, "Manifest hash mismatch");
            Storage.Delete(Storage.CurrentContext, Prefix_PendingUpdateNefHash);
            Storage.Delete(Storage.CurrentContext, Prefix_PendingUpdateManifestHash);
            Storage.Delete(Storage.CurrentContext, Prefix_UpdateTimelock);
            ContractManagement.Update(nef, manifest);
        }

        /// <summary>Alias for <see cref="Update"/>, mirroring the verifier/hook upgrade naming.</summary>
        public static void ConfirmUpdate(ByteString nef, string manifest)
        {
            Update(nef, manifest);
        }

        [Safe]
        public static UInt160 GetContractAdmin()
        {
            ByteString? val = Storage.Get(Storage.CurrentContext, Prefix_ContractAdmin);
            return val == null ? UInt160.Zero : (UInt160)val;
        }

        public static void TransferAdmin(UInt160 newAdmin)
        {
            ValidateAdmin();
            ExecutionEngine.Assert(newAdmin != null && newAdmin != UInt160.Zero, "Invalid admin");
            Storage.Put(Storage.CurrentContext, Prefix_ContractAdmin, (ByteString)(byte[])newAdmin!);
        }

        private static void ValidateAdmin()
        {
            ByteString? admin = Storage.Get(Storage.CurrentContext, Prefix_ContractAdmin);
            ExecutionEngine.Assert(admin != null, "No admin set");
            UInt160 adminHash = (UInt160)admin!;
            ExecutionEngine.Assert(Runtime.CheckWitness(adminHash), "Not admin");
        }
    }
}
