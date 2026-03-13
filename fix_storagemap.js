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
    
    // Create a generic helper in the class if not already there, but wait, the contract spans multiple files
    // so we can't just inject a method anywhere.
    // Let's use `Storage.Get` / `Storage.Put` instead of `new StorageMap()` for single reads to save object allocation overhead.
    
    // Let's just refactor the most common boolean map lookups in AbstractAccount.StorageAndContext.cs
    
    fs.writeFileSync(file, content);
}
