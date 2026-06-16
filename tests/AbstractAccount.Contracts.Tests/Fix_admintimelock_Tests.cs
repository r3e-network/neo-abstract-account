using System;
using System.IO;
using System.Numerics;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Neo;
using Neo.Extensions;
using Neo.SmartContract;
using Neo.SmartContract.Testing.Exceptions;

namespace AbstractAccount.Contracts.Tests;

/// <summary>
/// Behavioral VM tests for the AA-D-01 core-wallet upgrade hardening
/// (<c>UnifiedSmartWallet.Admin.cs</c>).
///
/// The core <c>update(nef, manifest)</c> used to gate only on the admin witness and instantly
/// call <c>ContractManagement.Update</c>, letting one admin key replace the authorization logic
/// of every bound account with no delay or escape window. The fix mirrors the project's
/// existing <c>VerifierAuthority.ProposeUpdate/Update</c> pattern: the admin pins
/// <c>sha256(nef)</c> + <c>sha256(manifest)</c> via <c>proposeUpdate</c>, and <c>update</c> /
/// <c>confirmUpdate</c> only applies that exact artifact pair after a 7-day window.
/// </summary>
[TestClass]
public class Fix_AdminTimelock_Tests
{
    private static readonly string RepoRoot =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));

    private static readonly string CompiledContractsDir = Path.Combine(RepoRoot, "contracts", "bin", "v3");

    private static readonly UInt160 ContractManagementHash =
        UInt160.Parse("0xfffdc93764dbaddd97c48f252a53ea4643faa3fd");

    private static readonly UInt160 Stranger =
        UInt160.Parse("0x4444444444444444444444444444444444444444");

    private static readonly UInt160 NewAdmin =
        UInt160.Parse("0x9999999999999999999999999999999999999999");

    private static readonly TimeSpan Window = TimeSpan.FromDays(7);

    private const string WalletArtifact = "UnifiedSmartWalletV3";

    private static (byte[] Nef, string Manifest) ReadArtifact(string baseName)
    {
        byte[] nef = NefFile.Parse(
            File.ReadAllBytes(Path.Combine(CompiledContractsDir, baseName + ".nef")), verify: true).ToArray();
        string manifest = File.ReadAllText(Path.Combine(CompiledContractsDir, baseName + ".manifest.json"));
        return (nef, manifest);
    }

    private static byte[] Sha256(byte[] data) => System.Security.Cryptography.SHA256.HashData(data);

    private static byte[] Sha256(string text) => Sha256(System.Text.Encoding.UTF8.GetBytes(text));

    private static BigInteger UpdateCounter(RuntimeFixture fx, UInt160 contractHash)
    {
        var state = (Neo.VM.Types.Array)fx.Call(ContractManagementHash, "getContract", contractHash);
        return state[1].GetInteger();
    }

    [TestMethod]
    public void Update_WithoutProposal_IsRejected()
    {
        RuntimeFixture fx = new();
        UInt160 wallet = fx.Deploy(WalletArtifact);
        (byte[] nef, string manifest) = ReadArtifact(WalletArtifact);

        TestException instant = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest),
            "Instant update without a proposal must be rejected");
        StringAssert.Contains(instant.Message, "No pending update");
        Assert.AreEqual(BigInteger.Zero, UpdateCounter(fx, wallet), "Wallet must not be updated");
    }

    [TestMethod]
    public void Update_ProposeConfirm_HonorsSevenDayWindowAndHashes()
    {
        RuntimeFixture fx = new();
        UInt160 wallet = fx.Deploy(WalletArtifact);
        (byte[] nef, string manifest) = ReadArtifact(WalletArtifact);
        (byte[] wrongNef, _) = ReadArtifact("MockTransferTarget");

        fx.CallVoid(wallet, "proposeUpdate", Sha256(nef), Sha256(manifest));

        // Confirm inside the window is rejected, including one second before expiry.
        TestException early = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest),
            "update inside the window must be rejected");
        StringAssert.Contains(early.Message, "Update timelock not expired");

        fx.AdvanceTime(Window - TimeSpan.FromSeconds(1));
        Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest),
            "update one second before expiry must be rejected");

        fx.AdvanceTime(TimeSpan.FromSeconds(1));

        // Artifacts that do not match the pinned hashes are rejected after the window.
        TestException badNef = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", wrongNef, manifest),
            "a NEF differing from the proposal must be rejected");
        StringAssert.Contains(badNef.Message, "NEF hash mismatch");

        TestException badManifest = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest + " "),
            "a manifest differing from the proposal must be rejected");
        StringAssert.Contains(badManifest.Message, "Manifest hash mismatch");

        Assert.AreEqual(BigInteger.Zero, UpdateCounter(fx, wallet), "nothing applied yet");

        // The exact pinned artifact pair applies cleanly after the window.
        fx.CallVoid(wallet, "update", nef, manifest);
        Assert.AreEqual(BigInteger.One, UpdateCounter(fx, wallet), "update applied");

        // The proposal is single-use: replay needs a fresh propose + window.
        TestException replay = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest),
            "a confirmed proposal must not be replayable");
        StringAssert.Contains(replay.Message, "No pending update");
    }

    [TestMethod]
    public void ConfirmUpdateAlias_AppliesPinnedArtifacts()
    {
        RuntimeFixture fx = new();
        UInt160 wallet = fx.Deploy(WalletArtifact);
        (byte[] nef, string manifest) = ReadArtifact(WalletArtifact);

        fx.CallVoid(wallet, "proposeUpdate", Sha256(nef), Sha256(manifest));
        fx.AdvanceTime(Window);
        fx.CallVoid(wallet, "confirmUpdate", nef, manifest);
        Assert.AreEqual(BigInteger.One, UpdateCounter(fx, wallet), "confirmUpdate applies the pinned artifacts");
    }

    [TestMethod]
    public void CancelUpdate_ClearsPendingProposal()
    {
        RuntimeFixture fx = new();
        UInt160 wallet = fx.Deploy(WalletArtifact);
        (byte[] nef, string manifest) = ReadArtifact(WalletArtifact);

        fx.CallVoid(wallet, "proposeUpdate", Sha256(nef), Sha256(manifest));
        fx.AdvanceTime(Window);
        fx.CallVoid(wallet, "cancelUpdate");

        TestException cancelled = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest));
        StringAssert.Contains(cancelled.Message, "No pending update");
        Assert.AreEqual(BigInteger.Zero, UpdateCounter(fx, wallet), "Cancelled proposal cannot be applied");
    }

    [TestMethod]
    public void ProposeAndUpdate_RequireAdminWitness()
    {
        RuntimeFixture fx = new();
        UInt160 wallet = fx.Deploy(WalletArtifact);
        (byte[] nef, string manifest) = ReadArtifact(WalletArtifact);

        // A stranger cannot pin a proposal.
        fx.SetSigners(Stranger);
        Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "proposeUpdate", Sha256(nef), Sha256(manifest)),
            "Non-admin proposeUpdate must be rejected");

        // Admin pins a valid proposal and lets the window elapse.
        fx.SetSigners(fx.Engine.ValidatorsAddress);
        fx.CallVoid(wallet, "proposeUpdate", Sha256(nef), Sha256(manifest));
        fx.AdvanceTime(Window);

        // Even with a valid, matured proposal, a non-admin cannot apply the upgrade.
        fx.SetSigners(Stranger);
        TestException notAdmin = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest),
            "Non-admin update must be rejected");
        StringAssert.Contains(notAdmin.Message, "Not admin");
        Assert.AreEqual(BigInteger.Zero, UpdateCounter(fx, wallet), "Wallet not updated by non-admin");
    }

    [TestMethod]
    public void Update_AfterAdminTransfer_RequiresNewAdminAndStillTimelocked()
    {
        RuntimeFixture fx = new();
        UInt160 wallet = fx.Deploy(WalletArtifact);
        (byte[] nef, string manifest) = ReadArtifact(WalletArtifact);

        // The deploying validator is the initial admin; hand the role to NewAdmin.
        fx.CallVoid(wallet, "transferAdmin", NewAdmin);
        Assert.AreEqual(NewAdmin, fx.CallUInt160(wallet, "getContractAdmin"), "Admin transferred");

        // The previous admin can no longer pin a proposal.
        Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "proposeUpdate", Sha256(nef), Sha256(manifest)),
            "Former admin must lose proposal rights");

        // The new admin still goes through the full timelock — no instant upgrade.
        fx.SetSigners(NewAdmin);
        fx.CallVoid(wallet, "proposeUpdate", Sha256(nef), Sha256(manifest));
        TestException early = Assert.ThrowsExactly<TestException>(
            () => fx.CallVoid(wallet, "update", nef, manifest),
            "New admin upgrade inside the window must be rejected");
        StringAssert.Contains(early.Message, "Update timelock not expired");

        fx.AdvanceTime(Window);
        fx.CallVoid(wallet, "update", nef, manifest);
        Assert.AreEqual(BigInteger.One, UpdateCounter(fx, wallet), "New admin upgrade applies after the window");
    }
}
