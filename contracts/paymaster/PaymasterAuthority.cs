using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    internal static class PaymasterAuthority
    {
        private static readonly byte[] Prefix_Admin = new byte[] { 0xD0 };
        private static readonly byte[] Prefix_AuthorizedCore = new byte[] { 0xD1 };
        private static readonly byte[] Prefix_PendingAdmin = new byte[] { 0xD2 };
        private static readonly byte[] Prefix_AdminRotationTimelock = new byte[] { 0xD3 };
        private static readonly BigInteger AdminRotationTimelockSeconds = 604800; // 7 days

        internal static void Initialize(object data, bool update)
        {
            if (update) return;

            Storage.Put(Storage.CurrentContext, Prefix_Admin, Runtime.Transaction.Sender);

            if (data is byte[] rawCore && rawCore.Length == 20)
            {
                Storage.Put(Storage.CurrentContext, Prefix_AuthorizedCore, rawCore);
                return;
            }

            if (data is ByteString rawCoreByteString && rawCoreByteString.Length == 20)
            {
                Storage.Put(Storage.CurrentContext, Prefix_AuthorizedCore, (byte[])rawCoreByteString);
            }
        }

        internal static UInt160 AuthorizedCore()
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Prefix_AuthorizedCore);
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        internal static UInt160 Admin()
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Prefix_Admin);
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        internal static void SetAuthorizedCore(UInt160 coreContract)
        {
            ValidateAdmin();
            ExecutionEngine.Assert(coreContract != UInt160.Zero && coreContract.IsValid, "Invalid core contract");
            Storage.Put(Storage.CurrentContext, Prefix_AuthorizedCore, (byte[])coreContract);
        }

        internal static void ValidateCoreCaller()
        {
            UInt160 core = AuthorizedCore();
            ExecutionEngine.Assert(core != UInt160.Zero && core.IsValid, "AA core not configured");
            ExecutionEngine.Assert(Runtime.CallingScriptHash == core, "Unauthorized caller");
        }

        internal static void RotateAdmin(UInt160 newAdmin)
        {
            ValidateAdmin();
            ExecutionEngine.Assert(newAdmin != null && newAdmin.IsValid, "Invalid admin");
            ExecutionEngine.Assert(newAdmin != Admin(), "New admin must differ from current");
            Storage.Put(Storage.CurrentContext, Prefix_PendingAdmin, (byte[])newAdmin!);
            Storage.Put(Storage.CurrentContext, Prefix_AdminRotationTimelock, Runtime.Time);
        }

        internal static void ConfirmAdminRotation(UInt160 newAdmin)
        {
            ByteString? pending = Storage.Get(Storage.CurrentContext, Prefix_PendingAdmin);
            ExecutionEngine.Assert(pending != null, "No pending admin rotation");

            ByteString? timelockData = Storage.Get(Storage.CurrentContext, Prefix_AdminRotationTimelock);
            ExecutionEngine.Assert(timelockData != null, "No timelock set");
            BigInteger timelockStart = (BigInteger)timelockData;
            ExecutionEngine.Assert(Runtime.Time >= timelockStart + AdminRotationTimelockSeconds, "Admin rotation timelock not expired");

            ExecutionEngine.Assert((UInt160)pending! == newAdmin, "Pending admin mismatch");
            ExecutionEngine.Assert(Runtime.CheckWitness(newAdmin), "New admin must confirm rotation");
            Storage.Put(Storage.CurrentContext, Prefix_Admin, (byte[])newAdmin);
            Storage.Delete(Storage.CurrentContext, Prefix_PendingAdmin);
            Storage.Delete(Storage.CurrentContext, Prefix_AdminRotationTimelock);
        }

        internal static void CancelAdminRotation()
        {
            ValidateAdmin();
            Storage.Delete(Storage.CurrentContext, Prefix_PendingAdmin);
            Storage.Delete(Storage.CurrentContext, Prefix_AdminRotationTimelock);
        }

        private static void ValidateAdmin()
        {
            UInt160 admin = Admin();
            ExecutionEngine.Assert(admin != UInt160.Zero && admin.IsValid, "Admin not set");
            ExecutionEngine.Assert(Runtime.CheckWitness(admin), "Unauthorized admin");
        }
    }
}
