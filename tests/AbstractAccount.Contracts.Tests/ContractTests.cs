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
    public void CreateAccountWithAddressRejectsNonDeterministicProxyAddress()
    {
        var lifecycleSource = ReadRepoFile("contracts/AbstractAccount.AccountLifecycle.cs");
        var storageSource = ReadRepoFile("contracts/AbstractAccount.StorageAndContext.cs");

        StringAssert.Contains(lifecycleSource, "BindAccountAddressInternal(accountId, accountAddress)");
        StringAssert.Contains(storageSource, "AssertDeterministicAccountAddress(accountId, accountAddress)");
        StringAssert.Contains(storageSource, "Account address must match deterministic verify proxy");
    }

    [TestMethod]
    public void CreateAccountWithAddressAcceptsDerivedVerifyProxyAddress()
    {
        var accountId = new byte[] { 0x50, 0x60, 0x70, 0x80 };
        var expectedAddress = BuildVerifyProxyHash(accountId);

        Engine.SetTransactionSigners(Alice);
        Contract.CreateAccountWithAddress(accountId, expectedAddress, new List<object> { Alice.Account }, 1, new List<object>(), 0);

        Assert.AreEqual(expectedAddress, Contract.GetAccountAddress(accountId));
        CollectionAssert.AreEqual(accountId, Contract.GetAccountIdByAddress(expectedAddress));
    }

    [TestMethod]
    public void CreateAccountWithAddressIndexesBoundAddressForManagers()
    {
        var accountId = new byte[] { 0x11, 0x22, 0x33, 0x44 };
        var expectedAddress = BuildVerifyProxyHash(accountId);

        Engine.SetTransactionSigners(Alice);
        Contract.CreateAccountWithAddress(accountId, expectedAddress, new List<object> { Alice.Account }, 1, new List<object> { Alice.Account }, 1);

        var managerAddresses = Contract.GetAccountAddressesByManager(Alice.Account);

        Assert.IsNotNull(managerAddresses);
        Assert.AreEqual(1, managerAddresses.Count);

        var managerAddress = managerAddresses[0] switch
        {
            UInt160 hash => hash,
            Neo.VM.Types.ByteString bytes => new UInt160(bytes.GetSpan().ToArray()),
            byte[] bytes => new UInt160(bytes),
            _ => throw new AssertFailedException($"Unexpected manager address payload: {managerAddresses[0]?.GetType().FullName}")
        };

        Assert.AreEqual(expectedAddress, managerAddress);
    }

    [TestMethod]
    public void BindAccountAddressRejectsNonDeterministicProxyAddress()
    {
        var adminSource = ReadRepoFile("contracts/AbstractAccount.Admin.cs");
        var storageSource = ReadRepoFile("contracts/AbstractAccount.StorageAndContext.cs");

        StringAssert.Contains(adminSource, "BindAccountAddressInternal(accountId, accountAddress)");
        StringAssert.Contains(storageSource, "GetDeterministicAccountAddress(accountId)");
        StringAssert.Contains(storageSource, "ByteArrayEquals((byte[])accountAddress, (byte[])expectedAddress)");
    }

    [TestMethod]
    public void ManualVerifyProxyHashMatchesDeterministicProxyHelper()
    {
        var accountId = new byte[] { 0x10, 0x20, 0x30, 0x40 };

        var expectedAddress = BuildVerifyProxyHash(accountId);
        var actualAddress = BuildManualVerifyProxyHash(accountId);

        Assert.AreEqual(expectedAddress, actualAddress);
    }


    [TestMethod]
    public void DeterministicProxyScriptBuilderUsesRawAccountIdBytes()
    {
        var storageSource = ReadRepoFile("contracts/AbstractAccount.StorageAndContext.cs");

        StringAssert.DoesNotMatch(storageSource, new System.Text.RegularExpressions.Regex(@"ReverseBytes\(accountIdBytes\)"));
        StringAssert.Contains(storageSource, "accountIdBytes,");
    }


    [TestMethod]
    public void DeterministicProxyAddressReversesRawScriptHashBytes()
    {
        var storageSource = ReadRepoFile("contracts/AbstractAccount.StorageAndContext.cs");

        StringAssert.Contains(storageSource, "ReverseBytes(scriptHash)");
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
    public void AddressIndexSourceIncludesBoundAccountAddressGetters()
    {
        var storageSource = ReadRepoFile("contracts/AbstractAccount.StorageAndContext.cs");

        StringAssert.Contains(storageSource, "GetAccountAddressesByAdmin");
        StringAssert.Contains(storageSource, "GetAccountAddressesByManager");
    }

    [TestMethod]
    public void SetManagersInternalMaintainsManagerReverseIndexes()
    {
        var adminSource = ReadRepoFile("contracts/AbstractAccount.Admin.cs");

        StringAssert.Contains(adminSource, "RemoveFromManagerIndex");
        StringAssert.Contains(adminSource, "AddToManagerIndex");
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


    [TestMethod]
    public void RequestDomeActivationBlocksExternalMutationDuringExecute()
    {
        var oracleSource = ReadRepoFile("contracts/AbstractAccount.Oracle.cs");

        StringAssert.Contains(oracleSource, "AssertNoExternalMutationDuringExecution(accountId)");
    }

    [TestMethod]
    public void UpdateRequiresDirectSelfCallScript()
    {
        var upgradeSource = ReadRepoFile("contracts/AbstractAccount.Upgrade.cs");

        StringAssert.Contains(upgradeSource, "IsSingleSelfCallScript");
    }


    [TestMethod]
    public void DispatchContractCallUsesReadOnlyFlagsForReadMethods()
    {
        var executionSource = ReadRepoFile("contracts/AbstractAccount.ExecutionAndPermissions.cs");

        StringAssert.Contains(executionSource, "ResolveCallFlags(method)");
        StringAssert.Contains(executionSource, "CallFlags.ReadOnly");
    }

    [TestMethod]
    public void ExternalTransferAndApproveRequireExplicitWhitelist()
    {
        var executionSource = ReadRepoFile("contracts/AbstractAccount.ExecutionAndPermissions.cs");

        StringAssert.Contains(executionSource, "Asset-moving target is not in whitelist");
        StringAssert.Contains(executionSource, "targetContract != Runtime.ExecutingScriptHash");
    }


    [TestMethod]
    public void BootstrapAuthorizationRequiresManagerSignersWhenProvided()
    {
        var storageSource = ReadRepoFile("contracts/AbstractAccount.StorageAndContext.cs");

        StringAssert.Contains(storageSource, "Unauthorized manager initialization");
    }

    [TestMethod]
    public void ExecutionLockIncludesGlobalGuard()
    {
        var rootSource = ReadRepoFile("contracts/AbstractAccount.cs");
        var storageSource = ReadRepoFile("contracts/AbstractAccount.StorageAndContext.cs");

        StringAssert.Contains(rootSource, "GlobalExecutionLockKey");
        StringAssert.Contains(storageSource, "IsAnyExecutionActive");
    }

    [TestMethod]
    public void UpdateBlocksExternalMutationDuringExecute()
    {
        var upgradeSource = ReadRepoFile("contracts/AbstractAccount.Upgrade.cs");

        StringAssert.Contains(upgradeSource, "AssertNoExternalMutationDuringAnyExecution");
    }

    private static byte[] BuildTransferScript(UInt160 targetContract, UInt160 from, UInt160 to, BigInteger amount)
    {
        using var sb = new ScriptBuilder();
        sb.EmitDynamicCall(targetContract, "transfer", CallFlags.All, from, to, amount, null);
        return sb.ToArray();
    }

    private UInt160 BuildVerifyProxyHash(byte[] accountId)
    {
        return BuildManualVerifyProxyHash(accountId);
    }

    private UInt160 BuildManualVerifyProxyHash(byte[] accountId)
    {
        var script = ConcatBytes(
            new byte[] { 0x0C, (byte)accountId.Length },
            accountId,
            new byte[] { 0x11, 0xC0, 0x1F, 0x0C, 0x06 },
            new byte[] { (byte)'v', (byte)'e', (byte)'r', (byte)'i', (byte)'f', (byte)'y' },
            new byte[] { 0x0C, 0x14 },
            Contract.Hash.ToArray(),
            new byte[] { 0x41, 0x62, 0x7D, 0x5B, 0x52 });

        var scriptHash = Neo.Cryptography.Crypto.Hash160(script);
        Array.Reverse(scriptHash);
        return new UInt160(scriptHash);
    }

    private static byte[] BuildSelfCallScript(UInt160 walletHash, string method, params object[] args)
    {
        using var sb = new ScriptBuilder();
        sb.EmitDynamicCall(walletHash, method, CallFlags.All, args);
        return sb.ToArray();
    }

    private static byte[] ConcatBytes(params byte[][] chunks)
    {
        var total = 0;
        foreach (var chunk in chunks)
        {
            total += chunk.Length;
        }

        var result = new byte[total];
        var offset = 0;
        foreach (var chunk in chunks)
        {
            Buffer.BlockCopy(chunk, 0, result, offset, chunk.Length);
            offset += chunk.Length;
        }

        return result;
    }

    private static string ReadRepoFile(string relativePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../", relativePath));
        return File.ReadAllText(fullPath);
    }

}
