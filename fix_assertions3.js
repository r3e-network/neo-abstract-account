const fs = require('fs');

const files = [
    'contracts/AbstractAccount.Oracle.cs',
    'contracts/AbstractAccount.StorageAndContext.cs',
    'contracts/AbstractAccount.Admin.cs',
    'contracts/AbstractAccount.ExecutionAndPermissions.cs',
    'contracts/AbstractAccount.MetaTx.cs'
];

const replacements = {
    '"Invalid nonce"': '"Bad nonce"',
    '"Invalid Nonce"': '"Bad nonce"',
    '"Invalid deadline"': '"Bad deadline"',
    '"Invalid uint256"': '"Bad uint256"',
    '"Invalid role account"': '"Bad account"',
    '"Duplicate role member"': '"Duplicate"',
    '"Mismatched pubkeys and signatures"': '"Mismatched arrays"',
    '"At least one signature required"': '"No signers"',
    '"Args hash mismatch"': '"Hash mismatch"',
    '"Admins are mandatory"': '"No admins"',
    '"Account address already bound"': '"Already bound"',
    '"Account already bound to different address"': '"Already bound"'
};

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    for (const [oldStr, newStr] of Object.entries(replacements)) {
        const regex = new RegExp(oldStr.replace(/"/g, '\\"'), 'g');
        content = content.replace(regex, newStr);
    }
    
    fs.writeFileSync(file, content);
}
