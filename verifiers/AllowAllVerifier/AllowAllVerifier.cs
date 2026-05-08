using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System.ComponentModel;

namespace AllowAllVerifierContract
{
    [DisplayName("AllowAllVerifier")]
    [ManifestExtra("Author", "R3E Network")]
    [ContractPermission("*", "*")]
    public class AllowAllVerifier : SmartContract
    {
        private static readonly byte[] Prefix_Admin = new byte[] { 0xF0 };

        public static void _deploy(object data, bool update)
        {
            if (update) return;
            Storage.Put(Storage.CurrentContext, Prefix_Admin, Runtime.Transaction.Sender);
        }

        [Safe]
        public static UInt160 Admin()
        {
            ByteString? data = Storage.Get(Storage.CurrentContext, Prefix_Admin);
            return data == null ? UInt160.Zero : (UInt160)data;
        }

        public static void Update(ByteString nef, string manifest)
        {
            ValidateAdmin();
            ContractManagement.Update(nef, manifest);
        }

        public static bool VerifyExecution(ByteString accountId)
        {
            return accountId != null && accountId.Length > 0;
        }

        public static bool VerifyExecutionMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            return accountId != null && accountId.Length > 0 && signerHashes != null && signerHashes.Length > 0;
        }

        public static bool VerifyAdmin(ByteString accountId)
        {
            return VerifyExecution(accountId);
        }

        public static bool VerifyAdminMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            return VerifyExecutionMetaTx(accountId, signerHashes);
        }

        public static bool Verify(ByteString accountId)
        {
            return VerifyExecution(accountId);
        }

        public static bool VerifyMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            return VerifyExecutionMetaTx(accountId, signerHashes);
        }

        private static void ValidateAdmin()
        {
            UInt160 admin = Admin();
            ExecutionEngine.Assert(admin != UInt160.Zero && admin.IsValid, "Admin not set");
            ExecutionEngine.Assert(Runtime.CheckWitness(admin), "Unauthorized admin");
        }
    }
}
