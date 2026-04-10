using System.Numerics;
using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services;

namespace AbstractAccount
{
    public partial class UnifiedSmartWallet
    {
        // ========================================================================
        // 8. Paymaster: Sponsored / Gasless Transactions
        // ========================================================================

        // Neo N3 on-chain paymaster flow:
        // 1. Relay calls ExecuteSponsoredUserOp with paymaster + sponsor details
        // 2. Relay may optionally preflight ValidatePaymasterOp off-chain before submission
        // 3. Core executes the UserOp normally (verifier + hooks + target call)
        // 4. Core calls paymaster.settleReimbursement for atomic policy enforcement + relay reimbursement

        /// <summary>
        /// Executes a single user operation with paymaster sponsorship.
        /// The relay (transaction sender) is reimbursed from the sponsor's deposit
        /// held in the paymaster contract after successful execution.
        /// </summary>
        /// <param name="accountId">The AA account executing the operation</param>
        /// <param name="op">The user operation to execute</param>
        /// <param name="paymaster">The paymaster contract hash</param>
        /// <param name="sponsor">The sponsor address funding the operation</param>
        /// <param name="reimbursementAmount">GAS amount (in fractions) to reimburse the relay</param>
        /// <returns>The result of the target contract call</returns>
        public static object ExecuteSponsoredUserOp(
            UInt160 accountId,
            UserOperation op,
            UInt160 paymaster,
            UInt160 sponsor,
            BigInteger reimbursementAmount)
        {
            ExecutionEngine.Assert(accountId != null && accountId != UInt160.Zero, "AccountId required");
            ExecutionEngine.Assert(paymaster != null && paymaster != UInt160.Zero, "Paymaster required");
            ExecutionEngine.Assert(sponsor != null && sponsor != UInt160.Zero, "Sponsor required");
            ExecutionEngine.Assert(reimbursementAmount > 0, "Reimbursement amount required");

            // Verify the paymaster is trusted: its AuthorizedCore must point back to this contract.
            // Prevents arbitrary contracts from being passed as paymasters.
            UInt160 paymasterCore = (UInt160)Contract.Call(paymaster!, "authorizedCore", CallFlags.ReadOnly, new object[] { });
            ExecutionEngine.Assert(paymasterCore == Runtime.ExecutingScriptHash, "Paymaster not bound to this core");

            // Execute the operation (full validation + execution + hooks)
            object result = ExecuteUserOp(accountId!, op);

            // Settle: deduct from sponsor deposit and reimburse relay.
            // Settlement does full policy validation atomically — no separate pre-check needed.
            Contract.Call(paymaster!, "settleReimbursement", CallFlags.All,
                new object[] { sponsor!, accountId!, op.TargetContract, op.Method,
                               Runtime.Transaction.Sender!, reimbursementAmount });

            OnSponsoredUserOpExecuted(accountId!, paymaster!, sponsor!, Runtime.Transaction.Sender!, reimbursementAmount);
            return result;
        }

        /// <summary>
        /// Executes multiple user operations as an atomic batch with paymaster sponsorship.
        /// A single reimbursement covers the entire batch. The settlement validates the first
        /// op's target/method against the policy; all ops in the batch must target the same
        /// contract and method.
        /// </summary>
        public static object[] ExecuteSponsoredUserOps(
            UInt160 accountId,
            UserOperation[] ops,
            UInt160 paymaster,
            UInt160 sponsor,
            BigInteger reimbursementAmount)
        {
            ExecutionEngine.Assert(accountId != null && accountId != UInt160.Zero, "AccountId required");
            ExecutionEngine.Assert(paymaster != null && paymaster != UInt160.Zero, "Paymaster required");
            ExecutionEngine.Assert(sponsor != null && sponsor != UInt160.Zero, "Sponsor required");
            ExecutionEngine.Assert(reimbursementAmount > 0, "Reimbursement amount required");
            ExecutionEngine.Assert(ops != null && ops.Length > 0, "Operations required");

            // Verify the paymaster is trusted
            UInt160 paymasterCore = (UInt160)Contract.Call(paymaster!, "authorizedCore", CallFlags.ReadOnly, new object[] { });
            ExecutionEngine.Assert(paymasterCore == Runtime.ExecutingScriptHash, "Paymaster not bound to this core");

            // Enforce all ops share the same target/method (policy is checked against these)
            for (int i = 1; i < ops!.Length; i++)
            {
                ExecutionEngine.Assert(ops[i].TargetContract == ops[0].TargetContract, "Batch ops must share target contract");
                ExecutionEngine.Assert(ops[i].Method == ops[0].Method, "Batch ops must share method");
            }

            // Execute all operations atomically
            object[] results = ExecuteUserOps(accountId!, ops);

            // Single settlement for entire batch
            Contract.Call(paymaster!, "settleReimbursement", CallFlags.All,
                new object[] { sponsor!, accountId!, ops[0].TargetContract, ops[0].Method,
                               Runtime.Transaction.Sender!, reimbursementAmount });

            OnSponsoredUserOpExecuted(accountId!, paymaster!, sponsor!, Runtime.Transaction.Sender!, reimbursementAmount);
            return results;
        }
    }
}
