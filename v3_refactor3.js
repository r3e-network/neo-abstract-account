const fs = require('fs');

let file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let content = fs.readFileSync(file, 'utf8');

// Also update the Verification method
content = content.replace(/public static bool Verify\(ByteString accountId\)\s*\{\s*UInt160 customVerifier = GetVerifierContract\(accountId\);\s*if \(customVerifier != null && customVerifier != UInt160\.Zero\)\s*\{\s*return CallCustomVerifierNative\(customVerifier, accountId\);\s*\}/g,
`public static bool Verify(ByteString accountId)
        {
            UInt160 customVerifier = GetVerifierContract(accountId);
            if (customVerifier != null && customVerifier != UInt160.Zero)
            {
                return (bool)Contract.Call(customVerifier, "verifyExecution", CallFlags.ReadOnly, new object[] { accountId });
            }`);

fs.writeFileSync(file, content);
