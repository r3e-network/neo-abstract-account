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

    // Refactor repeated `GetStorageKey(accountId)` into a cached local variable `ByteString key = GetStorageKey(accountId);`
    // within methods where it is called multiple times.
    
    // AbstractAccount.Admin.cs
    content = content.replace(/adminsMap\.Put\(GetStorageKey\(accountId\), StdLib\.Serialize\(validatedAdmins\)\);\n\s*tMap\.Put\(GetStorageKey\(accountId\), threshold\);/g, 
        'ByteString key = GetStorageKey(accountId);\n            adminsMap.Put(key, StdLib.Serialize(validatedAdmins));\n            tMap.Put(key, threshold);');
    content = content.replace(/mMap\.Put\(GetStorageKey\(accountId\), StdLib\.Serialize\(validatedManagers\)\);\n\s*tMap\.Put\(GetStorageKey\(accountId\), threshold\);/g, 
        'ByteString key = GetStorageKey(accountId);\n            mMap.Put(key, StdLib.Serialize(validatedManagers));\n            tMap.Put(key, threshold);');
    content = content.replace(/dMap\.Put\(GetStorageKey\(accountId\), StdLib\.Serialize\(domes\)\);\n\s*tMap\.Put\(GetStorageKey\(accountId\), threshold\);\n\s*toMap\.Put\(GetStorageKey\(accountId\), timeoutPeriod\);/g, 
        'ByteString key = GetStorageKey(accountId);\n            dMap.Put(key, StdLib.Serialize(domes));\n            tMap.Put(key, threshold);\n            toMap.Put(key, timeoutPeriod);');

    fs.writeFileSync(file, content);
}
