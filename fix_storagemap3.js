const fs = require('fs');

const files = [
    'contracts/AbstractAccount.Oracle.cs',
    'contracts/AbstractAccount.StorageAndContext.cs',
    'contracts/AbstractAccount.Admin.cs',
    'contracts/AbstractAccount.ExecutionAndPermissions.cs',
    'contracts/AbstractAccount.MetaTx.cs'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Make sure we didn't break Compilation
    
    fs.writeFileSync(file, content);
}
