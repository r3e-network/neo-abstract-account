const fs = require('fs');

let file = 'contracts/AbstractAccount.Oracle.cs';
let content = fs.readFileSync(file, 'utf8');

// I already refactored AssertCanRequestDomeActivation in an earlier step on this branch!
// Wait, looking at the code above, the nativeAuthorized check is STILL there. My earlier refactor to unify it was lost when I did git restore!
// I need to fix it again!

content = content.replace(/private static void AssertCanRequestDomeActivation\(ByteString accountId\)\s*\{\s*bool nativeAuthorized = CheckNativeSignatures\(GetAdmins\(accountId\), GetAdminThreshold\(accountId\)\)\s*\|\| CheckNativeSignatures\(GetManagers\(accountId\), GetManagerThreshold\(accountId\)\)\s*\|\| CheckNativeSignatures\(GetDomeAccounts\(accountId\), GetDomeThreshold\(accountId\)\);\s*if \(nativeAuthorized\) return;\s*UInt160\[\] explicitSigners = GetMetaTxContextSigners\(accountId\);\s*if \(explicitSigners\.Length > 0 && Runtime\.CallingScriptHash == Runtime\.ExecutingScriptHash\)\s*\{\s*bool metaAuthorized = CheckMixedSignatures\(GetAdmins\(accountId\), GetAdminThreshold\(accountId\), explicitSigners\)\s*\|\| CheckMixedSignatures\(GetManagers\(accountId\), GetManagerThreshold\(accountId\), explicitSigners\)\s*\|\| CheckMixedSignatures\(GetDomeAccounts\(accountId\), GetDomeThreshold\(accountId\), explicitSigners\);\s*if \(metaAuthorized\) return;\s*\}\s*ExecutionEngine\.Assert\(false, "Unauthorized"\);\s*\}/g,
`private static void AssertCanRequestDomeActivation(ByteString accountId)
        {
            UInt160[] explicitSigners = new UInt160[0];
            if (Runtime.CallingScriptHash == Runtime.ExecutingScriptHash)
            {
                explicitSigners = GetMetaTxContextSigners(accountId);
            }

            bool isAuthorized = CheckMixedSignatures(GetAdmins(accountId), GetAdminThreshold(accountId), explicitSigners)
                || CheckMixedSignatures(GetManagers(accountId), GetManagerThreshold(accountId), explicitSigners)
                || CheckMixedSignatures(GetDomeAccounts(accountId), GetDomeThreshold(accountId), explicitSigners);
            
            ExecutionEngine.Assert(isAuthorized, "Unauthorized");
        }`);

fs.writeFileSync(file, content);
