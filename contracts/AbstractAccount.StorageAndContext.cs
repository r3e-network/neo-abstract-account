using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Storage and execution-context helpers are the plumbing layer of the contract. They normalize account keys,
    // build deterministic proxy scripts, remember temporary verification/meta-tx context, and enforce the global
    // execution lock that prevents unsafe re-entrant external mutations.
    public partial class UnifiedSmartWallet
    {
        // Canonical account keys distinguish short ids from long ids. Long ids are hashed before storage so unbounded
        // user-controlled ids cannot blow up key size, while short ids keep their raw bytes for readability.
        private static readonly byte[] CanonicalShortAccountIdKeyPrefix = new byte[] { 0x00 };
        private static readonly byte[] CanonicalLongAccountIdKeyPrefix = new byte[] { 0x01 };

        private static void AssertValidAccountId(ByteString accountId)
        {
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0 && accountId.Length <= 128, "Invalid accountId");
        }

        // Resolves the canonical storage key for an account while remaining backward-compatible with legacy layouts.
        // If the canonical key already exists we use it; otherwise we transparently fall back to the legacy key if an
        // older account record is still stored there.
        private static ByteString GetStorageKey(ByteString accountId)
        {
            byte[] accountIdBytes = (byte[])accountId;
            byte[] canonicalBytes = GetCanonicalStorageKeyBytes(accountIdBytes);
            ByteString canonicalKey = (ByteString)canonicalBytes;
            if (HasAccountAtStorageKey(canonicalKey)) return canonicalKey;

            ByteString legacyKey = GetLegacyStorageKey(accountId);
            if (ByteArrayEquals(canonicalBytes, (byte[])legacyKey)) return canonicalKey;
            if (HasAccountAtStorageKey(legacyKey)) return legacyKey;

            return canonicalKey;
        }

        internal static byte[] GetCanonicalStorageKeyBytes(byte[] accountId)
        {
            if (accountId.Length <= 63)
            {
                return ConcatBytes(CanonicalShortAccountIdKeyPrefix, accountId);
            }

            return ConcatBytes(CanonicalLongAccountIdKeyPrefix, (byte[])CryptoLib.Sha256((ByteString)accountId));
        }

        private static ByteString GetLegacyStorageKey(ByteString accountId)
        {
            if (accountId.Length <= 63) return accountId;
            return CryptoLib.Sha256(accountId);
        }

        private static bool HasAccountAtStorageKey(ByteString storageKey)
        {
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            return adminsMap.Get(storageKey) != null;
        }


        private static void AssertValidAccountAddress(UInt160 accountAddress)
        {
            ExecutionEngine.Assert(accountAddress != null && accountAddress != UInt160.Zero, "Invalid accountAddress");
        }

        private static void AssertAccountExists(ByteString accountId)
        {
            AssertValidAccountId(accountId);
            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ExecutionEngine.Assert(adminsMap.Get(GetStorageKey(accountId)) != null, "Account does not exist");
        }

        private static ByteString ResolveAccountIdByAddress(UInt160 accountAddress)
        {
            AssertValidAccountAddress(accountAddress);
            StorageMap map = new StorageMap(Storage.CurrentContext, AccountAddressToIdPrefix);
            ByteString? accountId = map.Get(accountAddress);
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0, "Account address not registered");
            AssertAccountExists(accountId!);
            return accountId!;
        }

        private static void CreateAccountInternal(
            ByteString accountId,
            Neo.SmartContract.Framework.List<UInt160>? admins,
            int adminThreshold,
            Neo.SmartContract.Framework.List<UInt160>? managers,
            int managerThreshold)
        {
            AssertValidAccountId(accountId);
            AssertBootstrapAuthorization(admins, adminThreshold, managers, managerThreshold);

            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ByteString? existing = adminsMap.Get(GetStorageKey(accountId));
            ExecutionEngine.Assert(existing == null, "Account already exists");

            var tx = (Transaction)Runtime.Transaction;
            UInt160 creator = tx.Sender;

            Neo.SmartContract.Framework.List<UInt160> finalAdmins;
            if (admins == null || admins.Count == 0)
            {
                finalAdmins = new Neo.SmartContract.Framework.List<UInt160>();
                finalAdmins.Add(creator);
            }
            else
            {
                finalAdmins = admins;
            }

            int finalAdminThreshold = (adminThreshold > 0 && adminThreshold <= finalAdmins.Count) ? adminThreshold : 1;

            SetAdminsInternal(accountId, finalAdmins, finalAdminThreshold);
            SetManagersInternal(accountId, managers, managerThreshold);
            UpdateLastActiveTimestamp(accountId);

            OnAccountCreated(accountId, creator);
        }

        // Binds a logical account id to the deterministic proxy address that the Verify method expects. Once bound,
        // both accountId-based and address-based entrypoints refer to the same underlying role/policy state.
        private static void BindAccountAddressInternal(ByteString accountId, UInt160 accountAddress)
        {
            AssertAccountExists(accountId);
            AssertValidAccountAddress(accountAddress);
            AssertDeterministicAccountAddress(accountId, accountAddress);

            StorageMap addrToIdMap = new StorageMap(Storage.CurrentContext, AccountAddressToIdPrefix);
            ByteString? existingId = addrToIdMap.Get(accountAddress);
            if (existingId != null)
            {
                ExecutionEngine.Assert(existingId == accountId, "Account address already bound");
            }

            StorageMap idToAddrMap = new StorageMap(Storage.CurrentContext, AccountIdToAddressPrefix);
            ByteString? existingAddress = idToAddrMap.Get(GetStorageKey(accountId));
            if (existingAddress != null)
            {
                ExecutionEngine.Assert((UInt160)existingAddress == accountAddress, "Account already bound to different address");
            }

            addrToIdMap.Put(accountAddress, accountId);
            idToAddrMap.Put(GetStorageKey(accountId), accountAddress);
        }

        private static void AssertDeterministicAccountAddress(ByteString accountId, UInt160 accountAddress)
        {
            UInt160 expectedAddress = GetDeterministicAccountAddress(accountId);
            ExecutionEngine.Assert(ByteArrayEquals((byte[])accountAddress, (byte[])expectedAddress), "Account address must match deterministic verify proxy");
        }

        private static UInt160 GetDeterministicAccountAddress(ByteString accountId)
        {
            byte[] verifyScript = BuildVerifyProxyScript(accountId);
            byte[] scriptHash = (byte[])CryptoLib.Ripemd160(CryptoLib.Sha256((ByteString)verifyScript));
            return (UInt160)ReverseBytes(scriptHash);
        }


        // Builds the exact verification proxy script whose script hash becomes the externally visible AA address. The
        // proxy does one thing: push accountId and call this contract's Verify method.
        private static byte[] BuildVerifyProxyScript(ByteString accountId)
        {
            byte[] accountIdBytes = (byte[])accountId;
            ExecutionEngine.Assert(accountIdBytes.Length <= 255, "Invalid accountId");
            return ConcatBytes(
                new byte[] { (byte)OpCode.PUSHDATA1, (byte)accountIdBytes.Length },
                accountIdBytes,
                new byte[] { 0x11, 0xC0, 0x1F, (byte)OpCode.PUSHDATA1, 0x06 },
                new byte[] { (byte)'v', (byte)'e', (byte)'r', (byte)'i', (byte)'f', (byte)'y' },
                new byte[] { (byte)OpCode.PUSHDATA1, 0x14 },
                (byte[])GetWalletContractHash(),
                ContractCallSyscall
            );
        }

        private static byte[] ReverseBytes(byte[] source)
        {
            byte[] reversed = new byte[source.Length];
            for (int i = 0; i < source.Length; i++)
            {
                reversed[i] = source[source.Length - 1 - i];
            }
            return reversed;
        }

        private static void AssertBootstrapAuthorization(
            Neo.SmartContract.Framework.List<UInt160>? admins,
            int adminThreshold,
            Neo.SmartContract.Framework.List<UInt160>? managers,
            int managerThreshold)
        {
            if (admins != null && admins.Count > 0)
            {
                bool adminAuthorized = CheckNativeSignatures(admins, adminThreshold);
                ExecutionEngine.Assert(adminAuthorized, "Unauthorized account initialization");
            }

            if (managers != null && managers.Count > 0)
            {
                bool managerAuthorized = CheckNativeSignatures(managers, managerThreshold);
                ExecutionEngine.Assert(managerAuthorized, "Unauthorized manager initialization");
            }
        }

        // Records which downstream target is currently allowed to satisfy CheckWitness(proxyAddress) during an active
        // Execute / ExecuteMetaTx flow. This prevents the proxy witness from being reused by arbitrary external calls.
        private static void SetVerifyContext(ByteString accountId, UInt160 targetContract)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifyContextPrefix);
            map.Put(GetStorageKey(accountId), targetContract);
        }

        private static bool HasActiveVerifyContext(ByteString accountId, UInt160 callingScriptHash)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifyContextPrefix);
            ByteString? expectedTarget = map.Get(GetStorageKey(accountId));
            if (expectedTarget == null || callingScriptHash == null) return false;
            return (UInt160)expectedTarget == callingScriptHash;
        }

        private static readonly byte[] ContractCallSyscall = new byte[] { 0x41, 0x62, 0x7D, 0x5B, 0x52 };
        private static readonly string[] AllowedProxyVerificationMethods = new string[]
        {
            "execute",
            "executeByAddress",
            "executeMetaTx",
            "executeMetaTxByAddress"
        };


        private static UInt160 GetWalletContractHash()
        {
            ByteString? storedHash = Storage.Get(Storage.CurrentContext, ContractHashKey);
            if (storedHash != null && storedHash.Length == 20) return (UInt160)storedHash;
            return Runtime.ExecutingScriptHash;
        }
        private static bool IsAllowedProxyVerificationTransaction()
        {
            byte[] script = (byte[])Runtime.Transaction.Script;
            byte[] contractHash = (byte[])GetWalletContractHash();
            return IsSingleSelfCallScript(script, contractHash)
                && EndsWithAllowedProxyMethodSuffix(script, contractHash);
        }

        internal static bool IsSingleSelfCallScript(byte[] script, byte[] contractHash)
        {
            if (script == null || contractHash == null || contractHash.Length != 20 || script.Length == 0) return false;
            if (CountSyscallOccurrences(script, ContractCallSyscall) != 1) return false;

            byte[] selfTargetSuffix = ConcatBytes(
                new byte[] { 0x0C, 0x14 },
                contractHash,
                ContractCallSyscall
            );
            return EndsWith(script, selfTargetSuffix);
        }

        private static int CountSyscallOccurrences(byte[] source, byte[] syscallId)
        {
            if (source == null || syscallId == null || syscallId.Length != 5 || source.Length == 0) return 0;

            int count = 0;
            int index = 0;
            while (index < source.Length)
            {
                byte opcode = source[index];

                if (opcode == (byte)OpCode.PUSHDATA1)
                {
                    if (index + 1 >= source.Length) return 0;
                    index += 2 + source[index + 1];
                    continue;
                }

                if (opcode == (byte)OpCode.PUSHDATA2)
                {
                    if (index + 2 >= source.Length) return 0;
                    int length = source[index + 1] | (source[index + 2] << 8);
                    index += 3 + length;
                    continue;
                }

                if (opcode == (byte)OpCode.PUSHDATA4)
                {
                    if (index + 4 >= source.Length) return 0;
                    int length = source[index + 1]
                        | (source[index + 2] << 8)
                        | (source[index + 3] << 16)
                        | (source[index + 4] << 24);
                    if (length < 0) return 0;
                    index += 5 + length;
                    continue;
                }

                if (opcode == syscallId[0])
                {
                    if (index + 4 >= source.Length) return 0;

                    bool matched = true;
                    for (int j = 1; j < syscallId.Length; j++)
                    {
                        if (source[index + j] != syscallId[j])
                        {
                            matched = false;
                            break;
                        }
                    }

                    if (matched) count++;
                    index += 5;
                    continue;
                }

                index++;
            }

            return count;
        }

        private static bool EndsWithAllowedProxyMethodSuffix(byte[] script, byte[] contractHash)
        {
            if (script == null || contractHash == null || contractHash.Length != 20) return false;
            for (int i = 0; i < AllowedProxyVerificationMethods.Length; i++)
            {
                byte[] suffix = BuildProxyMethodSuffix(AllowedProxyVerificationMethods[i], contractHash);
                if (EndsWith(script, suffix)) return true;
            }
            return false;
        }

        private static byte[] BuildProxyMethodSuffix(string method, byte[] contractHash)
        {
            byte[] methodBytes = ToAsciiBytes(method);
            ExecutionEngine.Assert(methodBytes.Length <= 255, "Method name too long");
            return ConcatBytes(
                new byte[] { (byte)OpCode.PUSHDATA1, (byte)methodBytes.Length },
                methodBytes,
                new byte[] { (byte)OpCode.PUSHDATA1, 0x14 },
                contractHash,
                ContractCallSyscall
            );
        }

        private static byte[] ToAsciiBytes(string value)
        {
            ExecutionEngine.Assert(value != null, "Invalid method name");
            string validatedValue = value!;
            byte[] bytes = new byte[validatedValue.Length];
            for (int i = 0; i < validatedValue.Length; i++)
            {
                bytes[i] = (byte)validatedValue[i];
            }
            return bytes;
        }

        private static bool EndsWith(byte[] source, byte[] suffix)
        {
            if (source == null || suffix == null || suffix.Length > source.Length) return false;
            int start = source.Length - suffix.Length;
            for (int i = 0; i < suffix.Length; i++)
            {
                if (source[start + i] != suffix[i]) return false;
            }
            return true;
        }

        private static void ClearVerifyContext(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifyContextPrefix);
            map.Delete(GetStorageKey(accountId));
        }

        // Persists the recovered EVM signer set just for the duration of the current meta-tx execution so admin/oracle
        // helpers can evaluate mixed-signature quorums without trusting caller-supplied runtime arguments.
        private static void SetMetaTxContext(ByteString accountId, UInt160[] signerHashes)
        {
            ExecutionEngine.Assert(signerHashes != null && signerHashes.Length > 0, "Missing meta-tx signers");
            byte[] packed = PackSignerHashes(signerHashes!);
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            map.Put(GetStorageKey(accountId), (ByteString)packed);
        }

        private static UInt160[] GetMetaTxContextSigners(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return new UInt160[0];
            return UnpackSignerHashes((byte[])data);
        }

        private static void ClearMetaTxContext(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, MetaTxContextPrefix);
            map.Delete(GetStorageKey(accountId));
        }

        private static byte[] PackSignerHashes(UInt160[] signerHashes)
        {
            byte[] packed = new byte[signerHashes.Length * 20];
            for (int i = 0; i < signerHashes.Length; i++)
            {
                byte[] signer = (byte[])signerHashes[i];
                ExecutionEngine.Assert(signer.Length == 20, "Invalid signer hash");
                int offset = i * 20;
                for (int j = 0; j < 20; j++)
                {
                    packed[offset + j] = signer[j];
                }
            }
            return packed;
        }

        private static UInt160[] UnpackSignerHashes(byte[] packed)
        {
            ExecutionEngine.Assert(packed.Length % 20 == 0, "Corrupt meta-tx context");
            int count = packed.Length / 20;
            UInt160[] signerHashes = new UInt160[count];
            for (int i = 0; i < count; i++)
            {
                byte[] signer = new byte[20];
                int offset = i * 20;
                for (int j = 0; j < 20; j++)
                {
                    signer[j] = packed[offset + j];
                }
                signerHashes[i] = (UInt160)signer;
            }
            return signerHashes;
        }

        // Acquires both an account-scoped and global execution lock. The account lock prevents double-entry on the same
        // account, while the global lock blocks unsafe external policy mutation during any active AA execution.
        private static void EnterExecution(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            ByteString key = GetStorageKey(accountId);
            ByteString? active = map.Get(key);
            ExecutionEngine.Assert(active == null, "Execution in progress");
            ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, GlobalExecutionLockKey) == null, "Execution in progress");
            map.Put(key, (ByteString)new byte[] { 1 });
            Storage.Put(Storage.CurrentContext, GlobalExecutionLockKey, (ByteString)new byte[] { 1 });
        }

        private static void ExitExecution(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            map.Delete(GetStorageKey(accountId));
            Storage.Delete(Storage.CurrentContext, GlobalExecutionLockKey);
        }

        private static bool IsExecutionActive(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            return map.Get(GetStorageKey(accountId)) != null;
        }

        private static bool IsAnyExecutionActive()
        {
            return Storage.Get(Storage.CurrentContext, GlobalExecutionLockKey) != null;
        }

        private static void UpdateLastActiveTimestamp(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, LastActivePrefix);
            map.Put(GetStorageKey(accountId), Runtime.Time);
            ResetDomeOracleState(accountId);
        }

        private static BigInteger GetLastActiveTimestampForAuth(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, LastActivePrefix);
            ByteString key = GetStorageKey(accountId);
            ByteString? data = map.Get(key);
            if (data != null) return (BigInteger)data;

            // Legacy accounts may not have an initialized timestamp; start inactivity window now.
            BigInteger now = Runtime.Time;
            map.Put(key, now);
            return now;
        }

        /// <summary>
        /// Returns the last time the account satisfied an authorization path successfully. Dome inactivity windows are
        /// measured from this timestamp.
        /// </summary>
        [Safe]
        public static BigInteger GetLastActiveTimestamp(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, LastActivePrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return 0;
            return (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetLastActiveTimestampByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetLastActiveTimestamp(accountId);
        }

        // Disallows external admin/policy changes while an execution is in progress. Only internal self-calls that are
        // part of the already-authorized AA flow may mutate protected state at that point.
        private static void AssertNoExternalMutationDuringExecution(ByteString accountId)
        {
            if (!IsExecutionActive(accountId) && !IsAnyExecutionActive()) return;
            ExecutionEngine.Assert(Runtime.CallingScriptHash == Runtime.ExecutingScriptHash, "External mutation blocked during execute");
        }

        private static void AssertNoExternalMutationDuringAnyExecution()
        {
            if (!IsAnyExecutionActive()) return;
            ExecutionEngine.Assert(Runtime.CallingScriptHash == Runtime.ExecutingScriptHash, "External mutation blocked during execute");
        }

        private static void SetVerifierContractInternal(ByteString accountId, UInt160 verifierContract)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifierContractPrefix);
            if (verifierContract == null || verifierContract == UInt160.Zero)
            {
                map.Delete(GetStorageKey(accountId));
                OnPolicyUpdated(accountId, "VerifierContract", UInt160.Zero, null!);
            }
            else
            {
                map.Put(GetStorageKey(accountId), verifierContract);
                OnPolicyUpdated(accountId, "VerifierContract", verifierContract, null!);
            }
        }

        /// <summary>
        /// Returns the optional custom verifier contract configured for the account. When present, AA execution and AA
        /// administration are delegated to different verifier entrypoints:
        /// <c>verifyExecution(accountId)</c> / <c>verifyExecutionMetaTx(accountId, signers)</c> for runtime execution,
        /// and <c>verifyAdmin(accountId)</c> / <c>verifyAdminMetaTx(accountId, signers)</c> for durable policy mutation.
        /// </summary>
        [Safe]
        public static UInt160 GetVerifierContract(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, VerifierContractPrefix);
            ByteString? data = map.Get(GetStorageKey(accountId));
            if (data == null) return UInt160.Zero;
            return (UInt160)data;
        }

        [Safe]
        public static UInt160 GetVerifierContractByAddress(UInt160 accountAddress)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetVerifierContract(accountId);
        }


        // Reverse index maintenance for role-based account discovery
        private static void AddToAdminIndex(UInt160 address, ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, AdminIndexPrefix);
            ByteString? existing = map.Get(address);
            Neo.SmartContract.Framework.List<ByteString> accounts = existing == null ? new Neo.SmartContract.Framework.List<ByteString>() : (Neo.SmartContract.Framework.List<ByteString>)StdLib.Deserialize(existing);
            bool exists = false;
            for (int i = 0; i < accounts.Count; i++) { if (accounts[i] == accountId) { exists = true; break; } }
            if (!exists) accounts.Add(accountId);
            map.Put(address, StdLib.Serialize(accounts));
        }

        private static void RemoveFromAdminIndex(UInt160 address, ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, AdminIndexPrefix);
            ByteString? existing = map.Get(address);
            if (existing == null) return;
            Neo.SmartContract.Framework.List<ByteString> oldAccounts = (Neo.SmartContract.Framework.List<ByteString>)StdLib.Deserialize(existing);
            Neo.SmartContract.Framework.List<ByteString> newAccounts = new Neo.SmartContract.Framework.List<ByteString>();
            for (int i = 0; i < oldAccounts.Count; i++)
            {
                if (oldAccounts[i] != accountId) newAccounts.Add(oldAccounts[i]);
            }
            if (newAccounts.Count == 0) map.Delete(address);
            else map.Put(address, StdLib.Serialize(newAccounts));
        }

        private static void AddToManagerIndex(UInt160 address, ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ManagerIndexPrefix);
            ByteString? existing = map.Get(address);
            Neo.SmartContract.Framework.List<ByteString> accounts = existing == null ? new Neo.SmartContract.Framework.List<ByteString>() : (Neo.SmartContract.Framework.List<ByteString>)StdLib.Deserialize(existing);
            bool exists = false;
            for (int i = 0; i < accounts.Count; i++) { if (accounts[i] == accountId) { exists = true; break; } }
            if (!exists) accounts.Add(accountId);
            map.Put(address, StdLib.Serialize(accounts));
        }

        private static void RemoveFromManagerIndex(UInt160 address, ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ManagerIndexPrefix);
            ByteString? existing = map.Get(address);
            if (existing == null) return;
            Neo.SmartContract.Framework.List<ByteString> oldAccounts = (Neo.SmartContract.Framework.List<ByteString>)StdLib.Deserialize(existing);
            Neo.SmartContract.Framework.List<ByteString> newAccounts = new Neo.SmartContract.Framework.List<ByteString>();
            for (int i = 0; i < oldAccounts.Count; i++)
            {
                if (oldAccounts[i] != accountId) newAccounts.Add(oldAccounts[i]);
            }
            if (newAccounts.Count == 0) map.Delete(address);
            else map.Put(address, StdLib.Serialize(newAccounts));
        }

        /// <summary>
        /// Returns all account IDs where the given address is an admin.
        /// </summary>
        [Safe]
        public static Neo.SmartContract.Framework.List<ByteString> GetAccountsByAdmin(UInt160 address)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, AdminIndexPrefix);
            ByteString? data = map.Get(address);
            if (data == null) return new Neo.SmartContract.Framework.List<ByteString>();
            return (Neo.SmartContract.Framework.List<ByteString>)StdLib.Deserialize(data);
        }

        /// <summary>
        /// Returns all account IDs where the given address is a manager.
        /// </summary>
        [Safe]
        public static Neo.SmartContract.Framework.List<ByteString> GetAccountsByManager(UInt160 address)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ManagerIndexPrefix);
            ByteString? data = map.Get(address);
            if (data == null) return new Neo.SmartContract.Framework.List<ByteString>();
            return (Neo.SmartContract.Framework.List<ByteString>)StdLib.Deserialize(data);
        }

        /// <summary>
        /// Returns all currently bound abstract-account addresses where the given address is an admin.
        /// </summary>
        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetAccountAddressesByAdmin(UInt160 address)
        {
            Neo.SmartContract.Framework.List<ByteString> accountIds = GetAccountsByAdmin(address);
            Neo.SmartContract.Framework.List<UInt160> addresses = new Neo.SmartContract.Framework.List<UInt160>();
            for (int i = 0; i < accountIds.Count; i++)
            {
                UInt160 accountAddress = GetAccountAddress(accountIds[i]);
                if (accountAddress != null && accountAddress != UInt160.Zero)
                {
                    addresses.Add(accountAddress);
                }
            }
            return addresses;
        }

        /// <summary>
        /// Returns all currently bound abstract-account addresses where the given address is a manager.
        /// </summary>
        [Safe]
        public static Neo.SmartContract.Framework.List<UInt160> GetAccountAddressesByManager(UInt160 address)
        {
            Neo.SmartContract.Framework.List<ByteString> accountIds = GetAccountsByManager(address);
            Neo.SmartContract.Framework.List<UInt160> addresses = new Neo.SmartContract.Framework.List<UInt160>();
            for (int i = 0; i < accountIds.Count; i++)
            {
                UInt160 accountAddress = GetAccountAddress(accountIds[i]);
                if (accountAddress != null && accountAddress != UInt160.Zero)
                {
                    addresses.Add(accountAddress);
                }
            }
            return addresses;
        }
    }
}
