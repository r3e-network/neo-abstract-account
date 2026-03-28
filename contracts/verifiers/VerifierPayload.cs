using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount.Verifiers
{
    internal static class VerifierPayload
    {
        internal static byte[] BuildPayload(UInt160 accountId, UInt160 targetContract, string method, object[] args, BigInteger nonce, BigInteger deadline)
        {
            byte[] argsSerialized = (byte[])StdLib.Serialize(args);
            byte[] methodBytes = (byte[])StdLib.Serialize(method);
            return Helper.Concat(
                Helper.Concat(
                    Helper.Concat(
                        Helper.Concat(
                            Helper.Concat(
                                ToUint256Word((BigInteger)Runtime.GetNetwork()),
                                (byte[])Runtime.ExecutingScriptHash
                            ),
                            Helper.Concat((byte[])accountId, (byte[])targetContract)
                        ),
                        methodBytes
                    ),
                    argsSerialized
                ),
                Helper.Concat(ToUint256Word(nonce), ToUint256Word(deadline))
            );
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
            ExecutionEngine.Assert(length <= 32, "Uint256 overflow");

            byte[] result = new byte[32];
            for (int i = 0; i < length; i++)
            {
                result[31 - i] = little[i];
            }
            return result;
        }
    }
}
