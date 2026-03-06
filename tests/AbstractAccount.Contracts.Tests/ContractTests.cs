using System.Collections.Generic;
using System.IO;
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

    [TestMethod]
    public void ProxyWitnessScriptGateIgnoresSyscallBytesInsidePushData()
    {
        var embeddedSyscallBytes = new byte[] { 0x41, 0x62, 0x7D, 0x5B, 0x52 };
        var script = BuildSelfCallScript(Contract.Hash, "getAdminThreshold", embeddedSyscallBytes);

        Assert.IsTrue(global::AbstractAccount.UnifiedSmartWallet.IsSingleSelfCallScript(script, Contract.Hash.ToArray()));
    }

    [TestMethod]
    public void StorageKeyPrefixesShortIdsToAvoidLegacyCollisions()
    {
        var shortAccountId = new byte[] { 0xAA, 0xBB, 0xCC, 0xDD };
        var storageKey = global::AbstractAccount.UnifiedSmartWallet.GetCanonicalStorageKeyBytes(shortAccountId);

        CollectionAssert.AreNotEqual(shortAccountId, storageKey);
        Assert.AreEqual(shortAccountId.Length + 1, storageKey.Length);
    }

    [TestMethod]
    public void SelfCallAuthorizationUsesMixedSignatureChecks()
    {
        var adminSource = ReadRepoFile("contracts/AbstractAccount.Admin.cs");
        var oracleSource = ReadRepoFile("contracts/AbstractAccount.Oracle.cs");

        StringAssert.Contains(adminSource, "CheckMixedSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), explicitSigners)");
        StringAssert.Contains(adminSource, "CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners)");
        StringAssert.DoesNotMatch(adminSource, new System.Text.RegularExpressions.Regex("CheckExplicitSignatures\\(GetAdmins\\(accountId\\), GetAdminThreshold\\(accountId\\), explicitSigners\\)"));

        StringAssert.Contains(oracleSource, "CheckMixedSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), explicitSigners)");
        StringAssert.Contains(oracleSource, "CheckMixedSignatures(GetManagers(accountId), GetManagerThreshold(accountId), explicitSigners)");
        StringAssert.Contains(oracleSource, "CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners)");
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

    private static string ReadRepoFile(string relativePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../", relativePath));
        return File.ReadAllText(fullPath);
    }

}
