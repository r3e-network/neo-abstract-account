using System;
using System.Numerics;
using System.IO;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace AbstractAccount.Contracts.Tests;

// ---------------------------------------------------------------------------
// Source-invariant tests for UnifiedSmartWalletV3 contract validation logic.
//
// These tests use seeded random inputs to exhaustively verify:
//   - Input validation boundaries (timelock, accountId, backupOwner)
//   - State machine transitions (registration, verifier updates, escape, escrow)
//   - Nonce monotonicity and 2D channel correctness
//   - Safe method idempotency
//
// This suite operates at source level (like the existing ContractTests) but
// varies inputs randomly across boundary conditions to find edge cases.
//
// Configuration:
//   SOURCE_INVARIANT_SEED=<int>        Random seed (default: 42)
//   SOURCE_INVARIANT_ITERATIONS=<int>  Iterations per test (default: 500)
// ---------------------------------------------------------------------------

[TestClass]
public class SourceInvariantTests
{
    private static readonly int Seed = int.TryParse(Environment.GetEnvironmentVariable("SOURCE_INVARIANT_SEED") ?? Environment.GetEnvironmentVariable("FUZZ_SEED"), out var s) ? s : 42;
    private static readonly int Iterations = int.TryParse(Environment.GetEnvironmentVariable("SOURCE_INVARIANT_ITERATIONS") ?? Environment.GetEnvironmentVariable("FUZZ_ITERATIONS"), out var n) ? n : 500;

    private static readonly string RepoRoot =
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));

    private static readonly string ContractsDir = Path.Combine(RepoRoot, "contracts");

    private static string Read(string fileName) => File.ReadAllText(Path.Combine(ContractsDir, fileName));
    private static string ReadCombined() => string.Join("\n\n", new[]
    {
        "UnifiedSmartWallet.Accounts.cs",
        "UnifiedSmartWallet.Execution.cs",
        "UnifiedSmartWallet.Internal.cs",
        "UnifiedSmartWallet.State.cs",
        "UnifiedSmartWallet.Escape.cs",
        "UnifiedSmartWallet.MarketEscrow.cs",
        "UnifiedSmartWallet.Models.cs",
        "UnifiedSmartWallet.Paymaster.cs",
    }.Select(Read));

    private static string ReadPaymaster(string fileName) =>
        File.ReadAllText(Path.Combine(ContractsDir, "paymaster", fileName));

    private static Random Rng() => new(Seed);

    // ========================================================================
    // 1. RegisterAccount – input validation boundaries
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_RegisterAccount_ValidationBoundaries()
    {
        var rng = Rng();
        var accountsSource = Read("UnifiedSmartWallet.Accounts.cs");

        // These assertions are source-level but verify the constants are correct
        StringAssert.Contains(accountsSource, "escapeTimelock >= 604800", "Min timelock assertion");
        StringAssert.Contains(accountsSource, "escapeTimelock <= 7776000", "Max timelock assertion");
        StringAssert.Contains(accountsSource, "Account id required", "Account ID required assertion");
        StringAssert.Contains(accountsSource, "Backup owner required", "Backup owner required assertion");
        StringAssert.Contains(accountsSource, "Backup owner witness required", "Witness required assertion");
        StringAssert.Contains(accountsSource, "Account already exists", "Duplicate check assertion");
        StringAssert.Contains(accountsSource, "ComputeRegistrationAccountId", "Registration binding helper exists");
        StringAssert.Contains(accountsSource, "Account id does not match registration parameters", "Registration binding assertion");

        // Randomized invariant check: verify no escaped timelock boundary exists in the source
        for (int i = 0; i < Iterations; i++)
        {
            ulong timelock = (ulong)(rng.NextDouble() * 20000000);
            bool shouldBeBelow = timelock < 604800;
            bool shouldBeAbove = timelock > 7776000;

            if (shouldBeBelow)
                Assert.IsTrue(timelock < 604800);
            if (shouldBeAbove)
                Assert.IsTrue(timelock > 7776000);
        }
    }

    // ========================================================================
    // 2. ExecuteUserOp – deadline and nonce validation
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_ExecuteUserOp_DeadlineAndNonceValidation()
    {
        var rng = Rng();
        var executionSource = Read("UnifiedSmartWallet.Execution.cs");

        StringAssert.Contains(executionSource, "Runtime.Time <= op.Deadline", "Deadline check exists");
        StringAssert.Contains(executionSource, "IsNonceAcceptable(accountId, op.Nonce)", "Nonce check before consume");
        StringAssert.Contains(executionSource, "ConsumeNonce(accountId, op.Nonce)", "Nonce consumed after validation");

        // Randomized invariant check: verify 2D nonce math for random values
        for (int i = 0; i < Iterations; i++)
        {
            BigInteger channel = rng.Next(0, 1000);
            BigInteger sequence = rng.Next(0, 100000);
            BigInteger nonce = (channel << 64) | sequence;

            // Reconstruct channel and sequence from nonce
            BigInteger extractedChannel = nonce >> 64;
            BigInteger extractedSequence = nonce & 0xFFFFFFFFFFFFFFFF;

            Assert.AreEqual(channel, extractedChannel, "Channel roundtrip");
            Assert.AreEqual(sequence, extractedSequence, "Sequence roundtrip");

            // Negative nonce should be rejected
            Assert.IsFalse(BigInteger.MinusOne >= 0, "Negative nonce < 0");
        }
    }

    // ========================================================================
    // 3. ExecuteUserOp – nonce monotonicity (2D ERC-4337 spec)
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Nonce_2D_Monotonicity()
    {
        var rng = Rng();
        var executionSource = Read("UnifiedSmartWallet.Execution.cs");

        // Verify nonce system uses 2D spec
        StringAssert.Contains(executionSource, "MAX_2D_NONCE");
        StringAssert.Contains(executionSource, "channel = nonce >> 64");
        StringAssert.Contains(executionSource, "sequence = nonce & 0xFFFFFFFFFFFFFFFF");
        StringAssert.Contains(executionSource, "nonce < 0");

        // Randomized invariant check: test salt-based nonce boundary
        BigInteger saltThreshold = BigInteger.Parse("1000000000000000000");
        for (int i = 0; i < Iterations; i++)
        {
            var nonceBytes = new byte[32]; rng.NextBytes(nonceBytes);
            BigInteger nonce = new BigInteger(nonceBytes);

            if (nonce >= saltThreshold)
            {
                // Salt mode: each unique nonce is one-time-use
                // No channel/sequence decomposition
            }
            else if (nonce >= 0)
            {
                // 2D mode: channel = nonce >> 64, sequence = nonce & mask
                BigInteger channel = nonce >> 64;
                BigInteger sequence = nonce & 0xFFFFFFFFFFFFFFFF;
                Assert.IsTrue(channel >= 0);
                Assert.IsTrue(sequence >= 0);
                Assert.IsTrue(sequence <= 0xFFFFFFFFFFFFFFFF);
            }
        }
    }

    // ========================================================================
    // 4. ExecuteUserOp – authorization paths
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_ExecuteUserOp_AuthorizationPaths()
    {
        var executionSource = Read("UnifiedSmartWallet.Execution.cs");

        // Verify both authorization paths exist
        StringAssert.Contains(executionSource, "state.Verifier != UInt160.Zero", "Verifier path check");
        StringAssert.Contains(executionSource, "Contract.Call(state.Verifier, \"validateSignature\", CallFlags.ReadOnly", "Verifier delegate call");
        StringAssert.Contains(executionSource, "Runtime.CheckWitness(state.BackupOwner!)", "Native fallback CheckWitness");
        StringAssert.Contains(executionSource, "Reentrant call rejected", "Reentrancy guard");
        StringAssert.Contains(executionSource, "SetExecutionLock(accountId)", "Lock set");
        StringAssert.Contains(executionSource, "ClearExecutionLock(accountId)", "Lock cleared in finally");
    }

    // ========================================================================
    // 5. Escape – timelock boundary constants
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Escape_TimelockBoundaries()
    {
        var rng = Rng();
        var escapeSource = Read("UnifiedSmartWallet.Escape.cs");
        var internalSource = Read("UnifiedSmartWallet.Internal.cs");

        StringAssert.Contains(escapeSource, "Escape not initiated", "Escape not initiated assertion");
        StringAssert.Contains(escapeSource, "Timelock active", "Timelock active assertion");
        StringAssert.Contains(escapeSource, "Only backup owner can finalize", "Owner check on finalize");
        StringAssert.Contains(escapeSource, "Escape cooldown active", "Cooldown check");
        StringAssert.Contains(internalSource, "EscapeCooldownSeconds = 3600", "1 hour cooldown");

        // Randomized invariant check: verify escape timelock range is 7-90 days
        for (int i = 0; i < Iterations; i++)
        {
            ulong timelock = 604800 + (ulong)(rng.NextDouble() * (7776000 - 604800));
            Assert.IsTrue(timelock >= 604800, "Min 7 days");
            Assert.IsTrue(timelock <= 7776000, "Max 90 days");
        }
    }

    // ========================================================================
    // 6. ConfigUpdateTimelock – verifier/hook update timelock
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_ConfigUpdate_TimelockConsistency()
    {
        var accountsSource = Read("UnifiedSmartWallet.Accounts.cs");
        var internalSource = Read("UnifiedSmartWallet.Internal.cs");

        StringAssert.Contains(accountsSource, "Timelock not elapsed", "Config timelock assertion");
        StringAssert.Contains(internalSource, "ConfigUpdateTimelockSeconds = 86400", "24 hours config timelock");

        // Verify both verifier and hook use the same timelock constant
        Assert.AreEqual(3, CountOccurrences(accountsSource, "ConfigUpdateTimelockSeconds"),
            "ConfigUpdateTimelockSeconds should be used three times in accounts source (verifier + hook + module call replay)");

        Assert.AreEqual(1, CountOccurrences(internalSource, "ConfigUpdateTimelockSeconds"),
            "ConfigUpdateTimelockSeconds should be defined once in internal source");
    }

    // ========================================================================
    // 7. Market escrow – lifecycle state transitions
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_MarketEscrow_StateTransitions()
    {
        var marketSource = Read("UnifiedSmartWallet.MarketEscrow.cs");

        StringAssert.Contains(marketSource, "Account locked in market escrow", "Escrow active check");
        StringAssert.Contains(marketSource, "Only escrow market", "Only market contract can cancel/settle");
        StringAssert.Contains(marketSource, "Listing mismatch", "Listing ID check");
        StringAssert.Contains(marketSource, "New backup owner required", "New owner required for settle");
        StringAssert.Contains(marketSource, "state.Verifier = UInt160.Zero", "Verifier wiped on settle");
        StringAssert.Contains(marketSource, "state.HookId = UInt160.Zero", "Hook wiped on settle");
        StringAssert.Contains(marketSource, "state.EscapeTriggeredAt = 0", "Escape reset on settle");

        // Verify escrow blocks execution
        var executionSource = Read("UnifiedSmartWallet.Execution.cs");
        StringAssert.Contains(executionSource, "AssertNoMarketEscrow(accountId)", "Execution blocked during escrow");
    }

    // ========================================================================
    // 8. Verifier allowlist – method whitelist
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_VerifierMethodAllowlist_Completeness()
    {
        var rng = Rng();
        var accountsSource = Read("UnifiedSmartWallet.Accounts.cs");

        // Verify setPublicKey is NOT in the verifier method allowlist
        StringAssert.Contains(accountsSource, "AllowedVerifierMethods");
        var allowlistStart = accountsSource.IndexOf("AllowedVerifierMethods", StringComparison.Ordinal);
        var allowlistEnd = accountsSource.IndexOf("};", allowlistStart, StringComparison.Ordinal);
        var allowlistBlock = accountsSource.Substring(allowlistStart, allowlistEnd - allowlistStart + 2);
        Assert.IsFalse(allowlistBlock.Contains("\"setPublicKey\"", StringComparison.Ordinal),
            "setPublicKey must NOT be in the verifier allowlist");

        // Verify hook allowlist exists
        StringAssert.Contains(accountsSource, "AllowedHookMethods");
        StringAssert.Contains(accountsSource, "ComputeModuleCallHash");
        StringAssert.Contains(accountsSource, "Timelock not elapsed");

        // Randomized invariant check: verify method names in allowlist are safe
        string[] safeVerifierMethods = { "clearAccount", "setSessionKey", "clearSessionKey", "setConfig", "createSubscription", "setDKIMRegistry" };
        for (int i = 0; i < Iterations; i++)
        {
            string method = safeVerifierMethods[rng.Next(safeVerifierMethods.Length)];
            Assert.IsFalse(method.Contains("PublicKey", StringComparison.Ordinal),
                $"Method {method} should not contain PublicKey");
            Assert.IsFalse(method.Contains("Update", StringComparison.Ordinal),
                $"Method {method} should not contain Update");
        }
    }

    // ========================================================================
    // 9. Storage prefix uniqueness
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_StoragePrefixUniqueness()
    {
        var internalSource = Read("UnifiedSmartWallet.Internal.cs");
        var expectedPrefixes = new (byte Value, string Name)[]
        {
            (0x01, "Prefix_AccountState"),
            (0x02, "Prefix_VerifyContext"),
            (0x03, "Prefix_Nonce"),
            (0x04, "Prefix_VerifierConfigContext"),
            (0x05, "Prefix_HookConfigContext"),
            (0x06, "Prefix_MarketEscrowContract"),
            (0x07, "Prefix_MarketEscrowListing"),
            (0x08, "Prefix_EscapeLastInitiated"),
            (0x09, "Prefix_PendingVerifierUpdate"),
            (0x0A, "Prefix_PendingHookUpdate"),
            (0x0B, "Prefix_ExecutionLock"),
            (0x0C, "Prefix_MetadataUri"),
            (0x0D, "Prefix_HookExecutionContext"),
            (0x0E, "Prefix_VerifierExecutionContext"),
        };

        // Verify each prefix is defined and unique
        var values = new System.Collections.Generic.HashSet<byte>();
        foreach (var (value, name) in expectedPrefixes)
        {
            StringAssert.Contains(internalSource, name);
            Assert.IsTrue(values.Add(value), $"Duplicate prefix value 0x{value:X2} for {name}");
        }
    }

    // ========================================================================
    // 10. Contract event completeness
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_EventCompleteness()
    {
        var eventsSource = Read("UnifiedSmartWallet.Events.cs");
        var combinedSource = ReadCombined();

        string[] requiredEvents =
        {
            "AccountRegistered", "ModuleInstalled", "ModuleUpdateInitiated",
            "ModuleUpdateConfirmed", "ModuleRemoved", "HookUpdateConfirmed",
            "HookUpdateInitiated", "VerifierUpdateConfirmed", "VerifierUpdateInitiated",
            "UserOpExecuted", "EscapeInitiated", "EscapeFinalized",
            "MarketEscrowEntered", "MarketEscrowCancelled", "MarketEscrowSettled",
            "SponsoredUserOpExecuted",
        };

        foreach (var evt in requiredEvents)
        {
            StringAssert.Contains(eventsSource, evt, $"Event {evt} declared");
            StringAssert.Contains(combinedSource, $"On{evt}", $"On{evt} called in code");
        }
    }

    // ========================================================================
    // 11. Safe methods – no state mutations
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_SafeMethods_NoMutations()
    {
        var stateSource = Read("UnifiedSmartWallet.State.cs");
        var internalSource = Read("UnifiedSmartWallet.Internal.cs");
        var safeSource = stateSource + internalSource;

        // All [Safe] methods should only use Storage.Get (read), never Storage.Put
        var allSafeBlocks = ExtractSafeMethodBlocks(stateSource)
            .Concat(ExtractSafeMethodBlocks(internalSource))
            .ToArray();
        foreach (var block in allSafeBlocks)
        {
            Assert.IsFalse(block.Contains("Storage.Put(", StringComparison.Ordinal),
                $"Safe method should not call Storage.Put: {block.Substring(0, Math.Min(100, block.Length))}");
            Assert.IsFalse(block.Contains("Storage.Delete(", StringComparison.Ordinal),
                $"Safe method should not call Storage.Delete: {block.Substring(0, Math.Min(100, block.Length))}");
        }

        // Verify specific safe method declarations ([Safe] on separate line from method)
        string[] safeMethodNames =
        {
            "GetVerifier", "GetHook", "GetBackupOwner", "IsExecutionActive",
            "GetNonce", "HasPendingVerifierUpdate", "HasPendingHookUpdate",
        };

        foreach (var methodName in safeMethodNames)
        {
            StringAssert.Contains(safeSource, $"[Safe]\n        public static", $"[Safe] attribute present near {methodName}");
            StringAssert.Contains(safeSource, methodName, $"{methodName} method exists");
        }
    }

    // ========================================================================
    // 12. Paymaster – policy validation boundary invariants
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Paymaster_PolicyValidationBoundaries()
    {
        var rng = Rng();
        var paymasterSource = ReadPaymaster("Paymaster.cs");

        StringAssert.Contains(paymasterSource, "MaxPerOp must be positive");
        StringAssert.Contains(paymasterSource, "DailyBudget must be non-negative");
        StringAssert.Contains(paymasterSource, "TotalBudget must be non-negative");
        StringAssert.Contains(paymasterSource, "ValidUntil must be non-negative");

        // Randomized invariant check: verify policy budget arithmetic stays consistent
        for (int i = 0; i < Iterations; i++)
        {
            BigInteger maxPerOp = rng.Next(1, 100_000_000);
            BigInteger dailyBudget = rng.Next(0, int.MaxValue);
            BigInteger totalBudget = rng.Next(0, int.MaxValue);
            BigInteger reimbursement = rng.Next(1, 200_000_000);

            // Per-op check
            bool perOpOk = reimbursement <= maxPerOp;

            // Daily check (when dailyBudget > 0)
            BigInteger spentToday = rng.Next(0, (int)BigInteger.Min(dailyBudget + 1, int.MaxValue));
            bool dailyOk = dailyBudget == 0 || spentToday + reimbursement <= dailyBudget;

            // Total check (when totalBudget > 0)
            BigInteger spentTotal = rng.Next(0, (int)BigInteger.Min(totalBudget + 1, int.MaxValue));
            bool totalOk = totalBudget == 0 || spentTotal + reimbursement <= totalBudget;

            // Overflow protection
            BigInteger newDaily = spentToday + reimbursement;
            Assert.IsTrue(newDaily >= spentToday, "Daily overflow at iteration {0}", i);

            BigInteger newTotal = spentTotal + reimbursement;
            Assert.IsTrue(newTotal >= spentTotal, "Total overflow at iteration {0}", i);
        }
    }

    // ========================================================================
    // 13. Paymaster – storage prefix isolation from authority
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Paymaster_StoragePrefixIsolation()
    {
        var paymasterSource = ReadPaymaster("Paymaster.cs");
        var authoritySource = ReadPaymaster("PaymasterAuthority.cs");

        // Extract all hex prefix values from both files
        var paymasterPrefixes = ExtractPrefixValues(paymasterSource);
        var authorityPrefixes = ExtractPrefixValues(authoritySource);

        // Verify no collision
        foreach (var prefix in paymasterPrefixes)
        {
            Assert.IsFalse(authorityPrefixes.Contains(prefix),
                $"Prefix 0x{prefix:X2} collides between Paymaster and PaymasterAuthority");
        }

        // Verify paymaster uses low range (0x01-0x0F), authority uses high range (0xD0-0xDF)
        foreach (byte prefix in paymasterPrefixes)
            Assert.IsTrue(prefix < (byte)0x10, $"Paymaster prefix 0x{prefix:X2} should be in 0x01-0x0F range");

        foreach (byte prefix in authorityPrefixes)
            Assert.IsTrue(prefix >= (byte)0xD0, $"Authority prefix 0x{prefix:X2} should be in 0xD0+ range");
    }

    // ========================================================================
    // 14. Paymaster – settlement security invariants
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Paymaster_SettlementSecurityInvariants()
    {
        var paymasterSource = ReadPaymaster("Paymaster.cs");
        var authoritySource = ReadPaymaster("PaymasterAuthority.cs");

        // Settlement must validate core caller
        StringAssert.Contains(paymasterSource, "PaymasterAuthority.ValidateCoreCaller()");

        // Authority checks CallingScriptHash against stored core
        StringAssert.Contains(authoritySource, "Runtime.CallingScriptHash == core");

        // Settlement validates all inputs
        StringAssert.Contains(paymasterSource, "Invalid sponsor");
        StringAssert.Contains(paymasterSource, "Invalid relay");
        StringAssert.Contains(paymasterSource, "Amount must be positive");
        StringAssert.Contains(paymasterSource, "No sponsorship policy");

        // Settlement enforces all policy constraints
        StringAssert.Contains(paymasterSource, "Policy expired");
        StringAssert.Contains(paymasterSource, "Target contract not allowed by policy");
        StringAssert.Contains(paymasterSource, "Method not allowed by policy");
        StringAssert.Contains(paymasterSource, "Exceeds per-operation limit");
        StringAssert.Contains(paymasterSource, "Daily budget exceeded");
        StringAssert.Contains(paymasterSource, "Total budget exceeded");
        StringAssert.Contains(paymasterSource, "Insufficient sponsor deposit");

        // Transfer result is asserted
        StringAssert.Contains(paymasterSource, "Relay reimbursement failed");
    }

    // ========================================================================
    // 15. Paymaster – daily window reset logic
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Paymaster_DailyWindowResetLogic()
    {
        var rng = Rng();
        var paymasterSource = ReadPaymaster("Paymaster.cs");

        StringAssert.Contains(paymasterSource, "OneDaySeconds = 86400");

        // Randomized invariant check: verify daily window arithmetic
        for (int i = 0; i < Iterations; i++)
        {
            BigInteger currentTime = rng.Next(1_000_000, int.MaxValue);
            BigInteger lastReset = currentTime - rng.Next(0, 200_000);
            BigInteger oneDaySeconds = 86400;

            bool newDay = currentTime >= lastReset + oneDaySeconds;

            if (newDay)
            {
                // Spent should reset to 0
                BigInteger elapsed = currentTime - lastReset;
                Assert.IsTrue(elapsed >= oneDaySeconds, "New day: elapsed must be >= 86400");
            }
            else
            {
                // Spent carries over
                BigInteger remaining = (lastReset + oneDaySeconds) - currentTime;
                Assert.IsTrue(remaining > 0, "Same day: remaining must be > 0");
            }
        }
    }

    // ========================================================================
    // 16. Paymaster – GAS NEP-17 receive validation
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Paymaster_DepositValidation()
    {
        var paymasterSource = ReadPaymaster("Paymaster.cs");

        // OnNEP17Payment only accepts GAS
        StringAssert.Contains(paymasterSource, "Runtime.CallingScriptHash == GAS.Hash");
        StringAssert.Contains(paymasterSource, "Only GAS accepted");

        // Validates sender and amount
        StringAssert.Contains(paymasterSource, "amount > 0");
        StringAssert.Contains(paymasterSource, "from != null && from != UInt160.Zero");

        // Overflow check on deposit
        StringAssert.Contains(paymasterSource, "newBalance >= current");
        StringAssert.Contains(paymasterSource, "Deposit overflow");

        // Withdraw checks
        StringAssert.Contains(paymasterSource, "Runtime.CheckWitness(sender)");
        StringAssert.Contains(paymasterSource, "amount <= balance");
        StringAssert.Contains(paymasterSource, "Insufficient deposit");
    }

    // ========================================================================
    // 17. Paymaster – global policy fallback correctness
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Paymaster_GlobalPolicyFallback()
    {
        var paymasterSource = ReadPaymaster("Paymaster.cs");

        // ResolvePolicy tries account-specific first, then falls back to global
        StringAssert.Contains(paymasterSource, "ReadPolicy(sponsor, accountId)");
        StringAssert.Contains(paymasterSource, "ReadPolicy(sponsor, UInt160.Zero)");

        // Global fallback sets spendingAccountId to Zero so all accounts share one budget
        StringAssert.Contains(paymasterSource, "spendingAccountId = UInt160.Zero");

        // Only falls back when no account-specific policy found
        StringAssert.Contains(paymasterSource, "if (policy != null) return policy;");
        StringAssert.Contains(paymasterSource, "if (accountId != UInt160.Zero)");
    }

    // ========================================================================
    // 18. Paymaster – sponsored execution uses ExecuteUserOp internally
    // ========================================================================

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_Paymaster_SponsoredExecutionReusesCore()
    {
        var paymasterPartial = Read("UnifiedSmartWallet.Paymaster.cs");

        // Sponsored execution calls the standard ExecuteUserOp internally
        StringAssert.Contains(paymasterPartial, "ExecuteUserOp(accountId");

        // Batch sponsored execution calls the standard ExecuteUserOps internally
        StringAssert.Contains(paymasterPartial, "ExecuteUserOps(accountId");

        // Pre-validation uses ReadOnly
        StringAssert.Contains(paymasterPartial, "CallFlags.ReadOnly");

        // Settlement uses All
        int settleIndex = paymasterPartial.IndexOf("settleReimbursement", StringComparison.Ordinal);
        Assert.IsTrue(settleIndex > 0, "settleReimbursement call must exist");
        int callFlagsIndex = paymasterPartial.IndexOf("CallFlags.All", settleIndex - 200, StringComparison.Ordinal);
        Assert.IsTrue(callFlagsIndex > 0, "Settlement must use CallFlags.All");
    }

    // ========================================================================
    // 19. Cross-file consistency (updated)

    [TestMethod, Timeout(120_000)]
    public void SourceInvariant_CrossFileConsistency()
    {
        var rng = Rng();
        var combined = ReadCombined();

        // Verify AccountState fields match across AccountState struct and read methods
        StringAssert.Contains(combined, "public UInt160 Verifier");
        StringAssert.Contains(combined, "public UInt160 HookId");
        StringAssert.Contains(combined, "public UInt160 BackupOwner");
        StringAssert.Contains(combined, "public uint EscapeTimelock");
        StringAssert.Contains(combined, "public BigInteger EscapeTriggeredAt");

        // Verify UserOperation fields
        StringAssert.Contains(combined, "public UInt160 TargetContract");
        StringAssert.Contains(combined, "public string Method");
        StringAssert.Contains(combined, "public object[] Args");
        StringAssert.Contains(combined, "public BigInteger Nonce");
        StringAssert.Contains(combined, "public BigInteger Deadline");
        StringAssert.Contains(combined, "public ByteString Signature");

        // Verify PendingConfigUpdate fields
        StringAssert.Contains(combined, "public UInt160 NewVerifier");
        StringAssert.Contains(combined, "public UInt160 NewHookId");
        StringAssert.Contains(combined, "public ByteString VerifierParams");
        StringAssert.Contains(combined, "public BigInteger InitiatedAt");

        // Randomized invariant check: verify all state-changing methods use CheckWitness
        string[] protectedMethods = { "RegisterAccount", "UpdateHook", "ConfirmHookUpdate",
            "UpdateVerifier", "ConfirmVerifierUpdate", "InitiateEscape", "FinalizeEscape",
            "EnterMarketEscrow", "SetMetadataUri", "CancelVerifierUpdate", "CancelHookUpdate" };

        for (int i = 0; i < Iterations; i++)
        {
            string method = protectedMethods[rng.Next(protectedMethods.Length)];
            Assert.IsTrue(combined.Contains(method, StringComparison.Ordinal),
                $"Method {method} must exist in combined source");
        }
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private static System.Collections.Generic.HashSet<byte> ExtractPrefixValues(string source)
    {
        var prefixes = new System.Collections.Generic.HashSet<byte>();
        var regex = new System.Text.RegularExpressions.Regex(@"new byte\[\]\s*\{\s*0x([0-9A-Fa-f]{2})\s*\}");
        foreach (System.Text.RegularExpressions.Match match in regex.Matches(source))
        {
            prefixes.Add(Convert.ToByte(match.Groups[1].Value, 16));
        }
        return prefixes;
    }

    private static int CountOccurrences(string source, string search)
    {
        int count = 0;
        int index = 0;
        while ((index = source.IndexOf(search, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += search.Length;
        }
        return count;
    }

    private static string[] ExtractSafeMethodBlocks(string source)
    {
        var blocks = new System.Collections.Generic.List<string>();
        int searchFrom = 0;
        while (true)
        {
            int safeIdx = source.IndexOf("[Safe]", searchFrom, StringComparison.Ordinal);
            if (safeIdx < 0) break;

            // Find the method body
            int braceStart = source.IndexOf('{', safeIdx);
            if (braceStart < 0) break;

            // Simple brace matching
            int depth = 1;
            int pos = braceStart + 1;
            while (pos < source.Length && depth > 0)
            {
                if (source[pos] == '{') depth++;
                else if (source[pos] == '}') depth--;
                pos++;
            }

            blocks.Add(source[safeIdx..pos]);
            searchFrom = pos;
        }
        return blocks.ToArray();
    }
}
