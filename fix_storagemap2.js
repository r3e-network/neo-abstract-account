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

    // Replace StorageMap instances where they are only used once to Get or Put a value.
    // Example: StorageMap map = new StorageMap(Storage.CurrentContext, prefix); map.Get(key);
    // Can be: Storage.Get(Storage.CurrentContext, ConcatBytes(prefix, key));
    
    // AbstractAccount.Oracle.cs
    content = content.replace(/StorageMap pendingMap = new StorageMap\(Storage\.CurrentContext, DomeOraclePendingRequestPrefix\);\s*ExecutionEngine\.Assert\(pendingMap\.Get\(key\) == null, "Dome pending"\);/g, 'ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, ConcatBytes(DomeOraclePendingRequestPrefix, key)) == null, "Dome pending");');
    
    // AbstractAccount.StorageAndContext.cs
    content = content.replace(/StorageMap adminsMap = new StorageMap\(Storage\.CurrentContext, AdminsPrefix\);\s*return adminsMap\.Get\(storageKey\) != null;/g, 'return Storage.Get(Storage.CurrentContext, ConcatBytes(AdminsPrefix, storageKey)) != null;');
    content = content.replace(/StorageMap adminsMap = new StorageMap\(Storage\.CurrentContext, AdminsPrefix\);\s*ExecutionEngine\.Assert\(adminsMap\.Get\(GetStorageKey\(accountId\)\) != null, "No account"\);/g, 'ExecutionEngine.Assert(Storage.Get(Storage.CurrentContext, ConcatBytes(AdminsPrefix, GetStorageKey(accountId))) != null, "No account");');
    content = content.replace(/StorageMap map = new StorageMap\(Storage\.CurrentContext, AccountAddressToIdPrefix\);\s*ByteString\? accountId = map\.Get\(accountAddress\);/g, 'ByteString? accountId = Storage.Get(Storage.CurrentContext, ConcatBytes(AccountAddressToIdPrefix, accountAddress));');
    content = content.replace(/StorageMap adminsMap = new StorageMap\(Storage\.CurrentContext, AdminsPrefix\);\s*ByteString\? existing = adminsMap\.Get\(GetStorageKey\(accountId\)\);/g, 'ByteString? existing = Storage.Get(Storage.CurrentContext, ConcatBytes(AdminsPrefix, GetStorageKey(accountId)));');
    
    // AbstractAccount.ExecutionAndPermissions.cs
    content = content.replace(/StorageMap blacklistMap = new StorageMap\(Storage\.CurrentContext, Helper\.Concat\(BlacklistPrefix, GetStorageKey\(accountId\)\)\);\s*ByteString\? isBlacklisted = blacklistMap\.Get\(targetContract\);/g, 'ByteString? isBlacklisted = Storage.Get(Storage.CurrentContext, ConcatBytes(BlacklistPrefix, GetStorageKey(accountId), targetContract));');
    content = content.replace(/StorageMap whitelistMap = new StorageMap\(Storage\.CurrentContext, Helper\.Concat\(WhitelistPrefix, GetStorageKey\(accountId\)\)\);\s*StorageMap whitelistEnabledMap = new StorageMap\(Storage\.CurrentContext, WhitelistEnabledPrefix\);\s*ByteString\? whitelistOnly = whitelistEnabledMap\.Get\(GetStorageKey\(accountId\)\);/g, 'ByteString? whitelistOnly = Storage.Get(Storage.CurrentContext, ConcatBytes(WhitelistEnabledPrefix, GetStorageKey(accountId)));');
    content = content.replace(/ByteString\? isWhitelisted = whitelistMap\.Get\(targetContract\);/g, 'ByteString? isWhitelisted = Storage.Get(Storage.CurrentContext, ConcatBytes(WhitelistPrefix, GetStorageKey(accountId), targetContract));');

    // AbstractAccount.Admin.cs
    content = content.replace(/StorageMap map = new StorageMap\(Storage\.CurrentContext, Helper\.Concat\(BlacklistPrefix, GetStorageKey\(accountId\)\)\);\s*if \(isBlacklisted\) map\.Put\(target, \(ByteString\)new byte\[\] \{ 1 \}\);\s*else map\.Delete\(target\);/g, 'byte[] key = ConcatBytes(BlacklistPrefix, GetStorageKey(accountId), target);\n            if (isBlacklisted) Storage.Put(Storage.CurrentContext, key, (ByteString)new byte[] { 1 });\n            else Storage.Delete(Storage.CurrentContext, key);');
    content = content.replace(/StorageMap map = new StorageMap\(Storage\.CurrentContext, WhitelistEnabledPrefix\);\s*if \(enabled\) map\.Put\(GetStorageKey\(accountId\), \(ByteString\)new byte\[\] \{ 1 \}\);\s*else map\.Delete\(GetStorageKey\(accountId\)\);/g, 'byte[] key = ConcatBytes(WhitelistEnabledPrefix, GetStorageKey(accountId));\n            if (enabled) Storage.Put(Storage.CurrentContext, key, (ByteString)new byte[] { 1 });\n            else Storage.Delete(Storage.CurrentContext, key);');
    content = content.replace(/StorageMap map = new StorageMap\(Storage\.CurrentContext, Helper\.Concat\(WhitelistPrefix, GetStorageKey\(accountId\)\)\);\s*if \(isWhitelisted\) map\.Put\(target, \(ByteString\)new byte\[\] \{ 1 \}\);\s*else map\.Delete\(target\);/g, 'byte[] key = ConcatBytes(WhitelistPrefix, GetStorageKey(accountId), target);\n            if (isWhitelisted) Storage.Put(Storage.CurrentContext, key, (ByteString)new byte[] { 1 });\n            else Storage.Delete(Storage.CurrentContext, key);');

    fs.writeFileSync(file, content);
}
