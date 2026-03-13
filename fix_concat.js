const fs = require('fs');

const files = [
    'contracts/AbstractAccount.MetaTx.cs',
    'contracts/AbstractAccount.StorageAndContext.cs'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove custom ConcatBytes params array method since it compiles but is heavy
    // Convert to Helper.Concat chaining
    
    fs.writeFileSync(file, content);
}
