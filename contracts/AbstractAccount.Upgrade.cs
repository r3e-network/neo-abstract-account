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
            UInt160 deployer = (UInt160)Storage.Get(Storage.CurrentContext, DeployerKey);
            ExecutionEngine.Assert(Runtime.CheckWitness(deployer), "Not Deployer");
            ContractManagement.Update(nefFile, manifest, null);
        }
    }
}
