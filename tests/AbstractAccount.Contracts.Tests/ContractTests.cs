using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace AbstractAccount.Contracts.Tests;

[TestClass]
public class ContractTests
{
    private static readonly string RepoRoot =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));

    private static readonly string ContractsDir = Path.Combine(RepoRoot, "contracts");

    private static readonly string[] UnifiedSmartWalletFiles =
    {
        "UnifiedSmartWallet.cs",
        "UnifiedSmartWallet.Models.cs",
        "UnifiedSmartWallet.Internal.cs",
        "UnifiedSmartWallet.Accounts.cs",
        "UnifiedSmartWallet.State.cs",
        "UnifiedSmartWallet.Execution.cs",
        "UnifiedSmartWallet.VerifyContext.cs",
        "UnifiedSmartWallet.Escape.cs",
        "UnifiedSmartWallet.MarketEscrow.cs"
    };

    private static Type ContractType => typeof(global::AbstractAccount.UnifiedSmartWallet);

    private static string ReadContractFile(string fileName) =>
        File.ReadAllText(Path.Combine(ContractsDir, fileName));

    private static string ReadCombinedSource() =>
        string.Join("\n\n", UnifiedSmartWalletFiles.Select(ReadContractFile));

    [TestMethod]
    public void ContractAssemblyExposesUnifiedSmartWalletV3Metadata()
    {
        Assert.AreEqual("UnifiedSmartWallet", ContractType.Name);

        DisplayNameAttribute? displayName = ContractType.GetCustomAttribute<DisplayNameAttribute>();
        Assert.IsNotNull(displayName);
        Assert.AreEqual("UnifiedSmartWalletV3", displayName.DisplayName);

        CustomAttributeData? manifestExtra = ContractType.CustomAttributes
            .FirstOrDefault(attribute => attribute.AttributeType.Name == "ManifestExtraAttribute");

        Assert.IsNotNull(manifestExtra);
        Assert.AreEqual(2, manifestExtra!.ConstructorArguments.Count);
        Assert.AreEqual("Description", manifestExtra.ConstructorArguments[0].Value);
        Assert.AreEqual(
            "ERC-4337 Aligned Minimalist AA Engine for Neo N3",
            manifestExtra.ConstructorArguments[1].Value);
    }

    [TestMethod]
    public void ContractExposesCanonicalV3Entrypoints()
    {
        string[] requiredMethods =
        {
            "RegisterAccount",
            "UpdateHook",
            "ConfirmHookUpdate",
            "UpdateVerifier",
            "ConfirmVerifierUpdate",
            "CallVerifier",
            "CallHook",
            "ExecuteUserOp",
            "ExecuteUserOps",
            "InitiateEscape",
            "FinalizeEscape",
            "EnterMarketEscrow",
            "CancelMarketEscrow",
            "SettleMarketEscrow"
        };

        string[] exportedMethods = ContractType
            .GetMethods(BindingFlags.Public | BindingFlags.Static)
            .Select(method => method.Name)
            .Distinct()
            .ToArray();

        CollectionAssert.IsSubsetOf(requiredMethods, exportedMethods);
    }

    [TestMethod]
    public void UnifiedSmartWalletProjectCompilesAllPartialModules()
    {
        string projectFile = File.ReadAllText(Path.Combine(ContractsDir, "UnifiedSmartWallet.csproj"));
        foreach (string fileName in UnifiedSmartWalletFiles)
        {
            StringAssert.Contains(projectFile, $"<Compile Include=\"{fileName}\" />");
            Assert.IsTrue(File.Exists(Path.Combine(ContractsDir, fileName)), $"Missing source file: {fileName}");
        }
    }

    [TestMethod]
    public void ExecutionPathKeepsFixedCallFlagsAll()
    {
        string executionSource = ReadContractFile("UnifiedSmartWallet.Execution.cs");

        StringAssert.Contains(
            executionSource,
            "object result = Contract.Call(op.TargetContract, op.Method, CallFlags.All, op.Args);");
        Assert.IsFalse(executionSource.Contains("op.CallFlags", StringComparison.Ordinal));
        StringAssert.Contains(executionSource, "ConsumeNonce(accountId, op.Nonce);");
        StringAssert.Contains(executionSource, "Contract.Call(state.Verifier, \"validateSignature\", CallFlags.ReadOnly, new object[] { accountId, op });");
    }

    [TestMethod]
    public void MarketEscrowSettlementWipesInheritedVerifierAndHookState()
    {
        string marketSource = ReadContractFile("UnifiedSmartWallet.MarketEscrow.cs");

        StringAssert.Contains(marketSource, "state.Verifier = UInt160.Zero;");
        StringAssert.Contains(marketSource, "state.HookId = UInt160.Zero;");
        StringAssert.Contains(marketSource, "state.EscapeTriggeredAt = 0;");
        StringAssert.Contains(marketSource, "Account locked in market escrow");
        StringAssert.Contains(marketSource, "Only escrow market");
    }

    [TestMethod]
    public void CombinedSourceDocumentsV3RegistrationAndExecutionFlow()
    {
        string source = ReadCombinedSource();

        StringAssert.Contains(source, "RegisterAccount");
        StringAssert.Contains(source, "ExecuteUserOp");
        StringAssert.Contains(source, "Backup owner required");
        StringAssert.Contains(source, "Verifier rejected signature");
        StringAssert.Contains(source, "Native witness failed");
    }
}
