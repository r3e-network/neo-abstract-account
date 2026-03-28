using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount.Hooks
{
    internal static class HookAuthority
    {
        private static readonly byte[] Prefix_Admin = new byte[] { 0xF0 };
        private static readonly byte[] Prefix_AuthorizedCore = new byte[] { 0xF1 };

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

        internal static void ValidateAdminCaller()
        {
            ValidateAdmin();
        }

        internal static void ValidateConfigCaller(UInt160 accountId, UInt160 hookContract)
        {
            UInt160 core = AuthorizedCore();
            ExecutionEngine.Assert(core != UInt160.Zero && core.IsValid, "AA core not configured");
            ExecutionEngine.Assert(Runtime.CallingScriptHash == core, "Unauthorized caller");

            bool authorized = (bool)Contract.Call(
                core,
                "canConfigureHook",
                CallFlags.ReadOnly,
                new object[] { accountId, hookContract });
            ExecutionEngine.Assert(authorized, "Unauthorized");
        }

        internal static void ValidateExecutionCaller(UInt160 accountId, UInt160 callerContract, UInt160 hookContract)
        {
            UInt160 core = AuthorizedCore();
            ExecutionEngine.Assert(core != UInt160.Zero && core.IsValid, "AA core not configured");

            bool authorized = (bool)Contract.Call(
                core,
                "canExecuteHook",
                CallFlags.ReadOnly,
                new object[] { accountId, callerContract, hookContract });
            ExecutionEngine.Assert(authorized, "Unauthorized");
        }

        internal static void RotateAdmin(UInt160 newAdmin)
        {
            ValidateAdmin();
            ExecutionEngine.Assert(newAdmin != null && newAdmin.IsValid, "Invalid admin");
            Storage.Put(Storage.CurrentContext, Prefix_Admin, (byte[])newAdmin!);
        }

        private static void ValidateAdmin()
        {
            UInt160 admin = Admin();
            ExecutionEngine.Assert(admin != UInt160.Zero && admin.IsValid, "Admin not set");
            ExecutionEngine.Assert(Runtime.CheckWitness(admin), "Unauthorized admin");
        }
    }
}
