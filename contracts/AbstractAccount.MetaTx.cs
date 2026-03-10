using System.Numerics;
using Neo;
using Neo.SmartContract;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    // Meta-transaction helpers bridge Ethereum-style EIP-712 signatures into the same AA permission engine used by
    // native Neo witnesses. The recovered addresses are treated as signer identities, then checked against the stored
    // admin / manager / dome quorums before the downstream contract call is dispatched.
    public partial class UnifiedSmartWallet
    {
        private static byte[] GetNonceKey(ByteString accountId)
        {
            return Helper.Concat(NoncePrefix, GetStorageKey(accountId));
        }

        /// <summary>
        /// Returns the current account-scoped meta-transaction nonce for the provided signer-style identifier. In this
        /// contract the nonce is intentionally stored per account, not per recovered signer, to block signer-set replay.
        /// </summary>
        [Safe]
        public static BigInteger GetNonce(UInt160 signer)
        {
            return GetNonceForAccount((ByteString)signer, signer);
        }

        /// <summary>
        /// Returns the current meta-transaction nonce for a logical account. The <paramref name="signer"/> parameter is
        /// kept for API compatibility, but the stored nonce is account-scoped.
        /// </summary>
        [Safe]
        public static BigInteger GetNonceForAccount(ByteString accountId, UInt160 signer)
        {
            byte[] key = GetNonceKey(accountId);
            ByteString? data = Storage.Get(Storage.CurrentContext, key);
            return data == null ? 0 : (BigInteger)data;
        }

        [Safe]
        public static BigInteger GetNonceForAddress(UInt160 accountAddress, UInt160 signer)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return GetNonceForAccount(accountId, signer);
        }

        private static void IncrementNonce(ByteString accountId)
        {
            byte[] key = GetNonceKey(accountId);
            BigInteger current = GetNonceForAccount(accountId, UInt160.Zero);
            Storage.Put(Storage.CurrentContext, key, current + 1);
        }

        /// <summary>
        /// Serializes the contract-call arguments exactly the way the contract expects and returns their Keccak-256 hash.
        /// Frontends and relayers should use this helper so their typed-data payload matches on-chain verification.
        /// </summary>
        [Safe]
        public static ByteString ComputeArgsHash(object[] args)
        {
            byte[] argsSerialized = (byte[])StdLib.Serialize(args);
            return CryptoLib.Keccak256((ByteString)argsSerialized);
        }

        /// <summary>
        /// EIP-712 execution path addressed by logical account id. The recovered Ethereum addresses are converted into a
        /// temporary signer set, then authorized against the same stored roles and policies as native execution.
        /// </summary>
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

        /// <summary>
        /// Address-based convenience wrapper for ExecuteMetaTx. This is the common route used by the relay/front-end once
        /// the account has been bound to its deterministic proxy address.
        /// </summary>
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
            // Validate the raw signer material before any expensive signature checks.
            ExecutionEngine.Assert(uncompressedPubKeys != null && signatures != null, "Missing signers");
            Neo.SmartContract.Framework.List<ByteString> signerPubKeys = uncompressedPubKeys!;
            Neo.SmartContract.Framework.List<ByteString> signerSignatures = signatures!;
            ExecutionEngine.Assert(signerPubKeys.Count == signerSignatures.Count, "Mismatched pubkeys and signatures");
            ExecutionEngine.Assert(signerSignatures.Count > 0, "At least one signature required");

            // Validate uncompressed pubkey length (65 bytes: 0x04 + 32-byte X + 32-byte Y)
            for (int i = 0; i < signerPubKeys.Count; i++)
            {
                ExecutionEngine.Assert(signerPubKeys[i] != null && signerPubKeys[i].Length == 65, "Invalid pubkey length");
            }

            ExecutionEngine.Assert(nonce >= 0, "Invalid nonce");
            BigInteger normalizedDeadline = NormalizeDeadlineToMs(deadline);
            ExecutionEngine.Assert((BigInteger)Runtime.Time <= normalizedDeadline, "Signature expired");

            // Replay protection is account-scoped to prevent signer-order/signer-selection replays. A previously used
            // nonce cannot be replayed by swapping one valid signer for another inside the same quorum.
            BigInteger currentNonce = GetNonceForAccount(accountId, UInt160.Zero);
            ExecutionEngine.Assert(nonce == currentNonce, "Invalid Nonce");

            byte[] providedArgsHash = ToBytes32(argsHash, "Invalid args hash length");
            byte[] expectedArgsHash = (byte[])ComputeArgsHash(args);
            ExecutionEngine.Assert(ByteArrayEquals(providedArgsHash, expectedArgsHash), "Args hash mismatch");

            // Rebuild the exact EIP-712 digest that the frontend/relayer signed: domain separator + struct hash.
            byte[] domainSeparator = BuildDomainSeparator(Runtime.GetNetwork(), Runtime.ExecutingScriptHash);
            UInt160 accountAddress = ResolveMetaTxIdentityAddress(accountId);
            byte[] structHash = BuildMetaTxStructHash(accountAddress, targetContract, method, expectedArgsHash, nonce, deadline);
            byte[] typedDataPayload = ConcatBytes(new byte[] { 0x19, 0x01 }, domainSeparator, structHash);

            UInt160[] recoveredSigners = new UInt160[signerSignatures.Count];
            for (int i = 0; i < signerSignatures.Count; i++)
            {
                byte[] sigBytes = (byte[])signerSignatures[i];
                ExecutionEngine.Assert(sigBytes.Length == 64, "Invalid signature length");

                ECPoint compressedPubKey = CompressPubKey(signerPubKeys[i]);
                bool isValid = CryptoLib.VerifyWithECDsa(
                    (ByteString)typedDataPayload,
                    compressedPubKey,
                    signerSignatures[i],
                    NamedCurveHash.secp256k1Keccak256
                );
                ExecutionEngine.Assert(isValid, "Invalid EIP-712 signature");
                recoveredSigners[i] = DeriveEthAddress(signerPubKeys[i]);
            }

            // Consume the nonce before dispatch so a nested or replayed execution cannot reuse the same signed payload.
            IncrementNonce(accountId);
            CheckPermissionsAndExecute(accountId, recoveredSigners, targetContract, method, args);

            // Scope the recovered signer set and verify target to this single execution path only. Admin/oracle helpers
            // can consult that context during internal self-calls, but it is cleared immediately afterward.
            EnterExecution(accountId);
            SetMetaTxContext(accountId, recoveredSigners);
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
            UInt160 accountAddress,
            UInt160 targetContract,
            string method,
            byte[] argsHash,
            BigInteger nonce,
            BigInteger deadline)
        {
            byte[] methodHash = (byte[])CryptoLib.Keccak256((ByteString)method);
            byte[] encoded = ConcatBytes(
                MetaTxTypeHash,
                ToAddressWord(accountAddress),
                ToAddressWord(targetContract),
                methodHash,
                argsHash,
                ToUint256Word(nonce),
                ToUint256Word(deadline)
            );
            return (byte[])CryptoLib.Keccak256((ByteString)encoded);
        }

        private static UInt160 ResolveMetaTxIdentityAddress(ByteString accountId)
        {
            UInt160 boundAddress = GetAccountAddress(accountId);
            if (boundAddress != null && boundAddress != UInt160.Zero)
            {
                return boundAddress;
            }
            return GetDeterministicAccountAddress(accountId);
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
