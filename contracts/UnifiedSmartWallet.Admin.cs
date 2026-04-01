using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private static readonly byte[] Prefix_ContractAdmin = new byte[] { 0x0E };

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, Prefix_ContractAdmin, (ByteString)(byte[])Runtime.Transaction.Sender);
        }

        public static void Update(ByteString nef, string manifest)
        {
            ByteString admin = Storage.Get(Storage.CurrentContext, Prefix_ContractAdmin);
            ExecutionEngine.Assert(admin != null, "No admin set");
            ExecutionEngine.Assert(Runtime.CheckWitness((UInt160)admin), "Not admin");
            ContractManagement.Update(nef, manifest);
        }

        [Safe]
        public static UInt160 GetContractAdmin()
        {
            ByteString val = Storage.Get(Storage.CurrentContext, Prefix_ContractAdmin);
            return val == null ? UInt160.Zero : (UInt160)val;
        }

        public static void TransferAdmin(UInt160 newAdmin)
        {
            ByteString admin = Storage.Get(Storage.CurrentContext, Prefix_ContractAdmin);
            ExecutionEngine.Assert(admin != null, "No admin set");
            ExecutionEngine.Assert(Runtime.CheckWitness((UInt160)admin), "Not admin");
            ExecutionEngine.Assert(newAdmin != null && newAdmin != UInt160.Zero, "Invalid admin");
            Storage.Put(Storage.CurrentContext, Prefix_ContractAdmin, (ByteString)(byte[])newAdmin);
        }
    }
}
