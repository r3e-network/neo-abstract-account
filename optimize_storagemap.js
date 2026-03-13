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

    // Convert single-use StorageMap reads to direct Storage.Get calls
    content = content.replace(/StorageMap ([\w]+) = new StorageMap\(Storage\.CurrentContext, ([\w]+)\);\s*ByteString\?? ([\w]+) = \1\.Get\(([^;]+)\);/g, 'ByteString? $3 = Storage.Get(Storage.CurrentContext, Helper.Concat($2, $4));');
    content = content.replace(/StorageMap ([\w]+) = new StorageMap\(Storage\.CurrentContext, Helper\.Concat\(([^,]+), ([^)]+)\)\);\s*ByteString\?? ([\w]+) = \1\.Get\(([^;]+)\);/g, 'ByteString? $4 = Storage.Get(Storage.CurrentContext, Helper.Concat(Helper.Concat($2, $3), $5));');
    content = content.replace(/StorageMap ([\w]+) = new StorageMap\(Storage\.CurrentContext, ([\w]+)\);\s*return \1\.Get\(([^;]+)\) != null;/g, 'return Storage.Get(Storage.CurrentContext, Helper.Concat($2, $3)) != null;');
    content = content.replace(/StorageMap ([\w]+) = new StorageMap\(Storage\.CurrentContext, ([\w]+)\);\s*return \1\.Get\(([^;]+)\)!;/g, 'return Storage.Get(Storage.CurrentContext, Helper.Concat($2, $3))!;');

    // Deletes
    content = content.replace(/StorageMap ([\w]+) = new StorageMap\(Storage\.CurrentContext, ([\w]+)\);\s*\1\.Delete\(([^;]+)\);/g, 'Storage.Delete(Storage.CurrentContext, Helper.Concat($2, $3));');
    
    // Puts (where map is only used for the Put)
    // Note: Have to be careful not to break where the map is used for both Get and Put, or Put and Delete, but those are generally multi-line or block scoped. We'll target specific known ones.
    
    fs.writeFileSync(file, content);
}
