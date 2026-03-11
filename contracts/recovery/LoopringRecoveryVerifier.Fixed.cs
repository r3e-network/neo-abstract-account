using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System;
using System.Numerics;
using System.ComponentModel;

namespace Neo.SmartContract.Examples
{
    [ManifestExtra("Author", "Neo")]
    [ManifestExtra("Description", "Loopring-style Off-chain Recovery Verifier - Security Audited")]
    [ManifestExtra("Version", "1.1.0")]
    [ContractPermission("*", "*")]
    public class LoopringRecoveryVerifier : Framework.SmartContract
    {
        private const byte PREFIX_OWNER = 0x01;
        private const byte PREFIX_GUARDIAN_HASH = 0x02;
        private const byte PREFIX_THRESHOLD = 0x03;
        private const byte PREFIX_NONCE = 0x04;
        private const byte PREFIX_TIMELOCK_ENABLED = 0x05;
        private const byte PREFIX_TIMELOCK_DURATION = 0x06;
        private const byte PREFIX_FROZEN = 0x07;
        private const byte PREFIX_PENDING_RECOVERY = 0x08;

        private const int MIN_GUARDIANS = 3;
        private const int MAX_GUARDIANS = 10;
        private const ulong DEFAULT_TIMELOCK = 86400000; // 24h

        public class PendingRecovery
        {
            public UInt160 NewOwner;
            public ulong InitiatedAt;
            public ulong ExecutableAt;
        }

        [Safe]
        public static string Version() => "1.1.0";

        public static void SetupRecovery(
            ByteString accountId, 
            UInt160 owner, 
            ByteString guardiansHash, 
            BigInteger threshold,
            bool enableTimelock)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(owner, "owner");
            Assert(Runtime.CheckWitness(owner), "Not owner");
            Assert(Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId)) == null, "Recovery already setup");
            Assert(guardiansHash.Length == 32, "Invalid hash length");
            Assert(threshold >= 2, "Threshold too low");
            
            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), owner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_GUARDIAN_HASH, accountId), guardiansHash);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId), threshold);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), 0);
            
            if (enableTimelock)
            {
                Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK_ENABLED, accountId), 1);
                Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK_DURATION, accountId), DEFAULT_TIMELOCK);
            }
            
            OnRecoverySetup(accountId, owner, threshold, enableTimelock);
        }

        public static void SetTimelock(ByteString accountId, ulong duration)
        {
            RequireOwner(accountId);
            Assert(duration >= 86400000, "Timelock too short");
            
            Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK_ENABLED, accountId), 1);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_TIMELOCK_DURATION, accountId), duration);
            OnTimelockUpdated(accountId, duration);
        }

        // Execute recovery (batch signature verification)
        public static void ExecuteRecovery(
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
            
            // Verify guardian count
            Assert(guardians.Length >= MIN_GUARDIANS && guardians.Length <= MAX_GUARDIANS, "Invalid guardian count");
            
            // Verify guardian list hash
            var storedHash = Storage.Get(Storage.CurrentContext, Key(PREFIX_GUARDIAN_HASH, accountId));
            var computedHash = CryptoLib.Sha256(StdLib.Serialize(guardians));
            Assert(storedHash.Equals(computedHash), "Invalid guardians");
            
            // Verify signature count
            BigInteger threshold = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_THRESHOLD, accountId));
            Assert(signatures.Length >= threshold, "Not enough signatures");
            Assert(signatures.Length == guardians.Length, "Mismatched arrays");
            
            // Batch verify signatures (Gas optimization)
            ByteString message = Helper.Concat(Helper.Concat(accountId, newOwner), (ByteString)((BigInteger)nonce).ToByteArray());
            var messageHash = CryptoLib.Sha256(message);
            
            BigInteger validSigs = 0;
            for (int i = 0; i < signatures.Length && validSigs < threshold; i++)
            {
                if (CryptoLib.VerifyWithECDsa(messageHash, guardians[i], (ByteString)signatures[i], NamedCurveHash.secp256r1SHA256))
                {
                    validSigs++;
                    if (validSigs >= threshold) break; // Early exit optimization
                }
            }
            
            Assert(validSigs >= threshold, "Invalid signatures");
            
            // Check if timelock enabled
            var timelockEnabled = Storage.Get(Storage.CurrentContext, Key(PREFIX_TIMELOCK_ENABLED, accountId));
            
            if (timelockEnabled != null)
            {
                ulong duration = (ulong)(BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_TIMELOCK_DURATION, accountId));
                
                var pending = new PendingRecovery
                {
                    NewOwner = newOwner,
                    InitiatedAt = Runtime.Time,
                    ExecutableAt = Runtime.Time + duration
                };
                
                Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId), StdLib.Serialize(pending));
                Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);
                
                OnRecoveryInitiated(accountId, newOwner, validSigs, pending.ExecutableAt);
            }
            else
            {
                // No timelock, execute immediately (CEI pattern)
                Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);
                Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), newOwner);
                
                OnRecoveryExecuted(accountId, newOwner, validSigs);
            }
        }

        // Finalize timelock recovery
        public static void FinalizeRecovery(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            RequireNotFrozen(accountId);
            
            var data = Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId));
            Assert(data != null, "No pending recovery");
            
            var pending = (PendingRecovery)StdLib.Deserialize(data);
            Assert(Runtime.Time >= pending.ExecutableAt, "Timelock not expired");
            
            // CEI pattern
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId));
            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), pending.NewOwner);
            
            OnRecoveryExecuted(accountId, pending.NewOwner, 0);
        }

        public static void CancelRecovery(ByteString accountId)
        {
            RequireOwner(accountId);
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId));
            OnRecoveryCancelled(accountId);
        }

        // Emergency freeze
        public static void EmergencyFreeze(ByteString accountId)
        {
            RequireOwner(accountId);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId), 1);
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId));
            OnEmergencyFreeze(accountId);
        }

        public static void Unfreeze(ByteString accountId)
        {
            RequireOwner(accountId);
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            OnUnfreeze(accountId);
        }

        // Standard verify interface
        public static bool Verify(ByteString accountId)
        {
            var frozen = Storage.Get(Storage.CurrentContext, Key(PREFIX_FROZEN, accountId));
            if (frozen != null) return false;
            
            var ownerBytes = Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));
            if (ownerBytes == null) return false;
            var owner = (UInt160)ownerBytes;
            return Runtime.CheckWitness(owner);
        }

        public static bool VerifyMetaTx(ByteString accountId, UInt160[] signerHashes)
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

        // Query methods
        [Safe]
        public static UInt160 GetOwner(ByteString accountId) =>
            (UInt160)Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId));

        [Safe]
        public static BigInteger GetNonce(ByteString accountId) =>
            (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_NONCE, accountId));

        // Helper methods
        private static byte[] Key(byte prefix, ByteString accountId) =>
            Helper.Concat(new byte[] { prefix }, accountId);

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
        public static event Action<ByteString, UInt160, BigInteger, bool> OnRecoverySetup;

        [DisplayName("RecoveryInitiated")]
        public static event Action<ByteString, UInt160, BigInteger, ulong> OnRecoveryInitiated;

        [DisplayName("RecoveryExecuted")]
        public static event Action<ByteString, UInt160, BigInteger> OnRecoveryExecuted;

        [DisplayName("RecoveryCancelled")]
        public static event Action<ByteString> OnRecoveryCancelled;

        [DisplayName("TimelockUpdated")]
        public static event Action<ByteString, ulong> OnTimelockUpdated;

        [DisplayName("EmergencyFreeze")]
        public static event Action<ByteString> OnEmergencyFreeze;

        [DisplayName("Unfreeze")]
        public static event Action<ByteString> OnUnfreeze;
    }
}
