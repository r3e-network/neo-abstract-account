using System.Collections.Generic;
using System.Numerics;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Neo;
using Neo.Extensions;
using Neo.Network.P2P.Payloads;
using Neo.SmartContract;
using Neo.SmartContract.Testing;
using Neo.SmartContract.Testing.TestingStandards;
using Neo.VM;

namespace AbstractAccount.Contracts.Tests;

[TestClass]
public class ContractTests : TestBase<UnifiedSmartWalletV2>
{
    protected override TestEngine CreateTestEngine()
    {
        var engine = base.CreateTestEngine();
        engine.SetTransactionSigners(WitnessScope.Global, engine.ValidatorsAddress);
        engine.Fee = 1_000_000_000_000;
        engine.Transaction.SystemFee = 1_000_000_000_000;
        return engine;
    }

    [TestMethod]
    public void ContractHarnessBootstraps()
    {
        Assert.IsNotNull(Contract);
        Assert.IsNotNull(Manifest);
        Assert.AreEqual("UnifiedSmartWalletV2", Manifest.Name);
    }

    [TestMethod]
    public void CreateAccountStoresAdminThresholdForAuthorizedSigner()
    {
        var accountId = new byte[] { 0x01, 0x02, 0x03, 0x04 };

        Engine.SetTransactionSigners(Alice);
        Contract.CreateAccount(accountId, new List<object> { Alice.Account }, 1, new List<object>(), 0);

        Assert.AreEqual(1, Contract.GetAdminThreshold(accountId));
        Assert.AreEqual(1, Contract.GetAdmins(accountId)?.Count);
    }

    [TestMethod]
    public void ProxyWitnessScriptGateRejectsDirectExternalContractCall()
    {
        var externalContract = UInt160.Parse("0x1111111111111111111111111111111111111111");
        var from = UInt160.Parse("0x2222222222222222222222222222222222222222");
        var to = UInt160.Parse("0x3333333333333333333333333333333333333333");

        var script = BuildTransferScript(externalContract, from, to, 100);

        Assert.IsFalse(global::AbstractAccount.UnifiedSmartWallet.IsSingleSelfCallScript(script, Contract.Hash.ToArray()));
    }

    [TestMethod]
    public void ProxyWitnessScriptGateAllowsSingleWalletSelfCall()
    {
        var script = BuildSelfCallScript(Contract.Hash, "getAdminThreshold", new byte[] { 0x50, 0x60, 0x70, 0x80 });

        Assert.IsTrue(global::AbstractAccount.UnifiedSmartWallet.IsSingleSelfCallScript(script, Contract.Hash.ToArray()));
    }

    private static byte[] BuildTransferScript(UInt160 targetContract, UInt160 from, UInt160 to, BigInteger amount)
    {
        using var sb = new ScriptBuilder();
        sb.EmitDynamicCall(targetContract, "transfer", CallFlags.All, from, to, amount, null);
        return sb.ToArray();
    }

    private static byte[] BuildSelfCallScript(UInt160 walletHash, string method, params object[] args)
    {
        using var sb = new ScriptBuilder();
        sb.EmitDynamicCall(walletHash, method, CallFlags.All, args);
        return sb.ToArray();
    }
}
