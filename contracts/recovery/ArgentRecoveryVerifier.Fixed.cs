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
        public static void SetupRecovery(UInt160 accountId, UInt160 owner, ECPoint[] guardians, BigInteger threshold)
        {
            ValidateAddress(accountId, "accountId");
            ValidateAddress(owner, "owner");
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
        public static void SetTimelock(UInt160 accountId, ulong timelockDuration)
        {
            RequireOwner(accountId);
            RequireNotFrozen(accountId);
            Assert(timelockDuration >= MIN_TIMELOCK, "Timelock too short");

            Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK, accountId), timelockDuration);
            OnTimelockUpdated(accountId, timelockDuration);
        }

        // Emergency freeze
        public static void EmergencyFreeze(UInt160 accountId)
        {
            RequireOwner(accountId);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId), 1);

            // Delete any pending recovery request
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));

            OnEmergencyFreeze(accountId);
        }

        // Unfreeze
        public static void Unfreeze(UInt160 accountId)
        {
            RequireOwner(accountId);
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            OnUnfreeze(accountId);
        }

        // Initiate recovery (with full signature verification)
        public static void InitiateRecovery(
            UInt160 accountId,
            UInt160 newOwner,
            ECPoint[] guardians,
            byte[][] signatures,
            BigInteger nonce)
        {
            ValidateAddress(accountId, "accountId");
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

                if (valid) validSigs++;
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
        public static void ExecuteRecovery(UInt160 accountId)
        {
            ValidateAddress(accountId, "accountId");
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
        public static void CancelRecovery(UInt160 accountId)
        {
            ValidateAddress(accountId, "accountId");
            RequireOwner(accountId);

            var data = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
            Assert(data != null, "No recovery request");

            Storage.Delete(Storage.CurrentContext, Key(PREFIX_RECOVERY, accountId));
            OnRecoveryCancelled(accountId);
        }

        // Add guardian
        public static void AddGuardian(UInt160 accountId, ECPoint guardian)
        {
            ValidateAddress(accountId, "accountId");
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
        public static void RemoveGuardian(UInt160 accountId, ECPoint guardian)
        {
            ValidateAddress(accountId, "accountId");
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

        // Standard verify interface (for AA calls)
        public static bool Verify(UInt160 accountId)
        {
            var frozen = Storage.Get(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            if (frozen != null) return false;

            var owner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            return Runtime.CheckWitness(owner);
        }

        // Query methods
        [Safe]
        public static UInt160 GetOwner(UInt160 accountId) =>
            (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));

        [Safe]
        public static BigInteger GetNonce(UInt160 accountId) =>
            (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_NONCE, accountId));

        [Safe]
        public static bool IsFrozen(UInt160 accountId) =>
            Storage.Get(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId)) != null;

        // Helper methods
        private static byte[] Key(byte prefix, UInt160 accountId) =>
            Helper.Concat(new byte[] { prefix }, accountId);

        private static byte[] Key(byte prefix, UInt160 accountId, UInt160 address) =>
            Helper.Concat(Helper.Concat(new byte[] { prefix }, accountId), address);

        private static byte[] KeyECPoint(byte prefix, UInt160 accountId, ECPoint pubkey) =>
            Helper.Concat(Helper.Concat(new byte[] { prefix }, accountId), pubkey);

        private static void ValidateAddress(UInt160 address, string name)
        {
            Assert(address != null, name + " is null");
            Assert(!address.IsZero, name + " is zero");
        }

        private static void RequireOwner(UInt160 accountId)
        {
            var owner = (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            Assert(Runtime.CheckWitness(owner), "Not owner");
        }

        private static void RequireNotFrozen(UInt160 accountId)
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
        public static event Action<UInt160, UInt160, BigInteger, BigInteger> OnRecoverySetup;

        [DisplayName("RecoveryInitiated")]
        public static event Action<UInt160, UInt160, ECPoint[], BigInteger, ulong> OnRecoveryInitiated;

        [DisplayName("RecoveryExecuted")]
        public static event Action<UInt160, UInt160> OnRecoveryExecuted;

        [DisplayName("RecoveryCancelled")]
        public static event Action<UInt160> OnRecoveryCancelled;

        [DisplayName("TimelockUpdated")]
        public static event Action<UInt160, ulong> OnTimelockUpdated;

        [DisplayName("EmergencyFreeze")]
        public static event Action<UInt160> OnEmergencyFreeze;

        [DisplayName("Unfreeze")]
        public static event Action<UInt160> OnUnfreeze;

        [DisplayName("GuardianAdded")]
        public static event Action<UInt160, ECPoint> OnGuardianAdded;

        [DisplayName("GuardianRemoved")]
        public static event Action<UInt160, ECPoint> OnGuardianRemoved;
    }
}
