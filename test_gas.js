const fs = require('fs');

const files = [
    'contracts/AbstractAccount.ExecutionAndPermissions.cs',
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove gas optimization comments to shrink string table. Wait, comments don't go to string table.
    
    fs.writeFileSync(file, content);
}
