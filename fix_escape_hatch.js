const fs = require('fs');

let file = 'contracts/AbstractAccount.Admin.cs';
let content = fs.readFileSync(file, 'utf8');

// Add Escape Hatch methods to the Admin contract
const escapeHatchCode = `
        /// <summary>
        /// Initiates the L1 Escape Hatch if the active verifier is compromised or offline.
        /// Must be called with a valid N3 witness from the configured BackupOwner.
        /// </summary>
        public static void InitiateEscape(ByteString accountId)
        {
            AssertAccountExists(accountId);
            UInt160 backupOwner = GetBackupOwner(accountId);
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "No backup owner configured");
            ExecutionEngine.Assert(Runtime.CheckWitness(backupOwner), "Only backup owner can initiate escape");

            BigInteger currentTrigger = GetEscapeTriggeredAt(accountId);
            ExecutionEngine.Assert(currentTrigger == 0, "Escape already initiated");

            SetEscapeTriggeredAt(accountId, Runtime.Time);
            OnPolicyUpdated(accountId, "EscapeInitiated", backupOwner, (ByteString)new byte[] { 1 });
        }

        /// <summary>
        /// Cancels a pending escape. Usually invoked by an active verifier to thwart an unauthorized backup-key takeover.
        /// </summary>
        public static void CancelEscape(ByteString accountId)
        {
            AssertIsSigner(accountId);
            BigInteger currentTrigger = GetEscapeTriggeredAt(accountId);
            if (currentTrigger > 0)
            {
                SetEscapeTriggeredAt(accountId, 0);
                OnPolicyUpdated(accountId, "EscapeCancelled", UInt160.Zero, (ByteString)new byte[] { 0 });
            }
        }

        /// <summary>
        /// Finalizes a pending escape after the timelock has elapsed, restoring control to the backup owner.
        /// </summary>
        public static void FinalizeEscape(ByteString accountId, Neo.SmartContract.Framework.List<UInt160> newSigners, int newThreshold)
        {
            AssertAccountExists(accountId);
            UInt160 backupOwner = GetBackupOwner(accountId);
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "No backup owner configured");
            ExecutionEngine.Assert(Runtime.CheckWitness(backupOwner), "Only backup owner can finalize");

            BigInteger currentTrigger = GetEscapeTriggeredAt(accountId);
            ExecutionEngine.Assert(currentTrigger > 0, "Escape not initiated");

            BigInteger timelock = GetEscapeTimelock(accountId);
            ExecutionEngine.Assert(Runtime.Time >= currentTrigger + timelock, "Timelock not expired");

            // Grant full control back
            SetSignersInternal(accountId, newSigners, newThreshold);
            SetVerifierContractInternal(accountId, UInt160.Zero); // Disable any compromised verifier
            SetEscapeTriggeredAt(accountId, 0); // Reset escape state

            OnPolicyUpdated(accountId, "EscapeFinalized", backupOwner, (ByteString)new byte[] { 1 });
        }
`;

content = content.replace(/public static void SetHookContract\(ByteString accountId, UInt160 hookContract\)\s*\{\s*AssertIsSigner\(accountId\);\s*SetHookContractInternal\(accountId, hookContract\);\s*\}/g, 'public static void SetHookContract(ByteString accountId, UInt160 hookContract)\n        {\n            AssertIsSigner(accountId);\n            SetHookContractInternal(accountId, hookContract);\n        }\n\n' + escapeHatchCode);

// Add SetBackupOwner and SetEscapeTimelock
const backupSettingsCode = `
        public static void SetEscapeConfig(ByteString accountId, UInt160 backupOwner, BigInteger timelock)
        {
            AssertIsSigner(accountId);
            SetBackupOwnerInternal(accountId, backupOwner);
            SetEscapeTimelockInternal(accountId, timelock);
            SetEscapeTriggeredAt(accountId, 0); // Clear any pending escapes when config changes
        }
`;
content = content.replace(/public static void SetVerifierContract\(ByteString accountId, UInt160 verifierContract\)/g, backupSettingsCode + '\n        public static void SetVerifierContract(ByteString accountId, UInt160 verifierContract)');

fs.writeFileSync(file, content);

file = 'contracts/AbstractAccount.StorageAndContext.cs';
content = fs.readFileSync(file, 'utf8');

const backupStorageCode = `
        private static readonly byte[] BackupOwnerPrefix = new byte[] { 0x16 };
        private static readonly byte[] EscapeTimelockPrefix = new byte[] { 0x17 };
        private static readonly byte[] EscapeTriggeredAtPrefix = new byte[] { 0x18 };

        [Safe]
        public static UInt160 GetBackupOwner(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, BackupOwnerPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        private static void SetBackupOwnerInternal(ByteString accountId, UInt160 backupOwner)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, BackupOwnerPrefix);
            if (backupOwner == null || backupOwner == UInt160.Zero) map.Delete(GetStorageKey(accountId));
            else map.Put(GetStorageKey(accountId), backupOwner);
        }

        [Safe]
        public static BigInteger GetEscapeTimelock(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, EscapeTimelockPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (BigInteger)data;
        }

        private static void SetEscapeTimelockInternal(ByteString accountId, BigInteger timelock)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, EscapeTimelockPrefix);
            if (timelock <= 0) map.Delete(GetStorageKey(accountId));
            else map.Put(GetStorageKey(accountId), timelock);
        }

        [Safe]
        public static BigInteger GetEscapeTriggeredAt(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, EscapeTriggeredAtPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (BigInteger)data;
        }

        private static void SetEscapeTriggeredAt(ByteString accountId, BigInteger time)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, EscapeTriggeredAtPrefix);
            if (time <= 0) map.Delete(GetStorageKey(accountId));
            else map.Put(GetStorageKey(accountId), time);
        }
`;
content = content.replace(/private static readonly byte\[\] HookContractPrefix = new byte\[\] \{ 0x15 \};/g, 'private static readonly byte[] HookContractPrefix = new byte[] { 0x15 };\n' + backupStorageCode);

fs.writeFileSync(file, content);

file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
content = fs.readFileSync(file, 'utf8');

// The automatic disruption of EscapeHatch during normal execution
content = content.replace(/CheckPermissionsAndExecuteNative\(accountId, targetContract, method, args\);/g, 'CheckPermissionsAndExecuteNative(accountId, targetContract, method, args);\n            \n            // Automatic disruption of EscapeHatch during normal operational usage\n            BigInteger escapeTrigger = GetEscapeTriggeredAt(accountId);\n            if (escapeTrigger > 0) SetEscapeTriggeredAt(accountId, 0);');

content = content.replace(/CheckPermissionsAndExecute\(accountId, uniqueRecoveredSigners, targetContract, method, args\);/g, 'CheckPermissionsAndExecute(accountId, uniqueRecoveredSigners, targetContract, method, args);\n\n            // Automatic disruption of EscapeHatch during normal operational usage\n            BigInteger escapeTrigger = GetEscapeTriggeredAt(accountId);\n            if (escapeTrigger > 0) SetEscapeTriggeredAt(accountId, 0);');

fs.writeFileSync(file, content);
