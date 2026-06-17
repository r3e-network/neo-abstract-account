using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace AbstractAccount.Contracts.Tests;

/// <summary>
/// Source-level invariants pinning the cross-partial storage-prefix allocation of
/// <c>UnifiedSmartWalletV3</c>.
///
/// The contract's storage keys are namespaced by a one-byte prefix declared as
/// <c>private static readonly byte[] Prefix_* = new byte[] { 0xNN };</c> across several partial-class
/// files. Two prefix BYTES are deliberately reused (0x12 and 0x13: a bare admin key in
/// <c>UnifiedSmartWallet.Admin.cs</c> versus an accountId-suffixed key in
/// <c>UnifiedSmartWallet.Internal.cs</c> / <c>UnifiedSmartWallet.MarketEscrow.cs</c>). That reuse is
/// collision-safe only because the two consumers of each byte use a different KEY SHAPE — a bare
/// 1-byte global key can never alias a 21-byte accountId-suffixed key.
///
/// These tests:
///   1. Derive each prefix's (byte, key shape) directly from the contract source.
///   2. Assert no two prefixes share BOTH the same byte AND the same key shape (a real collision) —
///      so any FUTURE prefix addition that would actually collide fails the suite.
///   3. Assert the authoritative STORAGE PREFIX MAP doc comment in <c>UnifiedSmartWallet.cs</c> is
///      complete and accurate against the source (every declared prefix is documented with the
///      correct owning partial and shape, and nothing extra is documented).
///
/// Renumbering 0x12/0x13 to make every byte globally unique is intentionally deferred (it would
/// change the on-chain storage layout and require a redeploy/migration), so these tests pin the
/// CURRENT allocation rather than demanding global byte-uniqueness.
/// </summary>
[TestClass]
public class StoragePrefixMapTests
{
    private static readonly string RepoRoot =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));

    private static readonly string ContractsDir = Path.Combine(RepoRoot, "contracts");

    /// <summary>Every partial-class file of UnifiedSmartWalletV3 that may declare storage prefixes.</summary>
    private static readonly string[] WalletPartials =
    {
        "UnifiedSmartWallet.cs",
        "UnifiedSmartWallet.Accounts.cs",
        "UnifiedSmartWallet.Admin.cs",
        "UnifiedSmartWallet.Escape.cs",
        "UnifiedSmartWallet.Events.cs",
        "UnifiedSmartWallet.Execution.cs",
        "UnifiedSmartWallet.Internal.cs",
        "UnifiedSmartWallet.MarketEscrow.cs",
        "UnifiedSmartWallet.Models.cs",
        "UnifiedSmartWallet.Paymaster.cs",
        "UnifiedSmartWallet.State.cs",
        "UnifiedSmartWallet.VerifyContext.cs",
    };

    private const string ShapeBare = "bare";
    private const string ShapeAccountScoped = "+acctId";

    private static readonly Regex PrefixDeclaration = new(
        @"private static readonly byte\[\]\s+(?<name>Prefix_[A-Za-z0-9_]+)\s*=\s*new byte\[\]\s*\{\s*0x(?<byte>[0-9A-Fa-f]{2})\s*\}",
        RegexOptions.Compiled);

    private sealed record PrefixDecl(string Name, byte Value, string Partial);

    private static string ReadPartial(string fileName) => File.ReadAllText(Path.Combine(ContractsDir, fileName));

    private static string ReadAllPartials() => string.Join("\n\n", WalletPartials.Select(ReadPartial));

    /// <summary>Parses every <c>Prefix_* = new byte[] { 0xNN }</c> declaration across the wallet partials.</summary>
    private static List<PrefixDecl> CollectDeclarations()
    {
        var declarations = new List<PrefixDecl>();
        foreach (string partial in WalletPartials)
        {
            string source = ReadPartial(partial);
            foreach (Match match in PrefixDeclaration.Matches(source))
            {
                declarations.Add(new PrefixDecl(
                    match.Groups["name"].Value,
                    Convert.ToByte(match.Groups["byte"].Value, 16),
                    partial));
            }
        }
        return declarations;
    }

    /// <summary>
    /// Derives a prefix's key shape from how the contract actually builds its keys: a prefix that is
    /// ever fed through <c>Helper.Concat(Prefix_*, ...)</c> is accountId-scoped; a prefix only ever
    /// handed directly to <c>Storage.Get/Put/Delete/Find(..., Prefix_*)</c> is a bare global key.
    /// </summary>
    private static string DeriveShape(string prefixName, string allSource)
    {
        bool concatenated = Regex.IsMatch(allSource, $@"Helper\.Concat\(\s*{Regex.Escape(prefixName)}\s*[,)]");
        bool bareDirect = Regex.IsMatch(
            allSource,
            $@"Storage\.(Get|Put|Delete|Find)\(\s*Storage\.CurrentContext\s*,\s*{Regex.Escape(prefixName)}\s*[,)]");

        Assert.IsTrue(concatenated || bareDirect,
            $"{prefixName} is declared but never used in a recognizable storage key construction; " +
            "the prefix-map invariant cannot classify its key shape.");
        // A prefix used in both forms would be genuinely ambiguous; the current contract never does this.
        Assert.IsFalse(concatenated && bareDirect,
            $"{prefixName} is used as both a bare key and an accountId-suffixed key, which is ambiguous " +
            "and unsafe; split it into two distinct prefixes.");

        return concatenated ? ShapeAccountScoped : ShapeBare;
    }

    [TestMethod]
    public void NoPrefixSharesBothByteAndKeyShape()
    {
        string allSource = ReadAllPartials();
        List<PrefixDecl> declarations = CollectDeclarations();

        Assert.IsTrue(declarations.Count >= 24,
            $"Expected the full known prefix set to be declared; found only {declarations.Count}.");

        // Group every declaration by its (byte, derived key shape). Two declarations landing in the
        // same group would alias the same storage namespace — a real collision.
        var byByteAndShape = new Dictionary<(byte Value, string Shape), List<string>>();
        foreach (PrefixDecl decl in declarations)
        {
            string shape = DeriveShape(decl.Name, allSource);
            var slot = (decl.Value, shape);
            if (!byByteAndShape.TryGetValue(slot, out List<string>? owners))
            {
                owners = new List<string>();
                byByteAndShape[slot] = owners;
            }
            owners.Add($"{decl.Name} ({decl.Partial})");
        }

        foreach (var (slot, owners) in byByteAndShape)
        {
            Assert.AreEqual(1, owners.Count,
                $"Storage collision: byte 0x{slot.Value:X2} with key shape '{slot.Shape}' is claimed by " +
                $"multiple prefixes: {string.Join(", ", owners)}. Allocate a distinct byte (or a distinct " +
                "key shape) for the new prefix.");
        }

        // The two known, intentional byte reuses (0x12, 0x13) must remain split across distinct shapes.
        AssertReusedByteIsShapeSplit(declarations, allSource, 0x12);
        AssertReusedByteIsShapeSplit(declarations, allSource, 0x13);
    }

    private static void AssertReusedByteIsShapeSplit(IEnumerable<PrefixDecl> declarations, string allSource, byte value)
    {
        PrefixDecl[] sharing = declarations.Where(decl => decl.Value == value).ToArray();
        Assert.AreEqual(2, sharing.Length,
            $"Byte 0x{value:X2} is expected to be reused by exactly two prefixes (one bare admin key, " +
            $"one accountId-suffixed key); found {sharing.Length}.");
        string[] shapes = sharing.Select(decl => DeriveShape(decl.Name, allSource)).Distinct().ToArray();
        Assert.AreEqual(2, shapes.Length,
            $"Byte 0x{value:X2} is reused by {string.Join(", ", sharing.Select(d => d.Name))} but they share the " +
            "same key shape, which is a real storage collision.");
    }

    [TestMethod]
    public void StoragePrefixMapDocMatchesSource()
    {
        string mapSource = ReadPartial("UnifiedSmartWallet.cs");
        StringAssert.Contains(mapSource, "STORAGE PREFIX MAP",
            "UnifiedSmartWallet.cs must carry the authoritative STORAGE PREFIX MAP doc comment.");

        // Parse the documented table rows: "// 0xNN  Prefix_Name  Owning.cs  shape".
        var rowRegex = new Regex(
            @"//\s*0x(?<byte>[0-9A-Fa-f]{2})\s+(?<name>Prefix_[A-Za-z0-9_]+)\s+(?<partial>UnifiedSmartWallet[A-Za-z0-9_.]*\.cs|[A-Za-z0-9_]+\.cs)\s+(?<shape>bare|\+acctId\S*)",
            RegexOptions.Compiled);

        var documented = new List<(byte Value, string Name, string Partial, string Shape)>();
        foreach (Match match in rowRegex.Matches(mapSource))
        {
            documented.Add((
                Convert.ToByte(match.Groups["byte"].Value, 16),
                match.Groups["name"].Value,
                match.Groups["partial"].Value,
                match.Groups["shape"].Value));
        }

        Assert.IsTrue(documented.Count >= 24,
            $"The STORAGE PREFIX MAP documents only {documented.Count} prefixes; the source declares more.");

        string allSource = ReadAllPartials();
        List<PrefixDecl> declarations = CollectDeclarations();

        // Index the documented rows by prefix name. Each prefix name appears exactly once in the map.
        var documentedByName = new Dictionary<string, (byte Value, string Partial, string Shape)>();
        foreach (var row in documented)
        {
            Assert.IsFalse(documentedByName.ContainsKey(row.Name),
                $"{row.Name} is documented more than once in the STORAGE PREFIX MAP.");
            documentedByName[row.Name] = (row.Value, row.Partial, row.Shape);
        }

        // COMPLETENESS + CORRECTNESS: every declared prefix is documented with the right byte,
        // owning partial, and key shape.
        foreach (PrefixDecl decl in declarations)
        {
            Assert.IsTrue(documentedByName.TryGetValue(decl.Name, out var doc),
                $"{decl.Name} (0x{decl.Value:X2}, {decl.Partial}) is declared in source but missing from the " +
                "STORAGE PREFIX MAP in UnifiedSmartWallet.cs.");

            Assert.AreEqual(decl.Value, doc.Value,
                $"{decl.Name} is declared as 0x{decl.Value:X2} but the map documents 0x{doc.Value:X2}.");

            string declaredOwner = decl.Partial.Replace("UnifiedSmartWallet.", string.Empty);
            string documentedOwner = doc.Partial.Replace("UnifiedSmartWallet.", string.Empty);
            Assert.AreEqual(declaredOwner, documentedOwner,
                $"{decl.Name} is declared in {decl.Partial} but the map attributes it to {doc.Partial}.");

            string actualShape = DeriveShape(decl.Name, allSource);
            // The map may annotate extra suffixes (e.g. "+acctId(+channel)"); the leading family must match.
            Assert.IsTrue(doc.Shape.StartsWith(actualShape, StringComparison.Ordinal),
                $"{decl.Name} has key shape '{actualShape}' in source but the map documents '{doc.Shape}'.");
        }

        // NO STALE ROWS: every documented prefix actually exists in source.
        var declaredNames = declarations.Select(decl => decl.Name).ToHashSet();
        foreach (var name in documentedByName.Keys)
        {
            Assert.IsTrue(declaredNames.Contains(name),
                $"The STORAGE PREFIX MAP documents {name}, but no such prefix is declared in source.");
        }
    }

    [TestMethod]
    public void MarketEscrowPrefixCommentNoLongerClaimsGlobalUniqueness()
    {
        string marketSource = ReadPartial("UnifiedSmartWallet.MarketEscrow.cs");

        // The previous comment falsely claimed 0x13 was "distinct from every prefix" — it overlooked
        // the bare admin key reuse. The corrected comment must state the byte is reused but
        // disambiguated by key shape.
        Assert.IsFalse(
            Regex.IsMatch(marketSource, @"Distinct from every prefix"),
            "The misleading 'distinct from every prefix' claim must be removed from MarketEscrow.cs.");
        StringAssert.Contains(marketSource, "REUSED across partials",
            "The corrected comment must acknowledge the 0x13 byte reuse.");
        StringAssert.Contains(marketSource, "STORAGE PREFIX MAP",
            "The corrected comment must point to the authoritative STORAGE PREFIX MAP.");
    }
}
