const fs = require('fs');

// We are going to carefully refactor the main entrypoint into a single ExecuteUserOp to match ERC-4337 intent.
let file = 'contracts/AbstractAccount.ExecutionAndPermissions.cs';
let content = fs.readFileSync(file, 'utf8');

// The ultimate execution method. We rename Execute to ExecuteUserOp
content = content.replace(/public static object Execute\(ByteString accountId, UInt160 targetContract, string method, object\[\] args\)\s*\{\s*\/\/\s*1\. Authenticate signer\(s\)/g, 
`public static object ExecuteUserOp(ByteString accountId, UInt160 targetContract, string method, object[] args)
        {
            // 1. Authenticate signer(s)`);

content = content.replace(/public static object ExecuteByAddress\(UInt160 accountAddress, UInt160 targetContract, string method, object\[\] args\)\s*\{\s*ByteString accountId = ResolveAccountIdByAddress\(accountAddress\);\s*return Execute\(accountId, targetContract, method, args\);\s*\}/g,
`public static object ExecuteUserOpByAddress(UInt160 accountAddress, UInt160 targetContract, string method, object[] args)
        {
            ByteString accountId = ResolveAccountIdByAddress(accountAddress);
            return ExecuteUserOp(accountId, targetContract, method, args);
        }`);
        
fs.writeFileSync(file, content);

file = 'contracts/AbstractAccount.cs';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/"execute",\s*"executeByAddress",\s*"executeMetaTx",\s*"executeMetaTxByAddress"/g, '"executeUserOp",\n        "executeUserOpByAddress"');
fs.writeFileSync(file, content);
