using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        // ========================================================================
        // 3. Core Routing: Validation and Execution (aligned with 4337 Validate & Call)
        // ========================================================================

        /// <summary>
        /// Canonical execution entrypoint for a single V3 user operation.
        /// </summary>
        /// <remarks>
        /// This path consumes the nonce, checks the verifier or backup-owner witness,
        /// runs the pre-hook, executes the target contract call, and then runs the post-hook.
        /// </remarks>
        public static object ExecuteUserOp(UInt160 accountId, UserOperation op)
        {
            ExecutionEngine.Assert(!IsAnyExecutionActive(), "Reentrant call rejected");

            AccountState state = GetAccountState(accountId);
            AssertNoMarketEscrow(accountId);

            SetExecutionLock();

            try
            {
                // [ValidateUserOp phase]
                ExecutionEngine.Assert(Runtime.Time <= op.Deadline, "UserOp expired");
                ConsumeNonce(accountId, op.Nonce);

                if (state.Verifier != UInt160.Zero)
                {
                    // Delegate to plugin for signature verification (e.g., ecrecover or TEE hardware)
                    bool isValid = (bool)Contract.Call(state.Verifier, "validateSignature", CallFlags.ReadOnly, new object[] { accountId, op });
                    ExecutionEngine.Assert(isValid, "Verifier rejected signature");
                }
                else
                {
                    // No plugin: fall back to backup owner direct authorization.
                    // accountId is still used as virtual account identity,
                    // but actual control comes from BackupOwner's native N3 witness.
                    ExecutionEngine.Assert(state.BackupOwner != null && state.BackupOwner != UInt160.Zero, "Native fallback requires backup owner");
                    ExecutionEngine.Assert(Runtime.CheckWitness(state.BackupOwner!), "Native witness failed");
                }

                // Security defense: if account is in stolen escape state, normal operations interrupt escape
                if (state.EscapeTriggeredAt > 0)
                {
                    state.EscapeTriggeredAt = 0;
                    byte[] key = Helper.Concat(Prefix_AccountState, (byte[])accountId);
                    Storage.Put(Storage.CurrentContext, key, StdLib.Serialize(state));
                }

                // [Hook phase] pre-execution hook
                if (state.HookId != UInt160.Zero)
                {
                    SetHookExecutionContext(accountId, state.HookId);
                    try
                    {
                        Contract.Call(state.HookId, "preExecute", CallFlags.All, new object[] { accountId, op });
                    }
                    catch
                    {
                        ClearHookExecutionContext(accountId);
                        throw;
                    }
                }

                // [Execution phase]
                // Write context lock to allow TargetContract to do reverse CheckWitness verification
                SetVerifyContext(accountId, op.TargetContract);
                try
                {
                    // Dynamically call target contract
                    object result = Contract.Call(op.TargetContract, op.Method, CallFlags.All, op.Args);

                    // [Hook phase] post-execution hook
                    if (state.HookId != UInt160.Zero)
                    {
                        Contract.Call(state.HookId, "postExecute", CallFlags.All, new object[] { accountId, op, result });
                    }

                    return result;
                }
                finally
                {
                    ClearVerifyContext(accountId);
                    if (state.HookId != UInt160.Zero)
                    {
                        ClearHookExecutionContext(accountId);
                    }
                }
            }
            finally
            {
                ClearExecutionLock();
            }
        }

        // ========================================================================
        // 3.1 Intent Engine: Batch Execution
        // ========================================================================

        /// <summary>
        /// Executes multiple user operations in sequence under the same account context.
        /// </summary>
        public static object[] ExecuteUserOps(UInt160 accountId, UserOperation[] ops)
        {
            object[] results = new object[ops.Length];
            for (int i = 0; i < ops.Length; i++)
            {
                results[i] = ExecuteUserOp(accountId, ops[i]);
            }
            return results;
        }

        // ========================================================================
        // 4. Replay Protection (ERC-4337 2D Nonce spec)
        // ========================================================================

        private static void ConsumeNonce(UInt160 accountId, BigInteger nonce)
        {
            BigInteger MAX_2D_NONCE = 1_000_000_000_000_000_000;

            if (nonce >= MAX_2D_NONCE)
            {
                // UUID / random salt mode
                byte[] key = Helper.Concat(Prefix_Nonce, (byte[])accountId);
                key = Helper.Concat(key, nonce.ToByteArray());
                ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, key) == null, "Salt already used");
                Storage.Put(Storage.CurrentContext, key, new byte[] { 1 });
            }
            else
            {
                // Strictly follow ERC-4337 channel incrementing mode (Key = Channel, Seq = Sequence)
                BigInteger channel = nonce >> 64;
                BigInteger sequence = nonce & 0xFFFFFFFFFFFFFFFF;

                byte[] key = Helper.Concat(Prefix_Nonce, (byte[])accountId);
                key = Helper.Concat(key, channel.ToByteArray());

                ByteString? currentData = Storage.Get(Storage.CurrentContext, key);
                BigInteger currentSeq = currentData == null ? 0 : (BigInteger)currentData;

                ExecutionEngine.Assert(sequence == currentSeq, "Invalid sequence for channel");
                Storage.Put(Storage.CurrentContext, key, currentSeq + 1);
            }
        }
    }
}
