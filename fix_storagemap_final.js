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

    // Remove unused StorageMap instantiation causing the compile error
    content = content.replace(/StorageMap whitelistMap = new StorageMap\(Storage\.CurrentContext, Helper\.Concat\(WhitelistPrefix, GetStorageKey\(accountId\)\)\);\s*/g, '');
    content = content.replace(/StorageMap whitelistEnabledMap = new StorageMap\(Storage\.CurrentContext, WhitelistEnabledPrefix\);\s*/g, '');
    content = content.replace(/StorageMap blacklistMap = new StorageMap\(Storage\.CurrentContext, Helper\.Concat\(BlacklistPrefix, GetStorageKey\(accountId\)\)\);\s*/g, '');
    
    fs.writeFileSync(file, content);
}
