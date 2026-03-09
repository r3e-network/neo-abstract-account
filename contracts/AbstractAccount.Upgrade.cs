using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Upgrade logic is intentionally tiny: only the original deployer may update the contract, and only through the
    // hardened self-call execution shape so an unrelated script cannot piggyback on the witness path.
    public partial class UnifiedSmartWallet
    {
        /// <summary>
        /// Performs a deployer-only contract update. The caller must satisfy both the stored deployer witness check and
        /// the hardened single-self-call script shape used by the wallet's proxy verification model.
        /// </summary>
        public static void Update(ByteString nefFile, string manifest)
        {
            AssertNoExternalMutationDuringAnyExecution();
            ExecutionEngine.Assert(IsSingleSelfCallScript((byte[])Runtime.Transaction.Script, (byte[])GetWalletContractHash()), "Unsafe update path");
            ByteString? deployerBytes = Storage.Get(Storage.CurrentContext, DeployerKey);
            ExecutionEngine.Assert(deployerBytes != null && deployerBytes.Length == 20, "Not Deployer");
            UInt160 deployer = (UInt160)deployerBytes!;
            ExecutionEngine.Assert(Runtime.CheckWitness(deployer), "Not Deployer");
            ContractManagement.Update(nefFile, manifest, null!);
        }
    }
}
