const fs = require('fs');

const files = [
    'contracts/AbstractAccount.Oracle.cs',
    'contracts/AbstractAccount.StorageAndContext.cs',
    'contracts/AbstractAccount.Admin.cs',
    'contracts/AbstractAccount.ExecutionAndPermissions.cs',
    'contracts/AbstractAccount.MetaTx.cs',
    'contracts/AbstractAccount.AccountLifecycle.cs',
    'contracts/AbstractAccount.Upgrade.cs'
];

// Helper to consolidate common assert texts to reduce binary string table size
const replacements = {
    '"Account does not exist"': '"No account"',
    '"Account address not registered"': '"No account"',
    '"Invalid accountId"': '"Bad accountId"',
    '"Invalid accountAddress"': '"Bad address"',
    '"Missing meta-tx signers"': '"No signers"',
    '"Missing meta-tx signer material"': '"No signers"',
    '"Missing signer hashes"': '"No signers"',
    '"Unauthorized admin"': '"Unauthorized"',
    '"Unauthorized account initialization"': '"Unauthorized"',
    '"Unauthorized manager initialization"': '"Unauthorized"',
    '"Unauthorized by custom verifier"': '"Unauthorized"'
};

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    for (const [oldStr, newStr] of Object.entries(replacements)) {
        // Use regex to catch Exact matches of the string
        const regex = new RegExp(oldStr.replace(/"/g, '\\"'), 'g');
        content = content.replace(regex, newStr);
    }
    
    fs.writeFileSync(file, content);
}
