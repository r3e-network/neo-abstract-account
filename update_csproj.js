const fs = require('fs');
let file = 'contracts/v3/UnifiedSmartWalletV3.csproj';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/ncc -f/g, 'nccs');
fs.writeFileSync(file, content);
