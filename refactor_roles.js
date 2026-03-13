const fs = require('fs');
const path = require('path');

const dir = 'contracts';

function replaceInFile(file, replacements) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const {from, to} of replacements) {
        content = content.replace(from, to);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
}

// 1. AbstractAccount.cs
replaceInFile('AbstractAccount.cs', [
    { from: /private static readonly byte\[\] AdminsPrefix = new byte\[\] \{ 0x01 \};\n\s*private static readonly byte\[\] AdminThresholdPrefix = new byte\[\] \{ 0x02 \};\n\s*private static readonly byte\[\] ManagersPrefix = new byte\[\] \{ 0x03 \};\n\s*private static readonly byte\[\] ManagerThresholdPrefix = new byte\[\] \{ 0x04 \};/g, 
      to: 'private static readonly byte[] SignersPrefix = new byte[] { 0x01 };\n        private static readonly byte[] ThresholdPrefix = new byte[] { 0x02 };' },
    { from: /private static readonly byte\[\] AdminIndexPrefix = new byte\[\] \{ 0x20 \};\n\s*private static readonly byte\[\] ManagerIndexPrefix = new byte\[\] \{ 0x21 \};/g,
      to: 'private static readonly byte[] SignersIndexPrefix = new byte[] { 0x20 };' },
    { from: /"setAdminsByAddress",\n\s*"setAdmins",\n\s*"setManagersByAddress",\n\s*"setManagers",/g,
      to: '"setSignersByAddress",\n        "setSigners",' },
    { from: /"verifyAdmin",\n\s*"verifyAdminMetaTx",/g,
      to: '"verifySigner",\n        "verifySignerMetaTx",' }
]);

