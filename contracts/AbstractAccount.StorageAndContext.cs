using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private static readonly byte[] CanonicalShortAccountIdKeyPrefix = new byte[] { 0x00 };
        private static readonly byte[] CanonicalLongAccountIdKeyPrefix = new byte[] { 0x01 };

        private static void AssertValidAccountId(ByteString accountId)
        {
            ExecutionEngine.Assert(accountId != null && accountId.Length > 0 && accountId.Length <= 128, "Invalid accountId");
        }

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
            Neo.SmartContract.Framework.List<UInt160> admins,
            int adminThreshold,
            Neo.SmartContract.Framework.List<UInt160> managers,
            int managerThreshold)
        {
            AssertValidAccountId(accountId);
            AssertBootstrapAuthorization(admins, adminThreshold, managers, managerThreshold);

            StorageMap adminsMap = new StorageMap(Storage.CurrentContext, AdminsPrefix);
            ByteString? existing = adminsMap.Get(GetStorageKey(accountId));
            ExecutionEngine.Assert(existing == null, "Account already exists");

            SetAdminsInternal(accountId, admins, adminThreshold);
            SetManagersInternal(accountId, managers, managerThreshold);
            UpdateLastActiveTimestamp(accountId);

            var tx = (Transaction)Runtime.Transaction;
            OnAccountCreated(accountId, tx.Sender);
        }

        private static void BindAccountAddressInternal(ByteString accountId, UInt160 accountAddress)
        {
            AssertAccountExists(accountId);
            AssertValidAccountAddress(accountAddress);

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

        private static void AssertBootstrapAuthorization(
            Neo.SmartContract.Framework.List<UInt160> admins,
            int adminThreshold,
            Neo.SmartContract.Framework.List<UInt160> managers,
            int managerThreshold)
        {
            bool adminAuthorized = CheckNativeSignatures(admins, adminThreshold);
            ExecutionEngine.Assert(adminAuthorized, "Unauthorized account initialization");
        }

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

        private static UInt160 GetWalletContractHash()
        {
            ByteString? storedHash = Storage.Get(Storage.CurrentContext, ContractHashKey);
            if (storedHash != null && storedHash.Length == 20) return (UInt160)storedHash;
            return Runtime.ExecutingScriptHash;
        }
        private static bool IsAllowedProxyVerificationTransaction()
        {
            return IsSingleSelfCallScript((byte[])Runtime.Transaction.Script, (byte[])GetWalletContractHash());
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

        private static void EnterExecution(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            ByteString key = GetStorageKey(accountId);
            ByteString? active = map.Get(key);
            ExecutionEngine.Assert(active == null, "Execution in progress");
            map.Put(key, (ByteString)new byte[] { 1 });
        }

        private static void ExitExecution(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            map.Delete(GetStorageKey(accountId));
        }

        private static bool IsExecutionActive(ByteString accountId)
        {
            StorageMap map = new StorageMap(Storage.CurrentContext, ExecutionLockPrefix);
            return map.Get(GetStorageKey(accountId)) != null;
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

        private static void AssertNoExternalMutationDuringExecution(ByteString accountId)
        {
            if (!IsExecutionActive(accountId)) return;
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
    }
}
