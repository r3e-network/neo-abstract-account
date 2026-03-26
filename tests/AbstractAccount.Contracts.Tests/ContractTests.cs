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

    private static readonly string[] HookFiles =
    {
        "hooks/HookAuthority.cs",
        "hooks/WhitelistHook.cs",
        "hooks/DailyLimitHook.cs",
        "hooks/TokenRestrictedHook.cs",
        "hooks/MultiHook.cs",
        "hooks/NeoDIDCredentialHook.cs"
    };

    private static readonly string[] VerifierFiles =
    {
        "verifiers/VerifierAuthority.cs",
        "verifiers/Web3AuthVerifier.cs",
        "verifiers/TEEVerifier.cs",
        "verifiers/WebAuthnVerifier.cs",
        "verifiers/SessionKeyVerifier.cs",
        "verifiers/MultiSigVerifier.cs",
        "verifiers/SubscriptionVerifier.cs",
        "verifiers/ZKEmailVerifier.cs",
        "verifiers/ZkLoginVerifier.cs"
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

    [TestMethod]
    public void HookContractsUseTrustedCoreAuthorityInsteadOfCallerControlledSpoofing()
    {
        foreach (string fileName in HookFiles)
        {
            string source = ReadContractFile(fileName);
            Assert.IsFalse(
                source.Contains("Runtime.CallingScriptHash,\n                \"canConfigureHook\"", StringComparison.Ordinal)
                || source.Contains("Runtime.CallingScriptHash,\r\n                \"canConfigureHook\"", StringComparison.Ordinal)
                || source.Contains("Runtime.CallingScriptHash,\n                \"canExecuteHook\"", StringComparison.Ordinal)
                || source.Contains("Runtime.CallingScriptHash,\r\n                \"canExecuteHook\"", StringComparison.Ordinal),
                $"Direct caller-controlled authority call still present in {fileName}");
        }

        StringAssert.Contains(ReadContractFile("hooks/WhitelistHook.cs"), "HookAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("hooks/WhitelistHook.cs"), "HookAuthority.ValidateExecutionCaller");
        StringAssert.Contains(ReadContractFile("hooks/DailyLimitHook.cs"), "HookAuthority.ValidateExecutionCaller");
        StringAssert.Contains(ReadContractFile("hooks/MultiHook.cs"), "HookAuthority.ValidateExecutionCaller");
        StringAssert.Contains(ReadContractFile("hooks/NeoDIDCredentialHook.cs"), "HookAuthority.ValidateExecutionCaller");
        StringAssert.Contains(ReadContractFile("hooks/TokenRestrictedHook.cs"), "HookAuthority.ValidateExecutionCaller");
    }

    [TestMethod]
    public void WalletTracksHookExecutionContextForTrustedPluginCalls()
    {
        string internalSource = ReadContractFile("UnifiedSmartWallet.Internal.cs");
        string verifyContextSource = ReadContractFile("UnifiedSmartWallet.VerifyContext.cs");
        string executionSource = ReadContractFile("UnifiedSmartWallet.Execution.cs");

        StringAssert.Contains(internalSource, "Prefix_HookExecutionContext");
        StringAssert.Contains(internalSource, "SetHookExecutionContext");
        StringAssert.Contains(internalSource, "ClearHookExecutionContext");
        StringAssert.Contains(verifyContextSource, "public static bool CanExecuteHook");
        StringAssert.Contains(executionSource, "SetHookExecutionContext(accountId, state.HookId);");
        StringAssert.Contains(executionSource, "ClearHookExecutionContext(accountId);");
    }

    [TestMethod]
    public void HookProjectsCompileSharedAuthorityHelper()
    {
        string[] hookProjects =
        {
            "hooks/WhitelistHook.csproj",
            "hooks/DailyLimitHook.csproj",
            "hooks/TokenRestrictedHook.csproj",
            "hooks/MultiHook.csproj",
            "hooks/NeoDIDCredentialHook.csproj",
        };

        foreach (string project in hookProjects)
        {
            string projectFile = ReadContractFile(project);
            StringAssert.Contains(projectFile, "<Compile Include=\"HookAuthority.cs\" />");
        }
    }

    [TestMethod]
    public void DailyLimitHookOnlyAccruesUsageAfterSuccessfulExecution()
    {
        string source = ReadContractFile("hooks/DailyLimitHook.cs");

        StringAssert.Contains(source, "public static void PostExecute");
        StringAssert.Contains(source, "if (!DidExecutionSucceed(result)) return;");
        StringAssert.Contains(source, "ExecutionEngine.Assert(IsProtectedTransferSource(accountId, fromAccount), \"Transfer source not permitted\");");
        StringAssert.Contains(source, "return from == accountId;");
        StringAssert.Contains(source, "StoreSpentToday(accountId, targetContract, currentTime, spentToday + amount);");
        Assert.IsFalse(source.Contains("Storage.Put(Storage.CurrentContext, spentKey, newTotal);", StringComparison.Ordinal));
    }

    [TestMethod]
    public void MultiHookRejectsUnsafeHookTopologies()
    {
        string source = ReadContractFile("hooks/MultiHook.cs");

        StringAssert.Contains(source, "Too many hooks");
        StringAssert.Contains(source, "Self hook not allowed");
        StringAssert.Contains(source, "Duplicate hook not allowed");
    }

    [TestMethod]
    public void NeoDidHookUsesRegistryBackedChecksInsteadOfLocalCredentialFlags()
    {
        string source = ReadContractFile("hooks/NeoDIDCredentialHook.cs");

        StringAssert.Contains(source, "SetRegistry");
        StringAssert.Contains(source, "\"getBinding\"");
        StringAssert.Contains(source, "NeoDID registry not configured");
        Assert.IsFalse(source.Contains("IssueCredential(", StringComparison.Ordinal));
        Assert.IsFalse(source.Contains("RevokeCredential(", StringComparison.Ordinal));
        Assert.IsFalse(source.Contains("Prefix_VerifiedCredentials", StringComparison.Ordinal));
    }

    [TestMethod]
    public void VerifierContractsUseTrustedCoreAuthorityInsteadOfCallerControlledSpoofing()
    {
        foreach (string fileName in VerifierFiles)
        {
            string source = ReadContractFile(fileName);
            Assert.IsFalse(
                source.Contains("Runtime.CallingScriptHash,\n                \"canConfigureVerifier\"", StringComparison.Ordinal)
                || source.Contains("Runtime.CallingScriptHash,\r\n                \"canConfigureVerifier\"", StringComparison.Ordinal),
                $"Direct caller-controlled verifier authority call still present in {fileName}");
        }

        StringAssert.Contains(ReadContractFile("verifiers/Web3AuthVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("verifiers/TEEVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("verifiers/WebAuthnVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("verifiers/SessionKeyVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("verifiers/MultiSigVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("verifiers/SubscriptionVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("verifiers/ZKEmailVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
        StringAssert.Contains(ReadContractFile("verifiers/ZkLoginVerifier.cs"), "VerifierAuthority.ValidateConfigCaller");
    }

    [TestMethod]
    public void VerifierProjectsCompileSharedAuthorityHelper()
    {
        string[] verifierProjects =
        {
            "verifiers/Web3AuthVerifier.csproj",
            "verifiers/TEEVerifier.csproj",
            "verifiers/WebAuthnVerifier.csproj",
            "verifiers/SessionKeyVerifier.csproj",
            "verifiers/MultiSigVerifier.csproj",
            "verifiers/SubscriptionVerifier.csproj",
            "verifiers/ZKEmailVerifier.csproj",
            "verifiers/ZkLoginVerifier.csproj",
        };

        foreach (string project in verifierProjects)
        {
            string projectFile = ReadContractFile(project);
            StringAssert.Contains(projectFile, "<Compile Include=\"VerifierAuthority.cs\" />");
        }
    }
}
