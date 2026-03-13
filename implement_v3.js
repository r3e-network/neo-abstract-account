const fs = require('fs');

console.log("Implementing V3 Execution logic...");

// Update contracts/AbstractAccount.StorageAndContext.cs
let storageFile = 'contracts/AbstractAccount.StorageAndContext.cs';
let storageContent = fs.readFileSync(storageFile, 'utf8');

const backupStoragePrefixes = `
        private static readonly byte[] BackupOwnerPrefix = new byte[] { 0x16 };
        private static readonly byte[] EscapeTimelockPrefix = new byte[] { 0x17 };
        private static readonly byte[] EscapeTriggeredAtPrefix = new byte[] { 0x18 };
        private static readonly byte[] NoncePrefix = new byte[] { 0xFF };
`;

// Insert the prefixes right after the GlobalExecutionLockKey
storageContent = storageContent.replace(/private static readonly byte\[\] GlobalExecutionLockKey = new byte\[\] \{ 0x14 \};/g, 
    'private static readonly byte[] GlobalExecutionLockKey = new byte[] { 0x14 };\n' + backupStoragePrefixes);

const escapeStorageMethods = `
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

        private static void SetEscapeTriggeredAtInternal(ByteString accountId, BigInteger time)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, EscapeTriggeredAtPrefix);
            if (time <= 0) map.Delete(GetStorageKey(accountId));
            else map.Put(GetStorageKey(accountId), time);
        }
`;

storageContent = storageContent.replace(/private static void SetVerifierContractInternal\(ByteString accountId, UInt160 verifierContract\)\s*\{\s*StorageMap map = new StorageMap\(Storage\.CurrentContext, VerifierContractPrefix\);\s*if \(verifierContract == null \|\| verifierContract == UInt160\.Zero\)\s*\{\s*map\.Delete\(GetStorageKey\(accountId\)\);\s*\}\s*else\s*\{\s*map\.Put\(GetStorageKey\(accountId\), verifierContract\);\s*\}\s*\}/g,
`private static void SetVerifierContractInternal(ByteString accountId, UInt160 verifierContract)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifierContractPrefix);
            if (verifierContract == null || verifierContract == UInt160.Zero)
            {
                map.Delete(GetStorageKey(accountId));
            }
            else
            {
                map.Put(GetStorageKey(accountId), verifierContract);
            }
        }
` + escapeStorageMethods);

fs.writeFileSync(storageFile, storageContent);


// Update contracts/AbstractAccount.Admin.cs
let adminFile = 'contracts/AbstractAccount.Admin.cs';
let adminContent = fs.readFileSync(adminFile, 'utf8');

const escapeAdminMethods = `
        /// <summary>
        /// Configures the L1 Native Escape Hatch (Backup Owner and Timelock).
        /// </summary>
        public static void SetEscapeConfig(ByteString accountId, UInt160 backupOwner, BigInteger timelock)
        {
            AssertIsSigner(accountId);
            SetBackupOwnerInternal(accountId, backupOwner);
            SetEscapeTimelockInternal(accountId, timelock);
            SetEscapeTriggeredAtInternal(accountId, 0); // Clear any pending escapes when config changes
        }

        /// <summary>
        /// Initiates the L1 Escape Hatch if the active verifier is compromised or offline.
        /// Must be called with a valid N3 witness from the configured BackupOwner.
        /// </summary>
        public static void InitiateEscape(ByteString accountId)
        {
            AssertAccountExists(accountId);
            UInt160 backupOwner = GetBackupOwner(accountId);
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "No backup owner");
            ExecutionEngine.Assert(Runtime.CheckWitness(backupOwner), "Only backup owner can initiate");

            BigInteger currentTrigger = GetEscapeTriggeredAt(accountId);
            ExecutionEngine.Assert(currentTrigger == 0, "Escape already initiated");

            SetEscapeTriggeredAtInternal(accountId, Runtime.Time);
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
                SetEscapeTriggeredAtInternal(accountId, 0);
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
            ExecutionEngine.Assert(backupOwner != null && backupOwner != UInt160.Zero, "No backup owner");
            ExecutionEngine.Assert(Runtime.CheckWitness(backupOwner), "Only backup owner can finalize");

            BigInteger currentTrigger = GetEscapeTriggeredAt(accountId);
            ExecutionEngine.Assert(currentTrigger > 0, "Escape not initiated");

            BigInteger timelock = GetEscapeTimelock(accountId);
            ExecutionEngine.Assert(Runtime.Time >= currentTrigger + timelock, "Timelock not expired");

            // Grant full control back
            SetSignersInternal(accountId, newSigners, newThreshold);
            SetVerifierContractInternal(accountId, UInt160.Zero); // Disable any compromised verifier
            SetEscapeTriggeredAtInternal(accountId, 0); // Reset escape state

            OnPolicyUpdated(accountId, "EscapeFinalized", backupOwner, (ByteString)new byte[] { 1 });
        }
`;

adminContent = adminContent.replace(/public static void SetVerifierContract\(ByteString accountId, UInt160 verifierContract\)\s*\{\s*AssertIsSigner\(accountId\);\s*SetVerifierContractInternal\(accountId, verifierContract\);\s*\}/g,
`public static void SetVerifierContract(ByteString accountId, UInt160 verifierContract)
        {
            AssertIsSigner(accountId);
            SetVerifierContractInternal(accountId, verifierContract);
        }
` + escapeAdminMethods);

fs.writeFileSync(adminFile, adminContent);


// Update contracts/AbstractAccount.ExecutionAndPermissions.cs
let executionFile = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let executionContent = fs.readFileSync(executionFile, 'utf8');

// Insert silent intercept to cancel escape hatch dynamically.
executionContent = executionContent.replace(/UpdateLastActiveTimestamp\(accountId\);\s*EnforceRestrictions\(accountId, targetContract, method, args, bypassOperationalLimits\);\s*\}/g,
`UpdateLastActiveTimestamp(accountId);

            // Silent Intercept: If account is under escape hatch countdown, any routine valid activity by the primary signer aborts the takeover.
            BigInteger currentTrigger = GetEscapeTriggeredAt(accountId);
            if (currentTrigger > 0)
            {
                SetEscapeTriggeredAtInternal(accountId, 0);
            }

            EnforceRestrictions(accountId, targetContract, method, args, bypassOperationalLimits);
        }`);

fs.writeFileSync(executionFile, executionContent);


