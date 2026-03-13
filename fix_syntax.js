const fs = require('fs');

let file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let content = fs.readFileSync(file, 'utf8');

// Fix nullable syntax error in ExecutionAndPermissions
content = content.replace(/bool isAuthorized = \(bool\)Contract\.Call\(\s*customVerifier,\s*"validateSignature",\s*CallFlags\.ReadOnly,\s*new object\[\] \{ accountId, targetContract, method, signature \}\);/g, 
`bool isAuthorized = (bool)Contract.Call(
                    customVerifier,
                    "validateSignature",
                    CallFlags.ReadOnly,
                    new object[] { accountId, targetContract, method, args, signature });`);
                    
// Make sure it compiles
fs.writeFileSync(file, content);

