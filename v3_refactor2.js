const fs = require('fs');

let file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let content = fs.readFileSync(file, 'utf8');

// Instead of passing a signature in args, we'll keep the `object[] args` and just rely on `Runtime.CheckWitness(owner)` for N3 auth, and route to plugins using the `customVerifier` if it exists.

// Refactoring CheckPermissionsAndExecuteNative to handle the new UserOp verification structure
let newAuthLogic = `private static void CheckPermissionsAndExecuteNative(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            AssertAccountExists(accountId);

            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                bool isAuthorized = (bool)Contract.Call(
                    customVerifier,
                    "verifyExecution",
                    CallFlags.ReadOnly,
                    new object[] { accountId });
                ExecutionEngine.Assert(isAuthorized, "Unauthorized by custom verifier");
                EnforceRestrictions(accountId, targetContract, method, args, false);
                UpdateLastActiveTimestamp(accountId);
                return;
            }

            int threshold = GetThreshold(accountId);
            bool isSigner = CheckNativeSignatures(GetSigners(accountId), threshold);
            
            ExecutionEngine.Assert(isSigner, "Unauthorized");
            EnforceRestrictions(accountId, targetContract, method, args, threshold > 0);
            UpdateLastActiveTimestamp(accountId);
        }`;

content = content.replace(/private static void CheckPermissionsAndExecuteNative[\s\S]*?UpdateLastActiveTimestamp\(accountId\);\s*\}/m, newAuthLogic);

fs.writeFileSync(file, content);
