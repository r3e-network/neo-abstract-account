using System;
using System.IO;
using System.Linq;
using System.Numerics;
using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Neo;
using Neo.Extensions;
using Neo.Network.P2P.Payloads;
using Neo.SmartContract;
using Neo.SmartContract.Manifest;
using Neo.SmartContract.Native;
using Neo.SmartContract.Testing;
using Neo.SmartContract.Testing.Extensions;
using Neo.VM;
using Neo.VM.Types;

namespace AbstractAccount.Contracts.Tests;

/// <summary>
/// Shared VM harness for behavioral suites that execute the compiled contracts under
/// <c>contracts/bin/v3</c> through a real Neo execution engine. It extends the pattern of
/// <c>RuntimeWalletHarness</c> in <c>RuntimeExecutionTests.cs</c> with multi-contract deploys,
/// explicit transaction signers (Global witness scope so witnesses survive nested contract
/// calls), nested-array argument marshalling, and GAS funding/balance helpers.
/// </summary>
internal sealed class RuntimeFixture
{
    private static readonly string RepoRoot =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));

    private static readonly string CompiledContractsDir = Path.Combine(RepoRoot, "contracts", "bin", "v3");

    private static readonly FieldInfo FeeAmountField =
        typeof(ApplicationEngine).GetField("_feeAmount", BindingFlags.Instance | BindingFlags.NonPublic)!;

    private static readonly UInt160 ContractManagementHash =
        UInt160.Parse("0xfffdc93764dbaddd97c48f252a53ea4643faa3fd");

    public TestEngine Engine { get; } = new();

    public UInt160 GasHash { get; } = NativeContract.GAS.Hash;

    public UInt160 StdLibHash { get; } = NativeContract.StdLib.Hash;

    public RuntimeFixture()
    {
        SetSigners(Engine.ValidatorsAddress);
    }

    /// <summary>
    /// Deploys a compiled contract from <c>contracts/bin/v3</c> (path relative to that
    /// directory, without extension) and returns its runtime hash.
    /// </summary>
    public UInt160 Deploy(string baseName, object? data = null)
    {
        NefFile nef = NefFile.Parse(
            File.ReadAllBytes(Path.Combine(CompiledContractsDir, baseName + ".nef")), verify: true);
        string manifestText = File.ReadAllText(Path.Combine(CompiledContractsDir, baseName + ".manifest.json"));
        ContractManifest manifest = ContractManifest.Parse(manifestText);

        UInt160 contractHash = Engine.GetDeployHash(nef, manifest);
        _ = Call(ContractManagementHash, "deploy", nef.ToArray(), manifestText, data);
        return contractHash;
    }

    /// <summary>
    /// Replaces the transaction signers. Global witness scope is used so that
    /// <c>Runtime.CheckWitness</c> succeeds in nested contract-to-contract calls, matching
    /// how wallets attach witnesses for AA flows. The first account is the transaction sender.
    /// </summary>
    public void SetSigners(params UInt160[] accounts)
    {
        Engine.SetTransactionSigners(accounts
            .Select(account => new Signer { Account = account, Scopes = WitnessScope.Global })
            .ToArray());
    }

    /// <summary>Block time (milliseconds) the VM currently executes against.</summary>
    public BigInteger Now()
    {
        using ScriptBuilder scriptBuilder = new();
        scriptBuilder.EmitSysCall(ApplicationEngine.System_Runtime_GetTime.Hash);
        return Run(scriptBuilder).GetInteger();
    }

    /// <summary>Advances the persisting block timestamp by the given delta.</summary>
    public void AdvanceTime(TimeSpan delta)
    {
        Engine.PersistingBlock.Advance(delta);
    }

    public StackItem Call(UInt160 targetHash, string method, params object?[] args)
    {
        // Build the System.Contract.Call manually: EmitDynamicCall's object marshaller cannot
        // express nested arrays (a UserOperation, or a forwarded arg list), but a
        // ContractParameter(Array) can, so it is assembled here instead.
        ContractParameter argsArray = new(ContractParameterType.Array)
        {
            Value = args.Select(ToParameter).ToList()
        };

        using ScriptBuilder scriptBuilder = new();
        scriptBuilder.EmitPush(argsArray);
        scriptBuilder.EmitPush((BigInteger)(int)CallFlags.All);
        scriptBuilder.EmitPush(method);
        scriptBuilder.EmitPush(targetHash.ToArray());
        scriptBuilder.EmitSysCall(ApplicationEngine.System_Contract_Call.Hash);
        return Run(scriptBuilder);
    }

    public void CallVoid(UInt160 targetHash, string method, params object?[] args)
    {
        _ = Call(targetHash, method, args);
    }

    public bool CallBoolean(UInt160 targetHash, string method, params object?[] args)
    {
        return Call(targetHash, method, args).GetBoolean();
    }

    public BigInteger CallInteger(UInt160 targetHash, string method, params object?[] args)
    {
        return Call(targetHash, method, args).GetInteger();
    }

    public UInt160 CallUInt160(UInt160 targetHash, string method, params object?[] args)
    {
        return (UInt160)TestExtensions.ConvertTo(Call(targetHash, method, args), typeof(UInt160))!;
    }

    public byte[] CallBytes(UInt160 targetHash, string method, params object?[] args)
    {
        return Call(targetHash, method, args).GetSpan().ToArray();
    }

    public BigInteger GasBalanceOf(UInt160 account)
    {
        return CallInteger(GasHash, "balanceOf", account);
    }

    /// <summary>Funds an account with GAS from the genesis validators, restoring the signers afterwards.</summary>
    public void FundGasFromValidators(UInt160 to, BigInteger amount)
    {
        Signer[] previousSigners = Engine.Transaction.Signers;
        SetSigners(Engine.ValidatorsAddress);
        try
        {
            TransferGas(Engine.ValidatorsAddress, to, amount, null);
        }
        finally
        {
            Engine.SetTransactionSigners(previousSigners);
        }
    }

    /// <summary>Performs a NEP-17 GAS transfer and asserts the token accepted it.</summary>
    public void TransferGas(UInt160 from, UInt160 to, BigInteger amount, object? data)
    {
        Assert.IsTrue(CallBoolean(GasHash, "transfer", from, to, amount, data), "GAS transfer rejected");
    }

    /// <summary>
    /// Serializes a value with the native StdLib binary serializer — the exact encoding
    /// contracts read back through <c>StdLib.Deserialize</c> (used for MultiSig signature bundles).
    /// </summary>
    public byte[] StdLibSerialize(object? value)
    {
        return CallBytes(StdLibHash, "serialize", value);
    }

    /// <summary>
    /// Builds the positional struct layout of <c>AbstractAccount.Verifiers.UserOperation</c>:
    /// [TargetContract, Method, Args, Nonce, Deadline, Signature].
    /// </summary>
    public static object[] UserOp(
        UInt160 targetContract,
        string method,
        object?[] args,
        BigInteger nonce,
        BigInteger deadline,
        object? signature)
    {
        return new object[] { targetContract, method, args, nonce, deadline, signature! };
    }

    private StackItem Run(ScriptBuilder scriptBuilder)
    {
        return Engine.Execute(
            new Script(scriptBuilder.ToArray()),
            0,
            applicationEngine => FeeAmountField.SetValue(applicationEngine, new BigInteger(long.MaxValue)));
    }

    private static ContractParameter ToParameter(object? value) => value switch
    {
        null => new ContractParameter(ContractParameterType.Any),
        ContractParameter parameter => parameter,
        bool b => new ContractParameter(ContractParameterType.Boolean) { Value = b },
        BigInteger bi => new ContractParameter(ContractParameterType.Integer) { Value = bi },
        int i => new ContractParameter(ContractParameterType.Integer) { Value = (BigInteger)i },
        long l => new ContractParameter(ContractParameterType.Integer) { Value = (BigInteger)l },
        uint u => new ContractParameter(ContractParameterType.Integer) { Value = (BigInteger)u },
        ulong ul => new ContractParameter(ContractParameterType.Integer) { Value = (BigInteger)ul },
        string s => new ContractParameter(ContractParameterType.String) { Value = s },
        byte[] bytes => new ContractParameter(ContractParameterType.ByteArray) { Value = bytes },
        UInt160 hash => new ContractParameter(ContractParameterType.Hash160) { Value = hash },
        object?[] array => new ContractParameter(ContractParameterType.Array) { Value = array.Select(ToParameter).ToList() },
        _ => throw new NotSupportedException($"Unsupported argument type: {value.GetType()}")
    };
}

/// <summary>
/// Local secp256r1 (P-256) key pair for SessionKeyVerifier vectors. Signatures are produced
/// host-side over the exact payload the verifier exposes via <c>getPayload</c>, in the
/// IEEE P1363 r||s layout that <c>CryptoLib.VerifyWithECDsa(..., secp256r1SHA256)</c> expects.
/// </summary>
internal sealed class P256SessionKey : IDisposable
{
    private readonly System.Security.Cryptography.ECDsa _key =
        System.Security.Cryptography.ECDsa.Create(System.Security.Cryptography.ECCurve.NamedCurves.nistP256);

    /// <summary>33-byte compressed public key, the on-chain <c>ECPoint</c> encoding.</summary>
    public byte[] CompressedPublicKey
    {
        get
        {
            System.Security.Cryptography.ECParameters parameters = _key.ExportParameters(includePrivateParameters: false);
            byte[] x = parameters.Q.X!;
            byte[] y = parameters.Q.Y!;
            byte[] compressed = new byte[33];
            compressed[0] = (byte)((y[^1] & 1) == 1 ? 0x03 : 0x02);
            System.Array.Copy(x, 0, compressed, 1, 32);
            return compressed;
        }
    }

    /// <summary>64-byte r||s signature over SHA-256 of the payload.</summary>
    public byte[] Sign(byte[] payload)
    {
        return _key.SignData(payload, System.Security.Cryptography.HashAlgorithmName.SHA256);
    }

    public void Dispose()
    {
        _key.Dispose();
    }
}
