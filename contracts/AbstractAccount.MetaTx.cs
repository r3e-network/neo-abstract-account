using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        private static byte[] GetNonceKey(ByteString accountId, UInt160 signer)
        {
            return Helper.Concat(Helper.Concat(NoncePrefix, GetStorageKey(accountId)), signer);
        }

        [Safe]
        public static BigInteger GetNonce(UInt160 signer)
        {
            return GetNonceForAccount((ByteString)signer, signer);
        }

        [Safe]
        public static BigInteger GetNonceForAccount(ByteString accountId, UInt160 signer)
        {
            byte[] key = GetNonceKey(accountId, signer);
            ByteString data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetNonceForAddress(UInt160 accountAddress, UInt160 signer)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetNonceForAccount(accountId, signer);
        }

        private static void IncrementNonce(ByteString accountId, UInt160 signer)
        {
            byte[] key = GetNonceKey(accountId, signer);
            BigInteger current = GetNonceForAccount(accountId, signer);
            Storage.Put(Storage.CurrentContext, key, current + 1);
        }

        [Safe]
        public static ByteString ComputeArgsHash(object[] args)
        {
            byte[] argsSerialized = (byte[])StdLib.Serialize(args);
            return CryptoLib.Keccak256((ByteString)argsSerialized);
        }

        public static object ExecuteMetaTx(
            ByteString accountId,
            Neo.SmartContract.Framework.List<ByteString> uncompressedPubKeys,
            UInt160 targetContract,
            string method,
            object[] args,
            ByteString argsHash,
            BigInteger nonce,
            BigInteger deadline,
            Neo.SmartContract.Framework.List<ByteString> signatures)
        {
            return ExecuteMetaTxInternal(accountId, uncompressedPubKeys, targetContract, method, args, argsHash, nonce, deadline, signatures);
        }

        public static object ExecuteMetaTxByAddress(
            UInt160 accountAddress,
            Neo.SmartContract.Framework.List<ByteString> uncompressedPubKeys,
            UInt160 targetContract,
            string method,
            object[] args,
            ByteString argsHash,
            BigInteger nonce,
            BigInteger deadline,
            Neo.SmartContract.Framework.List<ByteString> signatures)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return ExecuteMetaTxInternal(accountId, uncompressedPubKeys, targetContract, method, args, argsHash, nonce, deadline, signatures);
        }

        private static object ExecuteMetaTxInternal(
            ByteString accountId,
            Neo.SmartContract.Framework.List<ByteString> uncompressedPubKeys,
            UInt160 targetContract,
            string method,
            object[] args,
            ByteString argsHash,
            BigInteger nonce,
            BigInteger deadline,
            Neo.SmartContract.Framework.List<ByteString> signatures)
        {
            AssertAccountExists(accountId);
            ExecutionEngine.Assert(uncompressedPubKeys != null && signatures != null, "Missing signers");
            ExecutionEngine.Assert(uncompressedPubKeys.Count == signatures.Count, "Mismatched pubkeys and signatures");
            ExecutionEngine.Assert(signatures.Count > 0, "At least one signature required");

            ExecutionEngine.Assert(nonce >= 0, "Invalid nonce");
            BigInteger normalizedDeadline = NormalizeDeadlineToMs(deadline);
            ExecutionEngine.Assert((BigInteger)Runtime.Time <= normalizedDeadline, "Signature expired");

            // We use the first signer's nonce to track execution
            UInt160 primarySignerHash = DeriveEthAddress(uncompressedPubKeys[0]);
            BigInteger currentNonce = GetNonceForAccount(accountId, primarySignerHash);
            ExecutionEngine.Assert(nonce == currentNonce, "Invalid Nonce");

            ToBytes32(argsHash, "Invalid args hash length");
            byte[] expectedArgsHash = (byte[])ComputeArgsHash(args);

            byte[] domainSeparator = BuildDomainSeparator(Runtime.GetNetwork(), Runtime.ExecutingScriptHash);
            byte[] structHash = BuildMetaTxStructHash(accountId, targetContract, method, expectedArgsHash, nonce, deadline);
            byte[] typedDataPayload = ConcatBytes(new byte[] { 0x19, 0x01 }, domainSeparator, structHash);

            UInt160[] recoveredSigners = new UInt160[signatures.Count];
            for (int i = 0; i < signatures.Count; i++)
            {
                byte[] sigBytes = (byte[])signatures[i];
                ExecutionEngine.Assert(sigBytes.Length == 64, "Invalid signature length");

                ECPoint compressedPubKey = CompressPubKey(uncompressedPubKeys[i]);
                bool isValid = CryptoLib.VerifyWithECDsa(
                    (ByteString)typedDataPayload,
                    compressedPubKey,
                    signatures[i],
                    NamedCurveHash.secp256k1Keccak256
                );
                ExecutionEngine.Assert(isValid, "Invalid EIP-712 signature");
                recoveredSigners[i] = DeriveEthAddress(uncompressedPubKeys[i]);
            }

            IncrementNonce(accountId, primarySignerHash);
            CheckPermissionsAndExecute(accountId, recoveredSigners, targetContract, method, args);

            // Scope authenticated signer by account for this execution path.
            EnterExecution(accountId);
            SetMetaTxContext(accountId, primarySignerHash);
            SetVerifyContext(accountId, targetContract);
            try
            {
                OnExecute(accountId, targetContract, method, args);
                return DispatchContractCall(targetContract, method, args);
            }
            finally
            {
                ClearVerifyContext(accountId);
                ClearMetaTxContext(accountId);
                ExitExecution(accountId);
            }
        }

        private static BigInteger NormalizeDeadlineToMs(BigInteger deadline)
        {
            ExecutionEngine.Assert(deadline > 0, "Invalid deadline");
            // Frontends/relayers commonly sign unix-seconds deadlines; normalize to ms for Neo Runtime.Time.
            if (deadline < 1000000000000) return deadline * 1000;
            return deadline;
        }

        private static byte[] BuildDomainSeparator(uint network, UInt160 verifyingContract)
        {
            byte[] encoded = ConcatBytes(
                Eip712DomainTypeHash,
                Eip712NameHash,
                Eip712VersionHash,
                ToUint256Word((BigInteger)network),
                ToAddressWord(verifyingContract)
            );
            return (byte[])CryptoLib.Keccak256((ByteString)encoded);
        }

        private static byte[] BuildMetaTxStructHash(
            ByteString accountId,
            UInt160 targetContract,
            string method,
            byte[] argsHash,
            BigInteger nonce,
            BigInteger deadline)
        {
            byte[] methodHash = (byte[])CryptoLib.Keccak256((ByteString)method);
            byte[] accountIdHash = (byte[])CryptoLib.Keccak256(accountId);
            byte[] encoded = ConcatBytes(
                MetaTxTypeHash,
                accountIdHash,
                ToAddressWord(targetContract),
                methodHash,
                argsHash,
                ToUint256Word(nonce),
                ToUint256Word(deadline)
            );
            return (byte[])CryptoLib.Keccak256((ByteString)encoded);
        }

        private static byte[] ToAddressWord(UInt160 value)
        {
            byte[] address = (byte[])value;
            ExecutionEngine.Assert(address.Length == 20, "Invalid address length");
            byte[] result = new byte[32];
            for (int i = 0; i < 20; i++)
            {
                result[12 + i] = address[19 - i];
            }
            return result;
        }

        private static byte[] ToUint256Word(BigInteger value)
        {
            ExecutionEngine.Assert(value >= 0, "Invalid uint256");
            byte[] little = value.ToByteArray();
            int length = little.Length;
            if (length > 0 && little[length - 1] == 0)
            {
                length--;
            }
            ExecutionEngine.Assert(length <= 32, "uint256 overflow");

            byte[] result = new byte[32];
            for (int i = 0; i < length; i++)
            {
                result[31 - i] = little[i];
            }
            return result;
        }

        private static byte[] ToBytes32(ByteString value, string error)
        {
            byte[] raw = (byte[])value;
            ExecutionEngine.Assert(raw.Length == 32, error);
            return raw;
        }

        private static bool ByteArrayEquals(byte[] left, byte[] right)
        {
            if (left.Length != right.Length) return false;
            for (int i = 0; i < left.Length; i++)
            {
                if (left[i] != right[i]) return false;
            }
            return true;
        }

        private static byte[] ConcatBytes(params byte[][] chunks)
        {
            int total = 0;
            for (int i = 0; i < chunks.Length; i++)
            {
                total += chunks[i].Length;
            }

            byte[] result = new byte[total];
            int offset = 0;
            for (int i = 0; i < chunks.Length; i++)
            {
                byte[] chunk = chunks[i];
                for (int j = 0; j < chunk.Length; j++)
                {
                    result[offset + j] = chunk[j];
                }
                offset += chunk.Length;
            }
            return result;
        }

        private static UInt160 DeriveEthAddress(ByteString pkString)
        {
            byte[] pk = (byte[])pkString;
            if (pk.Length == 65 && pk[0] == 0x04)
            {
                byte[] temp = new byte[64];
                for (int i = 0; i < 64; i++) temp[i] = pk[i + 1];
                pk = temp;
            }
            ExecutionEngine.Assert(pk.Length == 64, "Invalid pubkey length");

            byte[] hash = (byte[])CryptoLib.Keccak256((ByteString)pk);
            byte[] ethAddrBytes = new byte[20];
            for (int i = 0; i < 20; i++)
            {
                ethAddrBytes[i] = hash[31 - i];
            }
            return (UInt160)ethAddrBytes;
        }

        private static ECPoint CompressPubKey(ByteString pkString)
        {
            byte[] pk = (byte[])pkString;
            if (pk.Length == 64)
            {
                byte[] temp = new byte[65];
                temp[0] = 0x04;
                for (int i = 0; i < 64; i++) temp[i + 1] = pk[i];
                pk = temp;
            }
            ExecutionEngine.Assert(pk.Length == 65 && pk[0] == 0x04, "Invalid pubkey length for compression");

            byte[] compressed = new byte[33];
            compressed[0] = (pk[64] % 2 == 0) ? (byte)0x02 : (byte)0x03;
            for (int i = 0; i < 32; i++) compressed[i + 1] = pk[i + 1];

            return (ECPoint)(ByteString)compressed;
        }
    }
}
