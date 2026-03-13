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

    // AbstractAccount.Oracle.cs
    content = content.replace(/Storage\.Get\(Storage\.CurrentContext, ConcatBytes\(DomeOraclePendingRequestPrefix, key\)\)/g, 'Storage.Get(Storage.CurrentContext, Helper.Concat(DomeOraclePendingRequestPrefix, key))');
    
    // AbstractAccount.StorageAndContext.cs
    content = content.replace(/Storage\.Get\(Storage\.CurrentContext, ConcatBytes\(AdminsPrefix, storageKey\)\)/g, 'Storage.Get(Storage.CurrentContext, Helper.Concat(AdminsPrefix, storageKey))');
    content = content.replace(/Storage\.Get\(Storage\.CurrentContext, ConcatBytes\(AdminsPrefix, GetStorageKey\(accountId\)\)\)/g, 'Storage.Get(Storage.CurrentContext, Helper.Concat(AdminsPrefix, GetStorageKey(accountId)))');
    content = content.replace(/Storage\.Get\(Storage\.CurrentContext, ConcatBytes\(AccountAddressToIdPrefix, accountAddress\)\)/g, 'Storage.Get(Storage.CurrentContext, Helper.Concat(AccountAddressToIdPrefix, accountAddress))');
    
    // AbstractAccount.ExecutionAndPermissions.cs
    content = content.replace(/Storage\.Get\(Storage\.CurrentContext, ConcatBytes\(BlacklistPrefix, GetStorageKey\(accountId\), targetContract\)\)/g, 'Storage.Get(Storage.CurrentContext, Helper.Concat(Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)), targetContract))');
    content = content.replace(/Storage\.Get\(Storage\.CurrentContext, ConcatBytes\(WhitelistEnabledPrefix, GetStorageKey\(accountId\)\)\)/g, 'Storage.Get(Storage.CurrentContext, Helper.Concat(WhitelistEnabledPrefix, GetStorageKey(accountId)))');
    content = content.replace(/Storage\.Get\(Storage\.CurrentContext, ConcatBytes\(WhitelistPrefix, GetStorageKey\(accountId\), targetContract\)\)/g, 'Storage.Get(Storage.CurrentContext, Helper.Concat(Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)), targetContract))');

    // AbstractAccount.Admin.cs
    content = content.replace(/ConcatBytes\(BlacklistPrefix, GetStorageKey\(accountId\), target\)/g, 'Helper.Concat(Helper.Concat(BlacklistPrefix, GetStorageKey(accountId)), target)');
    content = content.replace(/ConcatBytes\(WhitelistEnabledPrefix, GetStorageKey\(accountId\)\)/g, 'Helper.Concat(WhitelistEnabledPrefix, GetStorageKey(accountId))');
    content = content.replace(/ConcatBytes\(WhitelistPrefix, GetStorageKey\(accountId\), target\)/g, 'Helper.Concat(Helper.Concat(WhitelistPrefix, GetStorageKey(accountId)), target)');

    fs.writeFileSync(file, content);
}
