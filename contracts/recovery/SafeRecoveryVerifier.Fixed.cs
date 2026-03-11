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
    [ManifestExtra("Description", "Safe-style Modular Recovery Verifier - Security Audited")]
    [ManifestExtra("Version", "1.1.0")]
    [ContractPermission("*", "*")]
    public class SafeRecoveryVerifier : Framework.SmartContract
    {
        private const byte PREFIX_OWNER = 0x01;
        private const byte PREFIX_RECOVERY_MODULE = 0x02;
        private const byte PREFIX_FROZEN = 0x03;
        private const byte PREFIX_NONCE = 0x04;
        private const byte PREFIX_PENDING_RECOVERY = 0x05;

        private const int MIN_GUARDIANS = 3;
        private const int MAX_GUARDIANS = 10;
        private const ulong MIN_TIMELOCK = 86400000; // 24h

        public class RecoveryModule
        {
            public ECPoint[] Guardians;
            public BigInteger Threshold;
            public ulong Timelock;
            public bool Enabled;
        }

        [Safe]
        public static string Version() => "1.1.0";

        public static void SetupRecovery(ByteString accountId, UInt160 owner, ECPoint[] guardians, BigInteger threshold, ulong timelock)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(owner, "owner");
            Assert(Runtime.CheckWitness(owner), "Not owner");
            Assert(Storage.Get(Storage.CurrentContext, Key(PREFIX_OWNER, accountId)) == null, "Recovery already setup");
            Assert(guardians.Length >= MIN_GUARDIANS, "Too few guardians");
            Assert(guardians.Length <= MAX_GUARDIANS, "Too many guardians");
            Assert(threshold >= 2, "Threshold too low");
            Assert(guardians.Length >= threshold, "Invalid threshold");
            Assert(timelock >= MIN_TIMELOCK, "Timelock too short");
            
            // Check for duplicates
            for (int i = 0; i < guardians.Length; i++)
            {
                Assert(guardians[i] != null, "Guardian is null");
                for (int j = i + 1; j < guardians.Length; j++)
                {
                    Assert(!guardians[i].Equals(guardians[j]), "Duplicate guardian");
                }
            }
            
            var module = new RecoveryModule
            {
                Guardians = guardians,
                Threshold = threshold,
                Timelock = timelock,
                Enabled = true
            };
            
            Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), owner);
            Storage.Put(Storage.CurrentContext, Key(PREFIX_RECOVERY_MODULE, accountId), StdLib.Serialize(module));
            Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), 0);
            
            OnRecoverySetup(accountId, owner, guardians.Length, threshold);
        }

        public static void UpdateModule(ByteString accountId, ECPoint[] guardians, BigInteger threshold, ulong timelock)
        {
            ValidateAccountId(accountId, "accountId");
            RequireOwner(accountId);
            RequireNotFrozen(accountId);
            
            // Check if recovery is in progress
            var pendingRecovery = Storage.Get(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId));
            Assert(pendingRecovery == null, "Recovery in progress");
            
            Assert(guardians.Length >= MIN_GUARDIANS && guardians.Length <= MAX_GUARDIANS, "Invalid guardian count");
            Assert(threshold >= 2 && guardians.Length >= threshold, "Invalid threshold");
            Assert(timelock >= MIN_TIMELOCK, "Timelock too short");
            for (int i = 0; i < guardians.Length; i++)
            {
                Assert(guardians[i] != null, "Guardian is null");
                for (int j = i + 1; j < guardians.Length; j++)
                {
                    Assert(!guardians[i].Equals(guardians[j]), "Duplicate guardian");
                }
            }
            
            var module = new RecoveryModule
            {
                Guardians = guardians,
                Threshold = threshold,
                Timelock = timelock,
                Enabled = true
            };
            
            Storage.Put(Storage.CurrentContext, Key(PREFIX_RECOVERY_MODULE, accountId), StdLib.Serialize(module));
            OnModuleUpdated(accountId);
        }

        // Execute recovery (full signature verification)
        public static void ExecuteRecovery(
            ByteString accountId, 
            UInt160 newOwner, 
            byte[][] signatures,
            BigInteger nonce)
        {
            ValidateAccountId(accountId, "accountId");
            ValidateAddress(newOwner, "newOwner");
            RequireNotFrozen(accountId);
            
            // Verify nonce
            BigInteger currentNonce = (BigInteger)Storage.Get(Storage.CurrentContext, Key(PREFIX_NONCE, accountId));
            Assert(nonce == currentNonce, "Invalid nonce");
            
            var moduleData = Storage.Get(Storage.CurrentContext, Key(PREFIX_RECOVERY_MODULE, accountId));
            Assert(moduleData != null, "Module not setup");
            
            var module = (RecoveryModule)StdLib.Deserialize(moduleData);
            Assert(module.Enabled, "Module disabled");
            Assert(signatures.Length >= module.Threshold, "Not enough signatures");
            Assert(signatures.Length == module.Guardians.Length, "Mismatched arrays");
            
            // Build message
            ByteString message = Helper.Concat(Helper.Concat(accountId, newOwner), (ByteString)((BigInteger)nonce).ToByteArray());
            var messageHash = CryptoLib.Sha256(message);
            
            // Verify each signature
            BigInteger validSigs = 0;
            for (int i = 0; i < signatures.Length; i++)
            {
                if (CryptoLib.VerifyWithECDsa(messageHash, module.Guardians[i], (ByteString)signatures[i], NamedCurveHash.secp256r1SHA256))
                {
                    validSigs++;
                }
            }
            
            Assert(validSigs >= module.Threshold, "Not enough valid signatures");
            
            // If timelock configured, record pending recovery
            if (module.Timelock > 0)
            {
                var pendingRecovery = new PendingRecovery
                {
                    NewOwner = newOwner,
                    InitiatedAt = Runtime.Time,
                    ExecutableAt = Runtime.Time + module.Timelock
                };
                
                Storage.Put(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId), StdLib.Serialize(pendingRecovery));
                Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);
                
                OnRecoveryInitiated(accountId, newOwner, pendingRecovery.ExecutableAt);
            }
            else
            {
                // No timelock, execute immediately (CEI pattern)
                Storage.Put(Storage.CurrentContext, Key(PREFIX_NONCE, accountId), currentNonce + 1);
                Storage.Put(Storage.CurrentContext, Key(PREFIX_OWNER, accountId), newOwner);
                
                OnRecoveryExecuted(accountId, newOwner);
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
            
            OnRecoveryExecuted(accountId, pending.NewOwner);
        }

        // Cancel recovery
        public static void CancelRecovery(ByteString accountId)
        {
            ValidateAccountId(accountId, "accountId");
            RequireOwner(accountId);
            
            Storage.Delete(Storage.CurrentContext, Key(PREFIX_PENDING_RECOVERY, accountId));
            OnRecoveryCancelled(accountId);
        }

        public class PendingRecovery
        {
            public UInt160 NewOwner;
            public ulong InitiatedAt;
            public ulong ExecutableAt;
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
        public static event Action<ByteString, UInt160, BigInteger, BigInteger> OnRecoverySetup;

        [DisplayName("ModuleUpdated")]
        public static event Action<ByteString> OnModuleUpdated;

        [DisplayName("RecoveryInitiated")]
        public static event Action<ByteString, UInt160, ulong> OnRecoveryInitiated;

        [DisplayName("RecoveryExecuted")]
        public static event Action<ByteString, UInt160> OnRecoveryExecuted;

        [DisplayName("RecoveryCancelled")]
        public static event Action<ByteString> OnRecoveryCancelled;

        [DisplayName("EmergencyFreeze")]
        public static event Action<ByteString> OnEmergencyFreeze;

        [DisplayName("Unfreeze")]
        public static event Action<ByteString> OnUnfreeze;
    }
}
