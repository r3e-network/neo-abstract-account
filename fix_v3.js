const fs = require('fs');

let file = 'contracts/v3/UnifiedSmartWalletV3.cs';
let content = fs.readFileSync(file, 'utf8');

// Add the missing using directive for DisplayName
content = content.replace(/using Neo\.SmartContract\.Framework\.Services;/g, 'using Neo.SmartContract.Framework.Services;\nusing System.ComponentModel;');

fs.writeFileSync(file, content);
