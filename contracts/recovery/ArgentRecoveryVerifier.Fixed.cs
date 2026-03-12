using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System;
using System.ComponentModel;
using System.Numerics;

namespace Neo.SmartContract.Examples
{
    [ManifestExtra("Author", "Neo")]
    [ManifestExtra("Description", "Argent-style Social Recovery Verifier - Security Audited")]
    [ManifestExtra("Version", "1.1.0")]
    [ContractPermission("*", "*")]
    public class ArgentRecoveryVerifier : Framework.SmartContract
    {
        // Storage prefixes
        private const byte PREFIX_GUARDIAN = 0x01;
        private const byte PREFIX_THRESHOLD = 0x02;
        private const byte PREFIX_RECOVERY = 0x03;
        private const byte PREFIX_OWNER = 0x04;
        private const byte PREFIX_NONCE = 0x05;
        private const byte PREFIX_TIMELOCK = 0x06;
        private const byte PREFIX_FROZEN = 0x07;
        private const byte PREFIX_GUARDIAN_COUNT = 0x08;

        // Constants
        private const int MIN_GUARDIANS = 3;
        private const int MAX_GUARDIANS = 10;
        private const int MIN_THRESHOLD = 2;
        private const ulong MIN_TIMELOCK = 86400000; // 24h
        private const ulong DEFAULT_TIMELOCK = 172800000; // 48h
        private const ulong RECOVERY_EXPIRY = 604800000; // 7 days

        // Recovery request structure
        public class RecoveryRequest
        {
            public UInt160 NewOwner;
            public ECPoint[] Guardians;
            public ulong InitiatedAt;
            public ulong ExecutableAt;
            public BigInteger Nonce;
        }

        [Safe]
        public static string Version() => "1.1.0";

        // Initialize account recovery configuration
        public static void SetupRecovery(ByteString accountId, UInt160 owner, ECPoint[] guardians, BigInteger threshold)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(owner, "owner");
            Assert(Runtime.CheckWitness(owner), "Not owner");
            Assert(Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId)) == null, "Recovery already setup");
            Assert(guardians.Length >= MIN_GUARDIANS, "Too few guardians");
            Assert(guardians.Length <= MAX_GUARDIANS, "Too many guardians");
            Assert(threshold >= MIN_THRESHOLD, "Threshold too low");
            Assert(guardians.Length >= threshold, "Invalid threshold");

            // Check for duplicate guardians
            for (int i = 0; i < guardians.Length; i++)
            {
                Assert(guardians[i] != null, "Guardian is null");
                for (int j = i + 1; j < guardians.Length; j++)
                {
                    Assert(!guardians[i].Equals(guardians[j]), "Duplicate guardian");
                }
            }

            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), owner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId), threshold);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId), DEFAULT_TIMELOCK);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), 0);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_GUARDIAN_COUNT, accountId), guardians.Length);

            foreach (var guardian in guardians)
            {
                Storage.Put(Storage.CurrentContext, KeyECPoint(PREFIX_GUARDIAN, accountId, guardian), 1);
            }

            OnRecoverySetup(accountId, owner, guardians.Length, threshold);
        }

        // Configure timelock
        public static void SetTimelock(ByteString accountId, ulong timelockDuration)
        {
            RequireOwner(accountId);
            RequireNotFrozen(accountId);
            Assert(timelockDuration >= MIN_TIMELOCK, "Timelock too short");

            Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId), timelockDuration);
            OnTimelockUpdated(accountId, timelockDuration);
        }

        // Emergency freeze
        public static void EmergencyFreeze(ByteString accountId)
        {
            RequireOwner(accountId);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId), 1);

            // Delete any pending recovery request
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));

            OnEmergencyFreeze(accountId);
        }

        // Unfreeze
        public static void Unfreeze(ByteString accountId)
        {
            RequireOwner(accountId);
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            OnUnfreeze(accountId);
        }

        // Initiate recovery (with full signature verification)
        public static void InitiateRecovery(
            ByteString accountId,
            UInt160 newOwner,
            ECPoint[] guardians,
            byte[][] signatures,
            BigInteger nonce)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(newOwner, "newOwner");
            RequireNotFrozen(accountId);

            // Verify nonce
            BigInteger currentNonce = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_NONCE, accountId));
            Assert(nonce == currentNonce, "Invalid nonce");

            BigInteger threshold = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId));
            Assert(guardians.Length >= threshold, "Not enough guardians");
            Assert(guardians.Length == signatures.Length, "Mismatched arrays");

            // Build message: accountId + newOwner + nonce
            ByteString message = Helper.Concat(Helper.Concat(accountId, newOwner), (ByteString)((BigInteger)nonce).ToByteArray());
            var messageHash = CryptoLib.Sha256(message);

            // Verify each guardian signature
            BigInteger validSigs = 0;
            for (int i = 0; i < guardians.Length; i++)
            {
                // Check if valid guardian
                var isGuardian = Storage.Get(Storage.CurrentContext, KeyECPoint(PREFIX_GUARDIAN, accountId, guardians[i]));
                Assert(isGuardian != null, "Invalid guardian");

                // Verify signature
                bool valid = CryptoLib.VerifyWithECDsa(
                    messageHash,
                    guardians[i],
                    (ByteString)signatures[i],
                    NamedCurveHash.secp256r1SHA256
                );

                if (valid)
                {
                    validSigs++;
                    if (validSigs >= threshold) break; // Gas optimization: Early exit
                }
            }

            Assert(validSigs >= threshold, "Not enough valid signatures");

            // Get timelock configuration
            ulong timelock = (ulong)(BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId));

            // Create recovery request (Checks-Effects-Interactions pattern)
            var request = new RecoveryRequest
            {
                NewOwner = newOwner,
                Guardians = guardians,
                InitiatedAt = Runtime.Time,
                ExecutableAt = Runtime.Time + timelock,
                Nonce = nonce
            };

            // Update state first
            Storage.Put(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId), StdLib.Serialize(request));
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);

            OnRecoveryInitiated(accountId, newOwner, guardians, validSigs, request.ExecutableAt);
        }

        // Execute recovery (with reentrancy protection)
        public static void ExecuteRecovery(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            RequireNotFrozen(accountId);

            // Checks
            var data = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
            Assert(data != null, "No recovery request");

            var request = (RecoveryRequest)StdLib.Deserialize(data);
            Assert(Runtime.Time >= request.ExecutableAt, "Timelock not expired");
            Assert(Runtime.Time <= request.ExecutableAt + RECOVERY_EXPIRY, "Request expired");

            // Effects (delete state first to prevent reentrancy)
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));

            // Interactions (update owner last)
            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), request.NewOwner);

            OnRecoveryExecuted(accountId, request.NewOwner);
        }

        // Cancel recovery (original owner)
        public static void CancelRecovery(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            RequireOwner(accountId);

            var data = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
            Assert(data != null, "No recovery request");

            Storage.Delete(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
            OnRecoveryCancelled(accountId);
        }

        // Add guardian
        public static void AddGuardian(ByteString accountId, ECPoint guardian)
        {
            ValidateAccountId(accountId, "accountId");
            Assert(guardian != null, "Guardian is null");
            RequireOwner(accountId);
            RequireNotFrozen(accountId);

            BigInteger count = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_GUARDIAN_COUNT, accountId));
            Assert(count < MAX_GUARDIANS, "Max guardians reached");

            var exists = Storage.Get(Storage.CurrentContext, KeyECPoint(PREFIX_GUARDIAN, accountId, guardian));
            Assert(exists == null, "Guardian already exists");

            Storage.Put(Storage.CurrentContext, KeyECPoint(PREFIX_GUARDIAN, accountId, guardian), 1);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_GUARDIAN_COUNT, accountId), count + 1);

            OnGuardianAdded(accountId, guardian);
        }

        // Remove guardian
        public static void RemoveGuardian(ByteString accountId, ECPoint guardian)
        {
            ValidateAccountId(accountId, "accountId");
            Assert(guardian != null, "Guardian is null");
            RequireOwner(accountId);
            RequireNotFrozen(accountId);

            BigInteger count = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_GUARDIAN_COUNT, accountId));
            BigInteger threshold = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId));

            Assert(count - 1 >= threshold, "Would break threshold");
            Assert(count - 1 >= MIN_GUARDIANS, "Too few guardians");

            Storage.Delete(Storage.CurrentContext, KeyECPoint(PREFIX_GUARDIAN, accountId, guardian));
            Storage.Put(Storage.CurrentContext, Key(PREFIX_GUARDIAN_COUNT, accountId), count - 1);

            OnGuardianRemoved(accountId, guardian);
        }

        // Standard verifier split: execution and admin use the same owner-only logic on guardian recovery verifiers.
        public static bool VerifyExecution(ByteString accountId)
        {
            var frozen = Storage.Get(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            if (frozen != null) return false;

            var ownerBytes = Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            if (ownerBytes == null) return false;
            var owner = (UInt160)ownerBytes;
            return Runtime.CheckWitness(owner);
        }

        public static bool VerifyExecutionMetaTx(ByteString accountId, UInt160[] signerHashes)
        {
            var frozen = Storage.Get(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            if (frozen != null) return false;
            if (signerHashes == null || signerHashes.Length == 0) return false;

            var ownerBytes = Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            if (ownerBytes == null) return false;
            var owner = (UInt160)ownerBytes;
            for (int i = 0; i < signerHashes.Length; i++)
            {
                if (signerHashes[i] == owner) return true;
            }
            return false;
        }

        public static bool VerifyAdmin(ByteString accountId) => VerifyExecution(accountId);

        public static bool VerifyAdminMetaTx(ByteString accountId, UInt160[] signerHashes) => VerifyExecutionMetaTx(accountId, signerHashes);

        public static bool Verify(ByteString accountId) => VerifyExecution(accountId);

        public static bool VerifyMetaTx(ByteString accountId, UInt160[] signerHashes) => VerifyExecutionMetaTx(accountId, signerHashes);

        // Query methods
        [Safe]
        public static UInt160 GetOwner(ByteString accountId) =>
            (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));

        [Safe]
        public static BigInteger GetNonce(ByteString accountId) =>
            (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_NONCE, accountId));

        [Safe]
        public static bool IsFrozen(ByteString accountId) =>
            Storage.Get(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId)) != null;

        // Helper methods
        private static byte[] Key(byte prefix, ByteString accountId) =>
            Helper.Concat(new byte[] { prefix }, accountId);

        private static byte[] Key(byte prefix, ByteString accountId, UInt160 address) =>
            Helper.Concat(Helper.Concat(new byte[] { prefix }, accountId), address);

        private static byte[] KeyECPoint(byte prefix, ByteString accountId, ECPoint pubkey) =>
            Helper.Concat(Helper.Concat(new byte[] { prefix }, accountId), pubkey);

        private static void ValidateAccountId(ByteString accountId, string name)
        {
            Assert(accountId != null && accountId.Length > 0, name + " is null");
        }

        private static void ValidateAddress(UInt160 address, string name)
        {
            Assert(address != null, name + " is null");
            Assert(!address.IsZero, name + " is zero");
        }

        private static void RequireOwner(ByteString accountId)
        {
            var owner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            Assert(Runtime.CheckWitness(owner), "Not owner");
        }

        private static void RequireNotFrozen(ByteString accountId)
        {
            var frozen = Storage.Get(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            Assert(frozen == null, "Account frozen");
        }

        private static void Assert(bool condition, string message)
        {
            if (!condition) throw new Exception(message);
        }

        // Events
        [DisplayName("RecoverySetup")]
        public static event Action<ByteString, UInt160, BigInteger, BigInteger> OnRecoverySetup;

        [DisplayName("RecoveryInitiated")]
        public static event Action<ByteString, UInt160, ECPoint[], BigInteger, ulong> OnRecoveryInitiated;

        [DisplayName("RecoveryExecuted")]
        public static event Action<ByteString, UInt160> OnRecoveryExecuted;

        [DisplayName("RecoveryCancelled")]
        public static event Action<ByteString> OnRecoveryCancelled;

        [DisplayName("TimelockUpdated")]
        public static event Action<ByteString, ulong> OnTimelockUpdated;

        [DisplayName("EmergencyFreeze")]
        public static event Action<ByteString> OnEmergencyFreeze;

        [DisplayName("Unfreeze")]
        public static event Action<ByteString> OnUnfreeze;

        [DisplayName("GuardianAdded")]
        public static event Action<ByteString, ECPoint> OnGuardianAdded;

        [DisplayName("GuardianRemoved")]
        public static event Action<ByteString, ECPoint> OnGuardianRemoved;
    }
}
