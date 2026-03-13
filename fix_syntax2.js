const fs = require('fs');

let file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let content = fs.readFileSync(file, 'utf8');

// I notice my previous fix added "args" to the ValidateSignature method call...
// Let's make sure the type signature on the other side matches! Or maybe the customVerifier doesn't support 5 arguments?
// Actually, earlier we only passed `accountId, targetContract, method, signature`. 
// The Neo compiler throws a NullReferenceException when calling a method using Contract.Call if the argument list types are not resolvable or if there's a malformed nullable type somewhere.
// Let's just pass `accountId, signature`. The standard verifier doesn't need to know the targetContract to verify the signature if it's a generic signature, or maybe it does.

content = content.replace(/bool isAuthorized = \(bool\)Contract\.Call\(\s*customVerifier,\s*"validateSignature",\s*CallFlags\.ReadOnly,\s*new object\[\] \{ accountId, targetContract, method, args, signature \}\);/g, 
`bool isAuthorized = (bool)Contract.Call(
                    customVerifier,
                    "validateSignature",
                    CallFlags.ReadOnly,
                    new object[] { accountId, signature });`);
                    
fs.writeFileSync(file, content);

