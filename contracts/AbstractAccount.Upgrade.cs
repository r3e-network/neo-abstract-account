using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        public static void Update(ByteString nefFile, string manifest)
        {
            ByteString? deployerBytes = Storage.Get(Storage.CurrentContext, DeployerKey);
            ExecutionEngine.Assert(deployerBytes != null && deployerBytes.Length == 20, "Not Deployer");
            UInt160 deployer = (UInt160)deployerBytes!;
            ExecutionEngine.Assert(Runtime.CheckWitness(deployer), "Not Deployer");
            ContractManagement.Update(nefFile, manifest, null!);
        }
    }
}
