const fs = require('fs');

const files = [
    'contracts/AbstractAccount.Oracle.cs',
    'contracts/AbstractAccount.StorageAndContext.cs',
    'contracts/AbstractAccount.Admin.cs',
    'contracts/AbstractAccount.ExecutionAndPermissions.cs',
    'contracts/AbstractAccount.MetaTx.cs'
];

const replacements = {
    '"Dome account not configured"': '"Dome not setup"',
    '"Dome account not active yet"': '"Dome not active"',
    '"Dome account already unlocked"': '"Dome unlocked"',
    '"Dome account not unlocked by oracle"': '"Dome locked"',
    '"Dome activation already pending"': '"Dome pending"',
    '"Target is blacklisted"': '"Blacklisted"',
    '"Target is not in whitelist"': '"Not whitelisted"',
    '"Asset-moving target is not in whitelist"': '"Not whitelisted"',
    '"Amount exceeds max limit"': '"Limit exceeded"',
    '"Invalid transfer amount"': '"Bad amount"',
    '"Invalid approve amount"': '"Bad amount"',
    '"Invalid method"': '"Bad method"',
    '"Method name too long"': '"Bad method"',
    '"Invalid method name"': '"Bad method"',
    '"Method not allowed by policy"': '"Bad method"',
    '"Invalid pubkey length"': '"Bad pubkey"',
    '"Invalid pubkey length for compression"': '"Bad pubkey"',
    '"Invalid threshold"': '"Bad threshold"',
    '"Invalid timeout"': '"Bad timeout"',
    '"Invalid args"': '"Bad args"',
    '"Missing verified signers"': '"No signers"',
    '"Invalid signature length"': '"Bad signature"',
    '"Invalid EIP-712 signature"': '"Bad signature"',
    '"Signature expired"': '"Expired"',
    '"Invalid address length"': '"Bad address"',
    '"Invalid args hash length"': '"Bad args"'
};

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    for (const [oldStr, newStr] of Object.entries(replacements)) {
        const regex = new RegExp(oldStr.replace(/"/g, '\\"'), 'g');
        content = content.replace(regex, newStr);
    }
    
    fs.writeFileSync(file, content);
}
